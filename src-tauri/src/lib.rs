// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use enum_windows::WindowInfo;
use tauri::Manager;

mod enum_windows;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_foreground_window_info(app: tauri::AppHandle) -> Vec<WindowInfo> {
    let window = app.get_webview_window("screenshot").unwrap();
    enum_windows::get_foreground_window_info(window.hwnd().unwrap())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_foreground_window_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
