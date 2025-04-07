const COMMANDS: &[&str] = &[
    "create_search_window",
    "load_url",
    "remove_search_window",
    "eval_js",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
