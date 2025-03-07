import { fetchApps, runApp } from "../../api";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

import "./quick-start.css";
import { filterMatchs } from "./match";
import QsMatchText from "./QsMatchText";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function QuickStart() {
	const [searchText, setSearchText] = useState("");
	const { data: apps, refetch } = useQuery({
		queryKey: ["quick-search-apps"],
		queryFn: fetchApps,
	});

	const container = useRef<HTMLDivElement>(null);

	const searchApps = useMemo(() => {
		const data = apps?.data || [];
		const text = searchText.toLowerCase();
		return filterMatchs(data, text).sort(
			(a, b) => a.matchIndex[0].start - b.matchIndex[0].start,
		);
	}, [apps, searchText]);

	useEffect(() => {
		let unMount = false;
		const currentWindow = getCurrentWindow();

		let unlisten: () => void;
		let observer: ResizeObserver | undefined;
		if (container.current) {
			observer = new ResizeObserver((entries) => {
				entries.forEach((entry) => {
					const { width, height } = entry.contentRect;
					currentWindow.setSize(new LogicalSize(width, height));
				});
			});

			observer.observe(container.current);
		}
		const handleKeyUp = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				currentWindow.hide();
			}
		};
		window.addEventListener("keyup", handleKeyUp);
		currentWindow
			.onFocusChanged((event) => {
				if (!event.payload) {
					currentWindow.hide();
				}
			})
			.then((_unlisten) => {
				if (!unMount) {
					unlisten = _unlisten;
				} else {
					_unlisten();
				}
			});
		register("Alt+X", async (event) => {
			if (event.state === "Pressed") {
				if (await currentWindow.isVisible()) {
					currentWindow.hide();
				} else {
					currentWindow.show();
					refetch();
					setSearchText("");
					currentWindow.setAlwaysOnTop(true);
					currentWindow.setFocus();
				}
			}
		});
		return () => {
			unMount = true;
			unlisten?.();
			unregister("Alt+X");
			window.removeEventListener("keyup", handleKeyUp);
			observer?.disconnect();
		};
	}, [refetch]);

	return (
		<div
			className="w-screen bg-slate-100 dark:bg-[#2f2f2f] overflow-hidden"
			ref={container}
		>
			<div className="h-[60px]">
				<input
					type="text"
					className="w-full h-full outline-none bg-transparent px-3 text-2xl font-light"
					placeholder="Hi, Sider"
					value={searchText}
					autoFocus
					onInput={(e) => setSearchText(e.currentTarget.value)}
				/>
			</div>
			{searchApps.length > 0 && (
				<div className="px-3">
					<h4>最佳搜索结果</h4>
					<div className="flex flex-wrap my-2">
						{searchApps.map(({ item, matchIndex }) => (
							<div
								key={item.id}
								onClick={() => {
									runApp(item.id);
									setSearchText("");
								}}
								className="w-[80px] h-[88px] rounded-md hover:bg-[rgb(87,87,87)] flex flex-col items-center py-2 px-1 cursor-pointer"
							>
								<img
									className="object-contain w-8 h-8"
									src={`http://localhost:8088/sys/quick_search/app_icon/${item.id}`}
									alt=""
								/>
								<div className="text-xs pt-2 break-all text-center text-ellipsis line-clamp-2">
									<QsMatchText name={item.name} matchIndex={matchIndex} />
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default QuickStart;
