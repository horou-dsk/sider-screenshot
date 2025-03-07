import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import ScreenShotToolbar from "./components/ScreenShotToolbar";
import "./screenshot.css";
import { invoke } from "@tauri-apps/api/core";
import type { ShotShowWindowPayload, WindowInfo } from "../types";
import { getDpiPx } from "../../utils";
import type { CanvasRenderImage, ScreenShotImage } from "./types";
import ScreenShotCanvas, { type ScreenShotCanvasRef } from "./ScreenShotCanvas";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { screen_capture } from "./capture";
import { BASE_API } from "../../utils/request";
import {
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import classNames from "classnames";

enum DragDirection {
	NW = 0, // 左上
	NE = 1, // 右上
	SW = 2, // 左下
	SE = 3, // 右下
	N = 4, // 上
	S = 5, // 下
	W = 6, // 左
	E = 7,
}

const DOWN = {
	selection: false,
	move: false,
	start: { x: 0, y: 0 },
	selected: false,
	dragDirection: DragDirection.NW,
	drag: false,
};

function ScreenShot() {
	const [imageLoadedIndex, setImageLoadedIndex] = useState(0);
	const [down, setDown] = useState(DOWN);
	const cropMoveing = useMemo(
		() => down.selection || down.move || down.drag,
		[down],
	);
	const border_width = 2;
	const [cropRect, setCropRect] = useState({
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});
	const cropBottom = useMemo(
		() => window.innerHeight - (cropRect.y + cropRect.height),
		[cropRect],
	);
	const [windowsInfo, setWindowsInfo] = useState<WindowInfo[]>([]);
	const [screenShots, setScreenShots] = useState<ScreenShotImage[]>([]);
	const [renderImages, setRenderImages] = useState<CanvasRenderImage[]>([]);
	const screenShotCanvas = useRef<ScreenShotCanvasRef>(null);
	const imageLoaded = useMemo(
		() => imageLoadedIndex === screenShots.length,
		[imageLoadedIndex, screenShots],
	);

	const handleSelectWindow = useCallback(
		(clientX: number, clientY: number) => {
			for (const winfo of windowsInfo) {
				if (
					clientX >= winfo.x &&
					clientX <= winfo.x + winfo.width &&
					clientY >= winfo.y &&
					clientY <= winfo.y + winfo.height
				) {
					setCropRect({
						x: winfo.x,
						y: winfo.y,
						width: winfo.width,
						height: winfo.height,
					});
					break;
				}
			}
		},
		[windowsInfo],
	);
	const handleCropSelection = useCallback(
		(clientX: number, clientY: number) => {
			setCropRect({
				x: Math.floor(Math.min(down.start.x, clientX)),
				y: Math.floor(Math.min(down.start.y, clientY)),
				width: Math.floor(Math.abs(clientX - down.start.x)),
				height: Math.floor(Math.abs(clientY - down.start.y)),
			});
		},
		[down.start],
	);
	const handleCropMove = useCallback(
		(clientX: number, clientY: number) => {
			const rect = cropRect;
			// 限制裁剪区域不能超出屏幕
			const maxX = window.innerWidth - rect.width;
			const maxY = window.innerHeight - rect.height;
			setCropRect({
				...rect,
				x: Math.min(Math.max(0, clientX - down.start.x), maxX),
				y: Math.min(Math.max(0, clientY - down.start.y), maxY),
			});
		},
		[down.start, cropRect],
	);

	const handleDragResizeMouseDown =
		(direction: DragDirection) => (event: ReactMouseEvent) => {
			event.stopPropagation();
			let start = { x: 0, y: 0 };
			switch (direction) {
				case DragDirection.NW:
					start = {
						x: cropRect.x + cropRect.width,
						y: cropRect.y + cropRect.height,
					};
					break;
				case DragDirection.NE:
				case DragDirection.N:
					start = {
						x: cropRect.x,
						y: cropRect.y + cropRect.height,
					};
					break;
				case DragDirection.SW:
				case DragDirection.W:
					start = {
						x: cropRect.x + cropRect.width,
						y: cropRect.y,
					};
					break;
				case DragDirection.SE:
				case DragDirection.S:
				case DragDirection.E:
					start = {
						x: cropRect.x,
						y: cropRect.y,
					};
					break;
			}
			setDown({
				...down,
				dragDirection: direction,
				drag: true,
				start,
			});
		};

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			if (down.selection) {
				handleCropSelection(event.clientX, event.clientY);
			} else if (down.move) {
				handleCropMove(event.clientX, event.clientY);
			} else if (down.drag) {
				switch (down.dragDirection) {
					case DragDirection.NW:
					case DragDirection.NE:
					case DragDirection.SW:
					case DragDirection.SE:
						handleCropSelection(event.clientX, event.clientY);
						break;
					case DragDirection.N:
					case DragDirection.S:
						handleCropSelection(down.start.x + cropRect.width, event.clientY);
						break;
					case DragDirection.W:
					case DragDirection.E:
						handleCropSelection(event.clientX, down.start.y + cropRect.height);
						break;
				}
			} else if (!down.selected) {
				handleSelectWindow(event.clientX, event.clientY);
			}
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [handleCropMove, handleCropSelection, handleSelectWindow, down, cropRect]);

	const hide = useCallback(() => {
		invoke("hide_window");
		setScreenShots([]);
		setImageLoadedIndex(0);
		setCropRect({ x: 0, y: 0, width: 0, height: 0 });
		setDown(DOWN);
	}, []);

	useEffect(() => {
		const win = getCurrentWindow();
		let unMount = false;
		let unlisten: () => void;

		win
			.listen("show-window", (event) => {
				const payload = event.payload as ShotShowWindowPayload;
				const info = payload.window_info;
				console.log(payload);
				setScreenShots(
					payload.monitor_info.map((v) => ({
						monitorInfo: v,
						screenshotUrl: `${BASE_API}/sys/screenshot/get.png/${v.id}?timestamp=${Date.now()}`,
					})),
				);
				setWindowsInfo(
					info.map((item) => ({
						...item,
						x: Math.floor(item.x / window.devicePixelRatio),
						y: Math.floor(item.y / window.devicePixelRatio),
						width: Math.round(item.width / window.devicePixelRatio),
						height: Math.round(item.height / window.devicePixelRatio),
					})),
				);
				cursorPosition().then((position) => {
					handleSelectWindow(
						(position.x - payload.min_x) / window.devicePixelRatio,
						(position.y - payload.min_y) / window.devicePixelRatio,
					);
				});
			})
			.then((_unlisten) => {
				if (!unMount) {
					unlisten = _unlisten;
				} else {
					_unlisten();
				}
			});
		const handleKeyUp = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				hide();
			}
		};
		window.addEventListener("keyup", handleKeyUp);
		register("CommandOrControl+Alt+D", (event) => {
			if (event.state === "Pressed") {
				screen_capture();
			}
		});
		return () => {
			unMount = true;
			unlisten?.();
			window.removeEventListener("keyup", handleKeyUp);
			unregister("CommandOrControl+Alt+D");
		};
	}, [handleSelectWindow, hide]);
	return (
		<main className="h-screen w-screen select-none">
			{screenShots.length > 0 &&
				screenShots.map(({ monitorInfo, screenshotUrl }) => (
					<img
						key={monitorInfo.id}
						src={screenshotUrl}
						alt=""
						crossOrigin="anonymous"
						style={{
							width: `${getDpiPx(monitorInfo.width)}px`,
							height: `${getDpiPx(monitorInfo.height)}px`,
							left: `${getDpiPx(monitorInfo.x)}px`,
							top: `${getDpiPx(monitorInfo.y)}px`,
						}}
						onLoad={(event) => {
							setImageLoadedIndex(imageLoadedIndex + 1);
							setRenderImages([
								...renderImages,
								{
									image: event.currentTarget,
									monitorInfo,
								},
							]);
						}}
						className="absolute max-w-none select-none"
					/>
				))}
			{screenShots.length > 0 && (
				<div
					className={classNames("fixed top-0 left-0 w-full h-full", {
						"bg-black/35": imageLoaded,
					})}
					onMouseDown={(event) => {
						setDown({
							...down,
							selection: true,
							start: { x: event.clientX, y: event.clientY },
						});
					}}
					onMouseUp={() => {
						setDown({ ...DOWN, selection: false, selected: true });
					}}
				>
					<div
						style={{
							left: `${cropRect.x}px`,
							top: `${cropRect.y}px`,
							cursor: down.selected ? "move" : "default",
						}}
						className="fixed"
						onMouseDown={(event) => {
							if (down.selected) {
								event.stopPropagation();
								setDown({
									...down,
									move: true,
									start: {
										x: event.clientX - cropRect.x,
										y: event.clientY - cropRect.y,
									},
								});
							}
						}}
						onMouseUp={(event) => {
							if (down.move || down.drag) {
								event.stopPropagation();
								setDown({
									...down,
									move: false,
									drag: false,
								});
							}
						}}
					>
						{/* 裁剪大小 */}
						<div
							className={classNames(
								"text-sm absolute left-2 bg-gray-800 rounded-md h-6 px-4 flex items-center whitespace-nowrap z-10",
								{
									"-top-8": cropRect.y > 40,
									"top-2": cropRect.y <= 40,
								},
							)}
						>
							{Math.ceil(window.devicePixelRatio * cropRect.width)} *{" "}
							{Math.ceil(window.devicePixelRatio * cropRect.height)}
						</div>
						{/* 工具栏 */}
						{!cropMoveing && down.selected && (
							<div
								className={classNames(
									"absolute z-10 fade-scale-in cursor-default",
									{
										"bottom-2 right-2": cropBottom <= 100,
										"-bottom-12 right-0": cropBottom > 100,
									},
								)}
								onMouseDown={(event) => event.stopPropagation()}
								onMouseUp={(event) => event.stopPropagation()}
							>
								<ScreenShotToolbar
									onClose={hide}
									onSave={() => {
										async function save() {
											const data = await screenShotCanvas.current?.capture();
											data?.bytes.arrayBuffer().then((bytes) => {
												invoke("send_capture", {
													image: new Uint8Array(bytes),
												}).catch((err) => {
													console.error(err);
												});
											});
											// await navigator.clipboard.write([
											//   new ClipboardItem({ "image/png": data.bytes }),
											// ]);
											console.log("保存成功");
										}
										hide();
										save();
									}}
								/>
							</div>
						)}
						{/* 裁剪区 */}
						<div
							style={{
								width: `${cropRect.width}px`,
								height: `${cropRect.height}px`,
								borderWidth: `${border_width}px`,
							}}
							className="border-blue-200 overflow-hidden relative"
						>
							<div
								className="absolute left-0 top-0"
								style={{
									left: `-${cropRect.x + border_width}px`, //`translate(-${cropRect().x}px, -${cropRect().y}px)`,
									top: `-${cropRect.y + border_width}px`,
								}}
							>
								{screenShots.map(({ screenshotUrl, monitorInfo }) => (
									<img
										key={monitorInfo.id}
										src={screenshotUrl}
										alt=""
										style={{
											width: `${getDpiPx(monitorInfo.width)}px`,
											height: `${getDpiPx(monitorInfo.height)}px`,
											left: `${getDpiPx(monitorInfo.x)}px`,
											top: `${getDpiPx(monitorInfo.y)}px`,
											imageRendering: "crisp-edges",
										}}
										draggable={false}
										className="max-w-none select-none absolute top-0 left-0"
									/>
								))}
							</div>
							{!cropMoveing && down.selected && (
								<ScreenShotCanvas
									ref={screenShotCanvas}
									rect={cropRect}
									screenShots={renderImages}
									borderWidth={border_width}
								/>
							)}
						</div>
						{down.selected && (
							<>
								{/* 左上角拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.NW)}
									className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-nw-resize border border-blue-300"
								/>
								{/* 右上角拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.NE)}
									className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-ne-resize border border-blue-300"
								/>
								{/* 左下角拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.SW)}
									className="absolute left-0 bottom-0 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-sw-resize border border-blue-300"
								/>
								{/* 右下角拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.SE)}
									className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-se-resize border border-blue-300"
								/>
								{/* 上拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.N)}
									className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-n-resize border border-blue-300"
								/>
								{/* 下拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.S)}
									className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-s-resize border border-blue-300"
								/>
								{/* 左拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.W)}
									className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-w-resize border border-blue-300"
								/>
								{/* 右拖动点 */}
								<div
									onMouseDown={handleDragResizeMouseDown(DragDirection.E)}
									className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-e-resize border border-blue-300"
								/>
							</>
						)}
					</div>
				</div>
			)}
		</main>
	);
}

export default ScreenShot;
