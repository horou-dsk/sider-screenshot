macro_rules! p {
    ($($tokens: tt)*) => {
        println!("cargo:warning={}", format!($($tokens)*))
    }
}

fn main() {
    // From dep:tauri build.rs
    // ```rust
    // let custom_protocol = has_feature("custom-protocol");
    // let dev = !custom_protocol;
    // alias("custom_protocol", custom_protocol);
    // alias("dev", dev);
    // ```
    // DEP_TAURI_DEV 表示 tauri 库里面定义的 dev;
    p!(
        "Building tauri app dep_tauri_dev... {:?}",
        std::env::var("DEP_TAURI_DEV")
    );
    p!(
        "Building tauri app cargo_manifest_dir... {:?}",
        std::env::var("CARGO_MANIFEST_DIR")
    );
    tauri_build::build();
}
