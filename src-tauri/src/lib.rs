// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use enum_windows::WindowInfo;
use serde::Serialize;
use sider::LocalServe;
use tauri::Manager;
use windows::{set_visible_window, set_window_size, set_window_style};

mod enum_windows;
mod sider;
mod windows;

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

// #[tauri::command]
// fn image_to_clipboard(image: Vec<u8>, _width: u32, _height: u32) {
//     // let mut file = File::create("test.png").unwrap();
//     // file.write_all(&image).unwrap();
//     let png_image = image::load_from_memory(&image).unwrap();
//     let img = gen_from_img(&png_image);
//     // if let Err(err) = set_image_to_clipboard(bytes, width, height) {
//     //     println!("Error: {}", err);
//     // }
//     // let mut w = std::io::Cursor::new(Vec::new());
//     // png_image.write_to(&mut w, image::ImageFormat::Bmp).unwrap();
//     // if let Err(err) = set_clipboard(clipboard_win::formats::Bitmap, img) {
//     //     println!("Error: {}", err);
//     // }
//     // if let Err(err) = clipboard.set_image(ImageData {
//     //     width,
//     //     height,
//     //     bytes: Cow::Owned(rgba_image.to_vec()),
//     // }) {
//     //     println!("Error: {}", err);
//     // }
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_foreground_window_info,
            get_display_info,
            mutiple_monitor_fullscreen,
            hide_window,
        ])
        .setup(|app| {
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            let screenshot_window = app.get_webview_window("screenshot").unwrap();
            set_window_style(screenshot_window.hwnd()?).expect("set window style error");
            LocalServe { screenshot_window }.local_serve_run();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
