import { webviewWindow } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { MonitorInfo } from "../types";

function Root() {
  return (
    <div class="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-[#2f2f2f]">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={async () => {
          const screenshot_window =
            await webviewWindow.WebviewWindow.getByLabel("screenshot");
          if (screenshot_window) {
            await fetch("http://localhost:8088/sys/screenshot/capture", {
              method: "GET",
            });
            const info = await invoke("get_foreground_window_info");
            const monitor_info: MonitorInfo[] = await invoke("get_display_info");
            console.log(monitor_info);
            const min_x = Math.min(...monitor_info.map((i) => i.x));
            const min_y = Math.min(...monitor_info.map((i) => i.y));
            const max_width = Math.max(...monitor_info.map((i) => i.width));
            const max_height = Math.max(...monitor_info.map((i) => i.height));
            const width = max_width - min_x;
            const height = max_height - min_y;
            console.log(min_x, min_y, width, height);
            console.log(monitor_info.map((v) => ({
              ...v,
              x: v.x - min_x,
              y: v.y - min_y
            })));
            await invoke("mutiple_monitor_fullscreen", {windowLabel: "screenshot", x: min_x, y: min_y, width, height});
            await screenshot_window?.emit("show-window", {window_info: info, monitor_info: monitor_info.map((v) => ({
              ...v,
              x: v.x - min_x,
              y: v.y - min_y
            }))});
          }
        }}
      >
        截屏
      </button>
    </div>
  );
}

export default Root;
