use tauri::{Manager, PhysicalPosition};

pub fn init_window(app: &mut tauri::App) -> anyhow::Result<()> {
    let webview_window = app.get_webview_window("quick-search").unwrap();
    let Some(primary_monitor) = app.primary_monitor()? else {
        return Err(anyhow::anyhow!("primary monitor not found"));
    };
    let screen_size = primary_monitor.size();
    let window_size = webview_window.outer_size()?;
    webview_window.set_position(PhysicalPosition::new(
        (screen_size.width - window_size.width) / 2,
        screen_size.height / 4,
    ))?;
    Ok(())
}
