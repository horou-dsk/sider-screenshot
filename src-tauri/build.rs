macro_rules! p {
    ($($tokens: tt)*) => {
        println!("cargo:warning={}", format!($($tokens)*))
    }
}

fn main() {
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
