use std::{
    collections::HashMap,
    sync::{atomic::AtomicU16, Arc, RwLock},
};

use tauri::{AppHandle, Listener, Runtime, WindowEvent};

#[derive(Clone)]
pub struct SearchWindowManager<R: Runtime> {
    windows: Arc<RwLock<HashMap<u16, Arc<tauri::WebviewWindow<R>>>>>,
    id_counter: Arc<AtomicU16>,
}

impl<R: Runtime> Default for SearchWindowManager<R> {
    fn default() -> Self {
        Self {
            windows: Arc::new(RwLock::new(HashMap::new())),
            id_counter: Arc::new(AtomicU16::new(0)),
        }
    }
}

impl<R: Runtime> SearchWindowManager<R> {
    pub fn create_search_window(&self, app_handle: &AppHandle<R>) -> anyhow::Result<u16> {
        let id = self
            .id_counter
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let label = format!("web_search_{}", id);
        let window = tauri::WebviewWindowBuilder::new(
            app_handle,
            &label,
            tauri::WebviewUrl::External("https://www.baidu.com".try_into()?),
        )
        .title("Web Search")
        .inner_size(800.0, 600.0)
        .center()
        .visible(false)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .build()?;
        // window.eval(include_str!("../dist-js/dom-ready.js"))?;
        self.windows.write().unwrap().insert(id, Arc::new(window));
        Ok(id)
    }

    pub fn load_url(&self, id: u16, url: &str) -> anyhow::Result<()> {
        if let Some(window) = self.windows.read().unwrap().get(&id) {
            window.navigate(url.try_into()?)?;
        }
        Ok(())
    }

    pub fn get_window(&self, id: u16) -> Option<Arc<tauri::WebviewWindow<R>>> {
        self.windows.read().unwrap().get(&id).cloned()
    }

    pub fn remove_window(&self, id: u16) -> anyhow::Result<()> {
        if let Some(window) = self.windows.write().unwrap().remove(&id) {
            window.destroy()?;
        }
        Ok(())
    }
}
