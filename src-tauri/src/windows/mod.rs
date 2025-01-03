use windows::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{
        SetWindowLongW, SetWindowPos, ShowWindow, GWL_EXSTYLE, GWL_STYLE, HWND_TOP, SWP_SHOWWINDOW,
        SW_HIDE, SW_SHOW, WS_CLIPSIBLINGS, WS_EX_LEFT, WS_EX_LTRREADING, WS_EX_RIGHTSCROLLBAR,
        WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_OVERLAPPED,
    },
};

pub fn set_window_style(hwnd: HWND) -> windows::core::Result<()> {
    unsafe {
        // 设置无边框窗口样式
        SetWindowLongW(
            hwnd,
            GWL_STYLE,
            (WS_CLIPSIBLINGS | WS_OVERLAPPED | WS_MINIMIZEBOX | WS_MAXIMIZEBOX).0 as i32,
        );
        SetWindowLongW(
            hwnd,
            GWL_EXSTYLE,
            (WS_EX_LEFT | WS_EX_LTRREADING | WS_EX_RIGHTSCROLLBAR).0 as i32,
        );
    }
    Ok(())
}

pub fn set_window_size(
    hwnd: HWND,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> windows::core::Result<()> {
    unsafe {
        // 移动窗口到全屏
        SetWindowPos(hwnd, HWND_TOP, x, y, width, height, SWP_SHOWWINDOW)?;
        let _ = ShowWindow(hwnd, SW_SHOW);
        // 添加分层窗口样式
        // let style = GetWindowLongW(hwnd, GWL_STYLE);
        // SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED.0 as i32);

        // // 设置透明度和颜色键
        // SetLayeredWindowAttributes(
        //     hwnd,
        //     COLORREF(0), // 颜色键
        //     0,           // 透明度 (0-255)
        //     LWA_ALPHA,   // 仅设置透明度
        // )?;
        // DwmSetWindowAttribute(
        //     hwnd,
        //     DWMWA_WINDOW_CORNER_PREFERENCE,
        //     &policy as *const _,
        //     std::mem::size_of::<u32>() as u32,
        // )?;
        // MoveWindow(hwnd, x, y, width, height, BOOL::from(true))?;
    }
    Ok(())
}

pub fn set_visible_window(hwnd: HWND) -> windows::core::Result<()> {
    unsafe {
        let _ = ShowWindow(hwnd, SW_HIDE);
    }
    Ok(())
}

pub mod image_clipboard;
