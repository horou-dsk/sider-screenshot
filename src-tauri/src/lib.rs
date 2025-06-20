// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![feature(file_lock)]
use std::fs::File;

use serde::Serialize;
use sider::{LocalServe, capture::screen_capture};
use sider_local_ai::get_application_data_path;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use windows::{set_visible_window, set_window_style};

mod constant;
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
fn capture_screen(app: tauri::AppHandle) -> tauri::Result<()> {
    let screenshot_window = app.get_webview_window("screenshot").unwrap();
    screen_capture(&screenshot_window)?;
    Ok(())
}

#[tauri::command]
async fn get_local_serve_port(app: tauri::AppHandle) -> tauri::Result<u16> {
    let local_serve = app.state::<LocalServe>();
    Ok(local_serve.port())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 判断应用是否已经运行
    let sider_lock_file = get_application_data_path().join("sider_ai.lock");
    let f = if sider_lock_file.exists() {
        match File::open(&sider_lock_file) {
            Ok(f) => f,
            Err(_) => {
                eprintln!("sider ai is running");
                return;
            }
        }
    } else {
        File::create(&sider_lock_file).expect("create sider ai lock file error")
    };
    if f.try_lock().is_err() {
        eprintln!("sider ai is running");
        return;
    }
    let local_serve = LocalServe::default();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_web_search::init())
        .invoke_handler(tauri::generate_handler![
            hide_window,
            capture_screen,
            sider::command::send_capture,
            sider::command::cancel_capture,
            get_local_serve_port,
        ])
        .setup(|app| {
            if let Err(err) = init_global_shortcut(app) {
                tracing::error!("init global shortcut error: {}", err);
            }
            let screenshot_window = app.get_webview_window("screenshot").unwrap();
            set_window_style(screenshot_window.hwnd()?).expect("set window style error");
            app.manage(local_serve.local_serve_run(screenshot_window));
            if let Err(err) = quick_search::init_window(app) {
                tracing::error!("init quick search window error: {}", err);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    drop(f);
    let _ = std::fs::remove_file(sider_lock_file);
}

fn init_global_shortcut(app: &tauri::App) -> Result<(), tauri_plugin_global_shortcut::Error> {
    let ctrl_alt_d_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyD);
    let alt_x_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyX);
    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_shortcuts(vec![ctrl_alt_d_shortcut, alt_x_shortcut])?
            .with_handler(move |app, shortcut, event| {
                tracing::info!("{:?}", shortcut);
                if shortcut == &ctrl_alt_d_shortcut {
                    if event.state == ShortcutState::Pressed {
                        app.emit("ctrl-alt-d", ()).unwrap();
                    }
                } else if shortcut == &alt_x_shortcut && event.state == ShortcutState::Pressed {
                    app.emit("alt-x", ()).unwrap();
                }
            })
            .build(),
    )?;
    Ok(())
}
