import { invoke } from "@tauri-apps/api/core";

export async function screen_capture() {
  await fetch("http://localhost:8088/sys/screenshot/capture", {
    method: "GET",
  });
  await invoke("capture_screen");
}
