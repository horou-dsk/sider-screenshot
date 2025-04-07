use std::sync::Arc;

use search_window::SearchWindowManager;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

mod search_window;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the web-search APIs.
pub trait WebSearchWindowExt<R: Runtime> {
    fn create_search_window(&self) -> anyhow::Result<u16>;

    fn get_search_window(&self, id: u16) -> Option<Arc<tauri::WebviewWindow<R>>>;

    fn remove_search_window(&self, id: u16) -> anyhow::Result<()>;
}

impl<R: Runtime, T: Manager<R>> crate::WebSearchWindowExt<R> for T {
    fn create_search_window(&self) -> anyhow::Result<u16> {
        self.state::<SearchWindowManager<R>>()
            .create_search_window(self.app_handle())
    }

    fn get_search_window(&self, id: u16) -> Option<Arc<tauri::WebviewWindow<R>>> {
        self.state::<SearchWindowManager<R>>().get_window(id)
    }

    fn remove_search_window(&self, id: u16) -> anyhow::Result<()> {
        self.state::<SearchWindowManager<R>>().remove_window(id)
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("web-search")
        .invoke_handler(tauri::generate_handler![
            commands::create_search_window,
            commands::load_url,
            commands::remove_search_window,
            commands::eval_js,
        ])
        .setup(|app, _api| {
            app.manage(SearchWindowManager::<R>::default());
            Ok(())
        })
        .build()
}
