pnpm build
Push-Location .\src-tauri
cargo build --release
Pop-Location

Push-Location .\src-tauri\target\release
if (Test-Path .\sider.exe) {
    Remove-Item .\sider.exe
}
Rename-Item .\sider-tauri.exe .\sider.exe
if (Test-Path .\dist) {
    Remove-Item .\dist -Recurse
}
Copy-Item ..\..\..\dist .\dist -Recurse

7z.exe a sider.zip dist\ sider.exe
Pop-Location
