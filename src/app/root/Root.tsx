import { webviewWindow } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";

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
            screenshot_window?.emit("show-window", info);
            screenshot_window?.show();
          }
          //   screenshot_window?.setAlwaysOnTop(true);
        }}
      >
        截屏
      </button>
    </div>
  );
}

export default Root;
