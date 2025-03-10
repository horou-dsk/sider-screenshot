import { invoke } from "@tauri-apps/api/core";
import { request_capture_screen } from "../../api";

export async function screen_capture() {
	await request_capture_screen();
	await invoke("capture_screen");
}
