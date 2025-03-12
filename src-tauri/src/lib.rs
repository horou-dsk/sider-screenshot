// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::io::Write as _;

use serde::Serialize;
use sider::{capture::screen_capture, send_capture, LocalServe};
use sider_local_ai::tracing::error;
use tauri::Manager;
use windows::{set_visible_window, set_window_style};

mod contant;
pub mod enum_windows;
mod quick_search;
mod sider;
mod windows;

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
fn hide_window(window: tauri::Window) -> tauri::Result<()> {
    set_visible_window(window.hwnd()?).expect("设置窗口可见失败");
    Ok(())
}

#[tauri::command]
async fn capture_screen(app: tauri::AppHandle) -> tauri::Result<()> {
    let screenshot_window = app.get_webview_window("screenshot").unwrap();
    screen_capture(&screenshot_window).await?;
    Ok(())
}

#[tauri::command]
async fn get_local_serve_port(app: tauri::AppHandle) -> tauri::Result<u16> {
    let local_serve = app.state::<LocalServe>();
    Ok(local_serve.port())
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
    // 判断应用是否已经运行
    if let Ok(port) = std::fs::read_to_string("./sider_ai.lock").and_then(|text| {
        text.parse::<u16>()
            .map_err(|_| std::io::Error::other("Parse error"))
    }) {
        let stream = std::net::TcpStream::connect(("127.0.0.1", port));
        if stream.is_ok() {
            eprintln!("sider_ai is running");
            return;
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            hide_window,
            capture_screen,
            send_capture,
            get_local_serve_port,
        ])
        .setup(|app| {
            let screenshot_window = app.get_webview_window("screenshot").unwrap();
            set_window_style(screenshot_window.hwnd()?).expect("set window style error");
            let local_serve = LocalServe::default().local_serve_run(screenshot_window);
            if let Ok(mut f) = std::fs::File::create("./sider_ai.lock") {
                let _ = f.write_all(local_serve.port().to_string().as_bytes());
            }
            app.manage(local_serve);
            if let Err(err) = quick_search::init_window(app) {
                error!("init quick search window error: {}", err);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    let _ = std::fs::remove_file("./sider_ai.lock");
}
