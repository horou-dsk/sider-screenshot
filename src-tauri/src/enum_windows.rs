use std::os::raw::c_void;

use serde::Serialize;
use sider_local_ai::tracing::info;
use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::Graphics::Dwm::{
    DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS, DwmGetWindowAttribute,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumChildWindows, EnumWindows, GWL_EXSTYLE, GWL_STYLE, GetClassNameW, GetWindowLongPtrW,
    GetWindowRect, GetWindowTextW, IsIconic, IsWindowVisible, WS_CHILD, WS_EX_TOOLWINDOW,
};
use windows::core::BOOL;

struct Callback<'a>(HWND, &'a mut dyn FnMut(HWND) -> bool, [u16; 256]);

type Dword = u32;

fn is_window_cloaked(handle: HWND) -> bool {
    let cloaked: Dword = 0;
    let res = unsafe {
        DwmGetWindowAttribute(
            handle,
            DWMWA_CLOAKED,
            cloaked as *mut c_void,
            size_of::<Dword>() as u32,
        )
    };

    res.is_ok() && cloaked != 0
}

fn is_window_valid(hwnd: HWND) -> bool {
    let is_visible = unsafe { IsWindowVisible(hwnd) };
    if !is_visible.as_bool() {
        return false;
    }
    let is_minimized = unsafe { IsIconic(hwnd).as_bool() } || is_window_cloaked(hwnd);
    if is_minimized {
        return false;
    }

    let styles;
    let ex_styles;

    unsafe {
        styles = GetWindowLongPtrW(hwnd, GWL_STYLE) as Dword;
        ex_styles = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as Dword;
    }

    if ex_styles & WS_EX_TOOLWINDOW.0 > 0 {
        return true;
    }
    if styles & WS_CHILD.0 > 0 {
        // return false;
        return true;
    }
    true
}

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub hwnd: String,
}

pub fn get_foreground_window_info(skip_hwnd: HWND) -> Vec<WindowInfo> {
    info!("skip_hwnd: {:?}", skip_hwnd);
    let displays = xcap::Monitor::all().expect("Failed to get monitors");
    let max_width = displays
        .iter()
        .map(|info| info.width().unwrap())
        .max()
        .unwrap() as i32;
    let max_height = displays
        .iter()
        .map(|info| info.height().unwrap())
        .max()
        .unwrap() as i32;
    let min_x = displays.iter().map(|info| info.x().unwrap()).min().unwrap();
    let min_y = displays.iter().map(|info| info.y().unwrap()).min().unwrap();

    info!(
        "max_width: {}, max_height: {}, min_x: {}, min_y: {}",
        max_width, max_height, min_x, min_y
    );

    let mut windows_info = vec![];
    let mut title = [0u16; 256];

    // 定义枚举回调
    let mut callback = |hwnd: HWND| -> bool {
        // 获取窗口标题
        let len = unsafe { GetWindowTextW(hwnd, &mut title) as usize };
        let title = &title[..len];

        // 获取窗口位置和大小
        let mut rect = RECT::default();
        // 为什么使用 DwmGetWindowAttribute 而不是 GetWindowRect
        // 因为 GetWindowRect 获取的窗口大小会包含窗口的边框以及阴影效果
        // 而 DwmGetWindowAttribute 获取的大小更接近真实肉眼看到的窗口大小
        if unsafe {
            DwmGetWindowAttribute(
                hwnd,
                DWMWA_EXTENDED_FRAME_BOUNDS,
                &mut rect as *mut _ as *mut c_void,
                size_of::<RECT>() as u32,
            )
            .is_ok()
                || GetWindowRect(hwnd, &mut rect).is_ok()
        } {
            let title_str = String::from_utf16_lossy(title);
            let left = rect.left - min_x;
            let top = rect.top - min_y;
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            // 如果窗口太小，则跳过
            if width < 25 || height < 25 {
                return true;
            }
            // info!(
            //     "title: {title_str}, hwnd: {:08X}, rect: {:?} width: {}, height: {}",
            //     hwnd.0 as usize, rect, width, height
            // );
            windows_info.push(WindowInfo {
                hwnd: format!("{:08X}", hwnd.0 as usize),
                title: title_str,
                x: left,
                y: top,
                width,
                height,
            });
        }
        true // 返回 true 继续枚举
    };
    // 枚举所有窗口
    unsafe {
        let mut callback = Callback(skip_hwnd, &mut callback, [0u16; 256]);
        // println!("callback_ptr: {:?}", callback_ptr);
        // let desktop_window = GetDesktopWindow();
        // let _ = EnumChildWindows(
        //     Some(desktop_window),
        //     Some(enum_windows_callback),
        //     LPARAM(&mut callback as *mut _ as isize),
        // );
        let _ = EnumWindows(
            Some(enum_windows_callback),
            LPARAM(&mut callback as *mut _ as isize),
        );
    }

    info!("EnumWindows");

    // 打印所有窗口信息
    // for window_info in &windows_info {
    //     println!(
    //         "Window Title: \"{}\" | X: {}, Y: {}, Width: {}, Height: {}",
    //         window_info.title, window_info.x, window_info.y, window_info.width, window_info.height
    //     );
    // }
    windows_info
}

fn is_valid_class_name(class_name: &[u16]) -> bool {
    let class_name = String::from_utf16_lossy(class_name);
    class_name != "Windows.UI.Core.CoreWindow" && class_name != "ApplicationFrameInputSinkWindow"
}

// EnumWindows 的回调函数
extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let callback = unsafe { &mut *(lparam.0 as *mut Callback) };
    let class_name = &mut callback.2;
    let len = unsafe { GetClassNameW(hwnd, class_name) };
    // 过滤不可见窗口和跳过窗口
    if hwnd != callback.0
        && is_window_valid(hwnd)
        && is_valid_class_name(&class_name[..len as usize])
    {
        let _ = unsafe { EnumChildWindows(Some(hwnd), Some(enum_windows_callback), lparam) };
        BOOL::from(callback.1(hwnd))
    } else {
        BOOL::from(true)
    }
}
