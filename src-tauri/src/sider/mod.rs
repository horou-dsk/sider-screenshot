use base64::{Engine as _, engine::general_purpose};
use capture::CaptureService;
use clap::Parser;
use sider_local_ai::{config::Config as ServeConfig, sider_rpc::did_capture};
use tauri::WebviewWindow;

use crate::constant;

pub mod capture;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct Cli {
    #[arg(short, long)]
    rpc_port: Option<u16>,
    #[arg(short, long)]
    dst_rpc_port: Option<u16>,
    #[arg(short, long, default_value_t = true)]
    marking_words: bool,
}

pub struct LocalServe {
    config: ServeConfig,
}

impl Default for LocalServe {
    fn default() -> Self {
        let cli = Cli::parse();
        let config = ServeConfig::load("./Config.toml").unwrap_or_else(|_| ServeConfig {
            port: std::net::TcpListener::bind("127.0.0.1:0")
                .unwrap()
                .local_addr()
                .unwrap()
                .port(),
            rpc_port: cli.rpc_port.unwrap_or(0),
            rpc_dst_port: cli.dst_rpc_port.unwrap_or(0),
            marking_words: cli.marking_words,
            ..Default::default()
        });
        unsafe {
            constant::LOCAL_SERVER_PORT = config.port;
        }
        Self { config }
    }
}

impl LocalServe {
    pub fn local_serve_run(self, screenshot_window: WebviewWindow) -> Self {
        let local_serve = sider_local_ai::LocalAppServe::new(self.config.clone());
        std::thread::spawn(move || {
            tauri::async_runtime::block_on(Self::run(local_serve, screenshot_window))
                .expect("local serve run error");
        });
        self
    }

    async fn run(
        local_serve: sider_local_ai::LocalAppServe,
        screenshot_window: WebviewWindow,
    ) -> std::io::Result<()> {
        use sider_local_ai::sider_rpc::{
            client::screen_capture_action_server::ScreenCaptureActionServer, tonic::service::Routes,
        };
        let screen_capture_action_server =
            ScreenCaptureActionServer::new(CaptureService::new(screenshot_window));
        let serve = local_serve.routes(Routes::new(screen_capture_action_server));

        serve.run().await?;

        Ok(())
    }

    pub async fn send_capture(&self, image: Vec<u8>) -> anyhow::Result<()> {
        did_capture(general_purpose::STANDARD.encode(image)).await?;
        Ok(())
    }

    pub async fn cancel_capture(&self) -> anyhow::Result<()> {
        did_capture("".to_string()).await?;
        // did_cancel_capture().await?;
        Ok(())
    }

    pub fn port(&self) -> u16 {
        self.config.port
    }
}

pub mod command;
