// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use enum_windows::WindowInfo;
use serde::Serialize;
use tauri::Manager;
use windows::{set_visible_window, set_window_size, set_window_style};

mod enum_windows;
mod windows;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_foreground_window_info(app: tauri::AppHandle) -> Vec<WindowInfo> {
    let window = app.get_webview_window("screenshot").unwrap();
    enum_windows::get_foreground_window_info(window.hwnd().unwrap())
}

#[derive(Debug, Serialize)]
struct MonitorInfo {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    is_primary: bool,
    scale_factor: f32,
    id: u32,
    name: String,
}

#[tauri::command]
fn get_display_info() -> Vec<MonitorInfo> {
    let displays = display_info::DisplayInfo::all().unwrap();
    displays
        .into_iter()
        .map(|info| MonitorInfo {
            x: info.x,
            y: info.y,
            width: info.width,
            height: info.height,
            is_primary: info.is_primary,
            scale_factor: info.scale_factor,
            id: info.id,
            name: info.name,
        })
        .collect()
}

#[tauri::command]
fn mutiple_monitor_fullscreen(
    app: tauri::AppHandle,
    window_label: String,
    width: i32,
    height: i32,
    x: i32,
    y: i32,
) {
    let window = app.get_webview_window(&window_label).unwrap();
    set_window_size(window.hwnd().unwrap(), x, y, width, height).expect("设置窗口大小失败");
}

#[tauri::command]
fn hide_window(window: tauri::Window) -> tauri::Result<()> {
    set_visible_window(window.hwnd()?).expect("设置窗口可见失败");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_foreground_window_info,
            get_display_info,
            mutiple_monitor_fullscreen,
            hide_window
        ])
        .setup(|app| {
            let screenshot_window = app.get_webview_window("screenshot").unwrap();
            set_window_style(screenshot_window.hwnd()?).expect("set window style error");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
