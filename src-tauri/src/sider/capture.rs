use serde_json::json;
use sider_local_ai::{
    reqwest,
    sider::client::Empty,
    tonic::{self, Request, Response},
    tracing::error,
};
use tauri::{Emitter, WebviewWindow};

use crate::{enum_windows, windows::set_window_size, MonitorInfo};

pub struct CaptureService {
    screenshot_window: WebviewWindow,
}

impl CaptureService {
    pub fn new(screenshot_window: WebviewWindow) -> CaptureService {
        CaptureService { screenshot_window }
    }
}

#[tonic::async_trait]
impl sider_local_ai::sider::client::screen_capture_service_server::ScreenCaptureService
    for CaptureService
{
    async fn capture(&self, _request: Request<Empty>) -> Result<Response<Empty>, tonic::Status> {
        if let Err(err) = reqwest::Client::new()
            .get("http://localhost:8088/sys/screenshot/capture")
            .send()
            .await
        {
            error!("Failed to capture screenshot: {}", err);
        };
        let hwnd = self.screenshot_window.hwnd().unwrap();
        let window_info = enum_windows::get_foreground_window_info(hwnd);
        let monitor_info = display_info::DisplayInfo::all().unwrap();
        let min_x = monitor_info.iter().map(|info| info.x).min().unwrap();
        let min_y = monitor_info.iter().map(|info| info.y).min().unwrap();
        let max_width = monitor_info.iter().map(|info| info.width).max().unwrap();
        let max_height = monitor_info.iter().map(|info| info.height).max().unwrap();
        let width = max_width as i32 - min_x;
        let height = max_height as i32 - min_y;
        if let Err(err) = set_window_size(hwnd, min_x, min_y, width, height) {
            error!("设置窗口大小失败 {}", err);
        }
        let monitor_info: Vec<MonitorInfo> = monitor_info
            .into_iter()
            .map(|info| MonitorInfo {
                x: info.x - min_x,
                y: info.y - min_y,
                width: info.width,
                height: info.height,
                is_primary: info.is_primary,
                scale_factor: info.scale_factor,
                id: info.id,
                name: info.name,
            })
            .collect();
        if let Err(err) = self.screenshot_window.emit(
            "show-window",
            json!({
                "window_info": window_info,
                "monitor_info": monitor_info
            }),
        ) {
            error!("唤起截屏失败 {}", err);
        }
        Ok(Response::new(Empty::default()))
    }

    async fn ping(&self, _: Request<Empty>) -> Result<Response<Empty>, tonic::Status> {
        Ok(Response::new(Empty::default()))
    }
}
