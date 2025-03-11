pnpm build
Push-Location .\src-tauri
$fileContent = Get-Content -Path "tauri.conf.prod.json" -Raw
$env:TAURI_CONFIG = $fileContent
cargo build --release --features "tauri/custom-protocol"
$env:TAURI_CONFIG = $null
Pop-Location

Push-Location .\src-tauri\target\release
if (Test-Path .\sider.exe) {
    Remove-Item .\sider.exe
}
Rename-Item .\sider-tauri.exe .\sider.exe
# if (Test-Path .\dist) {
#     Remove-Item .\dist -Recurse
# }
# Copy-Item ..\..\..\dist .\dist -Recurse

# upx -9 sider.exe
# 7z.exe a sider.zip dist\ sider.exe
Pop-Location
