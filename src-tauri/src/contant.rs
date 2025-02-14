#[macro_export]
macro_rules! local_url {
    ($path:expr) => {
        concat!("http://localhost:8088", $path)
    };
}
