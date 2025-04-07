use tauri::{command, AppHandle, Manager, Runtime};

use crate::SearchWindowManager;
use crate::WebSearchWindowExt;

#[command]
pub(crate) async fn create_search_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<u16> {
    app.create_search_window().map_err(tauri::Error::Anyhow)
}

macro_rules! match_window {
    ($app:expr, $id:expr) => {
        $app.get_search_window($id)
            .ok_or(tauri::Error::Anyhow(anyhow::anyhow!("Window not found")))?
    };
}

macro_rules! search_windows {
    ($app:expr) => {
        $app.state::<SearchWindowManager<R>>()
    };
}

#[command]
pub(crate) fn load_url<R: Runtime>(app: AppHandle<R>, id: u16, url: String) -> tauri::Result<()> {
    search_windows!(app)
        .load_url(id, &url)
        .map_err(tauri::Error::Anyhow)
}

#[command]
pub(crate) fn remove_search_window<R: Runtime>(app: AppHandle<R>, id: u16) -> tauri::Result<()> {
    search_windows!(app)
        .remove_window(id)
        .map_err(tauri::Error::Anyhow)
}

#[command]
pub(crate) fn eval_js<R: Runtime>(app: AppHandle<R>, id: u16, js: String) -> tauri::Result<()> {
    match_window!(app, id).eval(&js)
}
