use serde::Serialize;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumChildWindows, EnumWindows, GetWindowRect, GetWindowTextW, IsWindowVisible,
};

struct Callback<'a>(HWND, &'a mut dyn FnMut(HWND) -> bool);

// fn is_filter_window(hwnd: HWND) -> bool {
//     unsafe {
//         let dw_process_id = GetCurrentProcessId();

//         if hwnd != HWND(null_mut()) && IsWindow(hwnd).as_bool() {
//             let dw_window_process_id = GetWindowThreadProcessId(hwnd, None);
//             if dw_window_process_id == dw_process_id {
//                 return true;
//             }
//         }
//     }
//     false
// }

// fn should_win_be_filtered(hwnd: HWND) -> bool {
//     // if is_filter_window(hwnd) {
//     //     return true;
//     // }
//     unsafe {
//         let dw_style = GetWindowLongW(hwnd, GWL_STYLE);
//         let dw_style_must = WS_VISIBLE;
//         if (dw_style & dw_style_must.0 as i32) != dw_style_must.0 as i32 {
//             return true;
//         }

//         let dw_ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
//         let dw_ex_style_must = WS_EX_TRANSPARENT;
//         (dw_ex_style & dw_ex_style_must.0 as i32) != 0
//     }
// }

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
    println!("skip_hwnd: {:?}", skip_hwnd);
    let displays = display_info::DisplayInfo::all().unwrap();
    let max_width = displays.iter().map(|info| info.width).max().unwrap() as i32;
    let max_height = displays.iter().map(|info| info.height).max().unwrap() as i32;
    let min_x = displays.iter().map(|info| info.x).min().unwrap();
    let min_y = displays.iter().map(|info| info.y).min().unwrap();

    let mut windows_info = vec![];

    // 定义枚举回调
    let mut callback = |hwnd: HWND| -> bool {
        // 检查窗口是否可见
        if unsafe { IsWindowVisible(hwnd).as_bool() } {
            // 获取窗口标题
            let mut title = vec![0u16; 256];
            let len = unsafe { GetWindowTextW(hwnd, &mut title) as usize };
            title.truncate(len);

            // 获取窗口位置和大小
            let mut rect = RECT::default();
            if unsafe { GetWindowRect(hwnd, &mut rect).is_ok() } {
                let title_str = String::from_utf16_lossy(&title);
                if rect.left < -max_width || rect.top < -max_width {
                    return true;
                }
                // 如果为负数，则为零
                let left = if rect.left < min_x {
                    0
                } else {
                    rect.left - min_x
                };
                let top = if rect.top < min_y {
                    0
                } else {
                    rect.top - min_y
                };
                let right = if rect.right > max_width {
                    max_width
                } else {
                    rect.right
                };
                let bottom = if rect.bottom > max_height {
                    max_height
                } else {
                    rect.bottom
                };
                windows_info.push(WindowInfo {
                    hwnd: format!("{:?}", hwnd),
                    title: title_str,
                    x: left,
                    y: top,
                    width: (right - min_x) - left,
                    height: (bottom - min_y) - top,
                });
            }
        }
        true // 返回 true 继续枚举
    };
    // 枚举所有窗口
    unsafe {
        let mut callback = Callback(skip_hwnd, &mut callback);
        // println!("callback_ptr: {:?}", callback_ptr);
        let _ = EnumWindows(
            Some(enum_windows_callback),
            LPARAM(&mut callback as *mut _ as isize),
        );
    }

    println!("EnumWindows");

    // 打印所有窗口信息
    // for window_info in &windows_info {
    //     println!(
    //         "Window Title: \"{}\" | X: {}, Y: {}, Width: {}, Height: {}",
    //         window_info.title, window_info.x, window_info.y, window_info.width, window_info.height
    //     );
    // }
    windows_info
}

// EnumWindows 的回调函数
unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let callback = unsafe { &mut *(lparam.0 as *mut Callback) };
    if hwnd != callback.0 {
        let _ = EnumChildWindows(hwnd, Some(enum_child_windows_callback), lparam);
        BOOL::from(callback.1(hwnd))
    } else {
        BOOL::from(true)
    }
}

unsafe extern "system" fn enum_child_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let _ = EnumChildWindows(hwnd, Some(enum_child_windows_callback), lparam);
    let callback = unsafe { &mut *(lparam.0 as *mut Callback) };
    BOOL::from(callback.1(hwnd))
}
