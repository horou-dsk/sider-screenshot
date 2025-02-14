use serde_json::json;
use sider_local_ai::{
    reqwest,
    sider::client::GrpcEmptyMessage as Empty,
    tonic::{self, Request, Response},
    tracing::error,
};
use tauri::{Emitter, WebviewWindow};

use crate::{enum_windows, local_url, windows::set_window_size, MonitorInfo};

pub struct CaptureService {
    screenshot_window: WebviewWindow,
    client: reqwest::Client,
}

impl CaptureService {
    pub fn new(screenshot_window: WebviewWindow) -> CaptureService {
        CaptureService {
            screenshot_window,
            client: reqwest::Client::new(),
        }
    }
}

#[tonic::async_trait]
impl sider_local_ai::sider::client::screen_capture_action_server::ScreenCaptureAction
    for CaptureService
{
    async fn will_capture(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<Empty>, tonic::Status> {
        if let Err(err) = self
            .client
            .get(local_url!("/sys/screenshot/capture"))
            .send()
            .await
        {
            error!("Failed to capture screenshot: {}", err);
        };
        screen_capture(&self.screenshot_window).await.unwrap();
        Ok(Response::new(Empty::default()))
    }

    async fn ping_toolkit(&self, _: Request<Empty>) -> Result<Response<Empty>, tonic::Status> {
        Ok(Response::new(Empty::default()))
    }
}

pub async fn screen_capture(screenshot_window: &WebviewWindow) -> anyhow::Result<()> {
    let hwnd = screenshot_window.hwnd()?;
    let window_info = enum_windows::get_foreground_window_info(hwnd);
    let monitor_info = xcap::Monitor::all()?;
    let (min_x, min_y, right_width, bottom_height) = monitor_info.iter().fold(
        (0, 0, 0, 0),
        |(min_x, min_y, right_width, bottom_height), info| {
            (
                min_x.min(info.x()),
                min_y.min(info.y()),
                right_width.max(info.x() + info.width() as i32),
                bottom_height.max(info.y() + info.height() as i32),
            )
        },
    );
    let width = right_width - min_x;
    let height = bottom_height - min_y;
    if let Err(err) = set_window_size(hwnd, min_x, min_y, width, height) {
        error!("设置窗口大小失败 {}", err);
    }
    let monitor_info: Vec<MonitorInfo> = monitor_info
        .into_iter()
        .map(|info| MonitorInfo {
            x: info.x() - min_x,
            y: info.y() - min_y,
            width: info.width(),
            height: info.height(),
            is_primary: info.is_primary(),
            scale_factor: info.scale_factor(),
            id: info.id(),
            name: info.name().to_string(),
        })
        .collect();
    if let Err(err) = screenshot_window.emit(
        "show-window",
        json!({
            "window_info": window_info,
            "monitor_info": monitor_info,
            "min_x": min_x,
            "min_y": min_y,
        }),
    ) {
        error!("唤起截屏失败 {}", err);
    }
    Ok(())
}
