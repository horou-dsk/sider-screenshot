use sider_local_ai::tracing::{error, info};
use tauri::Manager as _;

use crate::{sider::LocalServe, windows::image_clipboard};

#[tauri::command]
pub async fn send_capture(app: tauri::AppHandle, image: Vec<u8>) -> tauri::Result<()> {
    // let d_image = image::load_from_memory_with_format(&image, image::ImageFormat::Png)
    //     .map_err(|err| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, err)))?;
    // let ctx = clipboard_rs::ClipboardContext::new().unwrap();
    // if let Err(err) = clipboard_rs::Clipboard::set_image(
    //     &ctx,
    //     <clipboard_rs::RustImageData as clipboard_rs::common::RustImage>::from_dynamic_image(
    //         d_image,
    //     ),
    // ) {
    //     eprintln!("设置剪贴板失败 {}", err);
    // }
    let d_image = image::load_from_memory_with_format(&image, image::ImageFormat::Png)
        .map_err(|err| tauri::Error::Io(std::io::Error::other(err)))?;

    std::thread::spawn(move || {
        for _ in 0..3 {
            let now = std::time::Instant::now();
            match image_clipboard::set_png_image(&d_image) {
                Ok(_) => {
                    info!("set image to clipboard cost time: {:?}", now.elapsed());
                    break;
                }
                Err(err) => {
                    error!("set image to clipboard error: {}", err);
                }
            }
        }
    });

    info!("send capture");

    let local_serve = app.state::<LocalServe>();
    local_serve.send_capture(image).await?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_capture(app: tauri::AppHandle) -> tauri::Result<()> {
    let local_serve = app.state::<LocalServe>();
    local_serve.cancel_capture().await?;
    Ok(())
}
