import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import ScreenShotToolbar from "./components/ScreenShotToolbar";
import "./screenshot.css";

type WindowInfo = {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hwnd: string;
};

enum DragDirection {
  NW, // 左上
  NE, // 右上
  SW, // 左下
  SE, // 右下
  N, // 上
  S, // 下
  W, // 左
  E,
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
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const [down, setDown] = createSignal(DOWN);
  const [cropMoveing, setCropMoveing] = createSignal(false);
  let border_width = 2;
  const [cropRect, setCropRect] = createSignal({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const cropBottom = createMemo(
    () => window.innerHeight - (cropRect().y + cropRect().height)
  );
  const [windowsInfo, setWindowsInfo] = createSignal<WindowInfo[]>([]);
  const [screenshotUrl, setScreenshotUrl] = createSignal("");
  const win = getCurrentWindow();
  const hide = () => {
    win.hide();
    setScreenshotUrl("");
    setImageLoaded(false);
    setCropRect({ x: 0, y: 0, width: 0, height: 0 });
    setDown(DOWN);
  };

  const handleSelectWindow = (clientX: number, clientY: number) => {
    for (const winfo of windowsInfo()) {
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
  };
  const handleCropSelection = (clientX: number, clientY: number) => {
    const _down = down();
    setCropRect({
      x: Math.floor(Math.min(_down.start.x, clientX)),
      y: Math.floor(Math.min(_down.start.y, clientY)),
      width: Math.floor(Math.abs(clientX - _down.start.x)),
      height: Math.floor(Math.abs(clientY - _down.start.y)),
    });
  };
  const handleCropMove = (clientX: number, clientY: number) => {
    const rect = cropRect();
    // 限制裁剪区域不能超出屏幕
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    setCropRect({
      ...rect,
      x: Math.min(Math.max(0, clientX - down().start.x), maxX),
      y: Math.min(Math.max(0, clientY - down().start.y), maxY),
    });
  };

  const handleDragResizeMouseDown =
    (direction: DragDirection) => (event: MouseEvent) => {
      event.stopPropagation();
      let start = { x: 0, y: 0 };
      switch (direction) {
        case DragDirection.NW:
          start = {
            x: cropRect().x + cropRect().width,
            y: cropRect().y + cropRect().height,
          };
          break;
        case DragDirection.NE:
        case DragDirection.N:
          start = {
            x: cropRect().x,
            y: cropRect().y + cropRect().height,
          };
          break;
        case DragDirection.SW:
        case DragDirection.W:
          start = {
            x: cropRect().x + cropRect().width,
            y: cropRect().y,
          };
          break;
        case DragDirection.SE:
        case DragDirection.S:
        case DragDirection.E:
          start = {
            x: cropRect().x,
            y: cropRect().y,
          };
          break;
      }
      setDown({
        ...down(),
        dragDirection: direction,
        drag: true,
        start,
      });
    };

  const handleMouseMove = (event: MouseEvent) => {
    const _down = down();
    if (_down.selection) {
      handleCropSelection(event.clientX, event.clientY);
      setCropMoveing(true);
    } else if (_down.move) {
      handleCropMove(event.clientX, event.clientY);
      setCropMoveing(true);
    } else if (_down.drag) {
      switch (_down.dragDirection) {
        case DragDirection.NW:
        case DragDirection.NE:
        case DragDirection.SW:
        case DragDirection.SE:
          handleCropSelection(event.clientX, event.clientY);
          break;
        case DragDirection.N:
        case DragDirection.S:
          handleCropSelection(_down.start.x + cropRect().width, event.clientY);
          break;
        case DragDirection.W:
        case DragDirection.E:
          handleCropSelection(event.clientX, _down.start.y + cropRect().height);
          break;
      }
      setCropMoveing(true);
    } else if (!_down.selected) {
      handleSelectWindow(event.clientX, event.clientY);
    }
  };

  window.addEventListener("mousemove", handleMouseMove);

  onCleanup(() => {
    window.removeEventListener("mousemove", handleMouseMove);
  });

  onMount(() => {
    let unMount = false;
    let unlisten: () => void | undefined;
    win
      .listen("show-window", (event) => {
        const info = event.payload as WindowInfo[];
        setScreenshotUrl(
          "http://localhost:8088/sys/screenshot/get?timestamp=" + Date.now()
        );
        setWindowsInfo(
          info.map((item) => ({
            ...item,
            x: Math.floor(item.x / window.devicePixelRatio),
            y: Math.floor(item.y / window.devicePixelRatio),
            width: Math.round(item.width / window.devicePixelRatio),
            height: Math.round(item.height / window.devicePixelRatio),
          }))
        );
        cursorPosition().then((position) => {
          handleSelectWindow(
            position.x / window.devicePixelRatio,
            position.y / window.devicePixelRatio
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
    onCleanup(() => {
      unMount = true;
      unlisten?.();
      window.removeEventListener("keyup", handleKeyUp);
    });
  });
  return (
    <main class="h-screen w-screen select-none">
      <Show when={screenshotUrl() !== ""}>
        <img
          src={screenshotUrl()}
          alt=""
          style={{
            width: window.innerWidth + "px",
            height: window.innerHeight + "px",
          }}
          class="absolute top-0 left-0 max-w-none select-none"
        />
      </Show>
      <Show when={screenshotUrl() !== ""}>
        <div
          class="fixed top-0 left-0 w-full h-full"
          classList={{
            "bg-black/50": imageLoaded(),
          }}
          onMouseDown={(event) => {
            setDown({
              ...down(),
              selection: true,
              start: { x: event.clientX, y: event.clientY },
            });
          }}
          onMouseUp={() => {
            setDown({ ...DOWN, selection: false, selected: true });
            setCropMoveing(false);
          }}
        >
          <div
            style={{
              left: `${cropRect().x}px`,
              top: `${cropRect().y}px`,
              cursor: down().selected ? "move" : "default",
            }}
            class="fixed"
            onMouseDown={(event) => {
              if (down().selected) {
                event.stopPropagation();
                setDown({
                  ...down(),
                  move: true,
                  start: {
                    x: event.clientX - cropRect().x,
                    y: event.clientY - cropRect().y,
                  },
                });
              }
            }}
            onMouseUp={(event) => {
              if (down().move || down().drag) {
                event.stopPropagation();
                setDown({
                  ...down(),
                  move: false,
                  drag: false,
                });
                setCropMoveing(false);
              }
            }}
          >
            {/* 裁剪大小 */}
            <div
              class="text-sm absolute left-2 bg-gray-800 rounded-md h-6 px-4 flex items-center whitespace-nowrap z-10"
              classList={{
                "-top-8": cropRect().y > 40,
                "top-2": cropRect().y <= 40,
              }}
            >
              {Math.ceil(window.devicePixelRatio * cropRect().width)} *{" "}
              {Math.ceil(window.devicePixelRatio * cropRect().height)}
            </div>
            {/* 工具栏 */}
            <Show when={!cropMoveing() && down().selected}>
              <div
                class="absolute z-10 fade-scale-in cursor-default"
                onMouseDown={(event) => event.stopPropagation()}
                onMouseUp={(event) => event.stopPropagation()}
                classList={{
                  "bottom-2 right-2": cropBottom() <= 100,
                  "-bottom-12 right-0": cropBottom() > 100,
                }}
              >
                <ScreenShotToolbar onClose={hide} onSave={() => {}} />
              </div>
            </Show>
            <div
              style={{
                width: `${cropRect().width}px`,
                height: `${cropRect().height}px`,
                "border-width": `${border_width}px`,
              }}
              class="border-blue-200 overflow-hidden relative"
            >
              <div
                class="absolute left-0 top-0"
                style={{
                  left: `-${cropRect().x + border_width}px`, //`translate(-${cropRect().x}px, -${cropRect().y}px)`,
                  top: `-${cropRect().y + border_width}px`,
                }}
              >
                <img
                  src={screenshotUrl()}
                  onLoad={() => {
                    setImageLoaded(true);
                  }}
                  alt=""
                  style={{
                    width: window.innerWidth + "px",
                    height: window.innerHeight + "px",
                    "image-rendering": "crisp-edges",
                  }}
                  draggable={false}
                  class="max-w-none select-none absolute top-0 left-0"
                />
              </div>
            </div>
            <Show when={down().selected}>
              {/* 左上角拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.NW)}
                class="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-nw-resize border border-blue-300"
              ></div>
              {/* 右上角拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.NE)}
                class="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-ne-resize border border-blue-300"
              ></div>
              {/* 左下角拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.SW)}
                class="absolute left-0 bottom-0 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-sw-resize border border-blue-300"
              ></div>
              {/* 右下角拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.SE)}
                class="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-se-resize border border-blue-300"
              ></div>
              {/* 上拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.N)}
                class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-n-resize border border-blue-300"
              ></div>
              {/* 下拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.S)}
                class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-s-resize border border-blue-300"
              ></div>
              {/* 左拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.W)}
                class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-w-resize border border-blue-300"
              ></div>
              {/* 右拖动点 */}
              <div
                onMouseDown={handleDragResizeMouseDown(DragDirection.E)}
                class="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10 cursor-e-resize border border-blue-300"
              ></div>
            </Show>
          </div>
        </div>
      </Show>
    </main>
  );
}

export default ScreenShot;
