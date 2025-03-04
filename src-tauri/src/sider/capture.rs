use serde_json::json;
use sider_local_ai::{
    reqwest,
    sider_rpc::client::{
        screen_capture_action_server::ScreenCaptureAction, GrpcEmptyMessage as Empty,
    },
    sider_rpc::tonic::{self, Request, Response},
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
impl ScreenCaptureAction for CaptureService {
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
                min_x.min(info.x().unwrap()),
                min_y.min(info.y().unwrap()),
                right_width.max(info.x().unwrap() + info.width().unwrap() as i32),
                bottom_height.max(info.y().unwrap() + info.height().unwrap() as i32),
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
            x: info.x().unwrap() - min_x,
            y: info.y().unwrap() - min_y,
            width: info.width().unwrap(),
            height: info.height().unwrap(),
            is_primary: info.is_primary().unwrap(),
            scale_factor: info.scale_factor().unwrap(),
            id: info.id().unwrap(),
            name: info.name().unwrap(),
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
