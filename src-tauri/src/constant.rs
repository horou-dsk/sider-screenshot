pub static mut LOCAL_SERVER_PORT: u16 = 8088;

#[macro_export]
macro_rules! local_url {
    ($($arg:tt)*) => {
        format!(
            "http://localhost:{}{}",
            unsafe { $crate::constant::LOCAL_SERVER_PORT },
            format_args!($($arg)*)
        )
    };
}
