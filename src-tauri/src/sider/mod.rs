use capture::CaptureService;
use sider_local_ai::{tonic, tracing::error};
use tauri::WebviewWindow;

pub mod capture;

pub struct LocalServe {
    pub(crate) screenshot_window: WebviewWindow,
}

impl LocalServe {
    pub fn local_serve_run(self) {
        if !cfg!(debug_assertions) {
            std::thread::spawn(move || {
                tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .unwrap()
                    .block_on(self.run())
                    .expect("local serve run error");
            });
        }
    }

    async fn run(self) -> std::io::Result<()> {
        tokio::spawn(async {
            if let Err(err) = tonic::transport::Server::builder().add_service(
                sider_local_ai::sider::client::screen_capture_service_server::ScreenCaptureServiceServer::new(CaptureService::new(self.screenshot_window))
            ).serve("127.0.0.1:50052".parse().unwrap()).await {
                error!("rpc service run error: {}", err);
            }
        });
        sider_local_ai::run().await?;
        Ok(())
    }
}
