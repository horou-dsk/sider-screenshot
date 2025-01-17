use criterion::{criterion_group, criterion_main};
use sider_tauri_lib::enum_windows::get_foreground_window_info;
use windows::Win32::Foundation::HWND;

fn enum_windows_benchmark(c: &mut criterion::Criterion) {
    c.bench_function("enum_windows", |b| {
        b.iter(|| get_foreground_window_info(HWND::default()))
    });
}

criterion_group!(benches, enum_windows_benchmark);

criterion_main!(benches);
