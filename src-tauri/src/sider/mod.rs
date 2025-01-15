use base64::{engine::general_purpose, Engine as _};
use capture::CaptureService;
use sider_local_ai::{
    config::CHROME_RPC_DST,
    sider::client::{notify_capture_client::NotifyCaptureClient, CaptureResultRequest},
    tonic,
    tracing::{error, info},
};
use tauri::{Manager as _, WebviewWindow};

pub mod capture;

#[derive(Clone)]
pub struct LocalServe {}

impl LocalServe {
    pub fn local_serve_run(self, screenshot_window: WebviewWindow) -> Self {
        let this = self.clone();
        std::thread::spawn(move || {
            tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
                .unwrap()
                .block_on(this.run(screenshot_window))
                .expect("local serve run error");
        });
        self
    }

    async fn run(self, screenshot_window: WebviewWindow) -> std::io::Result<()> {
        tokio::spawn(async {
            if let Err(err) = tonic::transport::Server::builder().add_service(
                sider_local_ai::sider::client::screen_capture_action_server::ScreenCaptureActionServer::new(CaptureService::new(screenshot_window))
            ).serve("127.0.0.1:50052".parse().unwrap()).await {
                error!("rpc service run error: {}", err);
            }
        });
        let serve = sider_local_ai::LocalAppServe::new(sider_local_ai::config::Config {
            port: 8088,
            host: "127.0.0.1".to_string(),
            level: "info".to_string(),
        });

        if !cfg!(debug_assertions) {
            serve.run().await?;
        } else {
            tokio::time::sleep(std::time::Duration::from_secs(10000)).await;
        }
        Ok(())
    }

    pub async fn send_capture(&self, image: Vec<u8>) -> anyhow::Result<()> {
        let mut client = NotifyCaptureClient::connect(CHROME_RPC_DST).await?;
        let request = tonic::Request::new(CaptureResultRequest {
            data: general_purpose::STANDARD.encode(image),
        });
        client.did_capture(request).await?;
        Ok(())
    }
}

#[tauri::command]
pub async fn send_capture(app: tauri::AppHandle, image: Vec<u8>) -> tauri::Result<()> {
    let d_image = image::load_from_memory_with_format(&image, image::ImageFormat::Png)
        .map_err(|err| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, err)))?;

    std::thread::spawn(move || {
        if let Ok(clip) = clipboard_rs::ClipboardContext::new() {
            for _ in 0..3 {
                let now = std::time::Instant::now();
                match clip.set_png_image(&d_image) {
                    Ok(_) => {
                        info!("set image to clipboard cost time: {:?}", now.elapsed());
                        break;
                    }
                    Err(err) => {
                        error!("set image to clipboard error: {}", err);
                    }
                }
            }
        }
    });

    info!("send capture");

    let local_serve = app.state::<LocalServe>();
    local_serve.send_capture(image).await?;
    Ok(())
}
