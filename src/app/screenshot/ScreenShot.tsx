import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";

type WindowInfo = {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hwnd: string;
};

function ScreenShot() {
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const [mouseDown, setMouseDown] = createSignal({
    down: false,
    start: { x: 0, y: 0 },
    selected: false,
  });
  const [cropMove, setCropMove] = createSignal({
    down: false,
    startX: 0,
    startY: 0,
  });
  let border_width = 2;
  const [cropRect, setCropRect] = createSignal({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [windowsInfo, setWindowsInfo] = createSignal<WindowInfo[]>([]);
  const [screenshotUrl, setScreenshotUrl] = createSignal("");
  const win = getCurrentWindow();
  const hide = () => {
    win.hide();
    setScreenshotUrl("");
    setImageLoaded(false);
    setCropRect({ x: 0, y: 0, width: 0, height: 0 });
    setMouseDown({ down: false, selected: false, start: { x: 0, y: 0 } });
    setCropMove({ down: false, startX: 0, startY: 0 });
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
    if (!mouseDown().selected) {
      if (mouseDown().down) {
        setCropRect({
          x: Math.floor(Math.min(mouseDown().start.x, clientX)),
          y: Math.floor(Math.min(mouseDown().start.y, clientY)),
          width: Math.floor(Math.abs(clientX - mouseDown().start.x)),
          height: Math.floor(Math.abs(clientY - mouseDown().start.y)),
        });
      } else {
        handleSelectWindow(clientX, clientY);
      }
    }
  };

  onMount(() => {
    let unMount = false;
    let unlisten: () => void | undefined;
    win
      .listen("show-window", (event) => {
        const info = event.payload as WindowInfo[];
        setScreenshotUrl(
          "http://localhost:8088/sys/screenshot/get?timestamp=" + Date.now()
        );
        console.log(info);
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
            setMouseDown({
              down: true,
              start: { x: event.clientX, y: event.clientY },
              selected: false,
            });
          }}
          onMouseUp={() => {
            setMouseDown({ ...mouseDown(), down: false, selected: true });
          }}
          onMouseMove={(event) => {
            handleCropSelection(event.clientX, event.clientY);
          }}
        >
          <div
            style={{
              left: `${cropRect().x}px`,
              top: `${cropRect().y}px`,
              cursor: mouseDown().selected ? "move" : "default",
            }}
            class="fixed"
            onMouseDown={(event) => {
              if (mouseDown().selected) {
                event.stopPropagation();
                setCropMove({
                  down: true,
                  startX: event.clientX - cropRect().x,
                  startY: event.clientY - cropRect().y,
                });
              }
            }}
            onMouseMove={(event) => {
              if (mouseDown().selected && cropMove().down) {
                event.stopPropagation();
                const rect = cropRect();
                // 限制裁剪区域不能超出屏幕
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                setCropRect({
                  ...rect,
                  x: Math.min(
                    Math.max(0, event.clientX - cropMove().startX),
                    maxX
                  ),
                  y: Math.min(
                    Math.max(0, event.clientY - cropMove().startY),
                    maxY
                  ),
                });
              }
            }}
            onMouseUp={(event) => {
              if (mouseDown().selected && cropMove().down) {
                event.stopPropagation();
                setCropMove({ down: false, startX: 0, startY: 0 });
              }
            }}
          >
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
          </div>
        </div>
      </Show>
    </main>
  );
}

export default ScreenShot;
