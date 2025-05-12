param (
    [switch]$Prod
)
pnpm build
Push-Location .\src-tauri
$fileContent = Get-Content -Path "tauri.conf.prod.json" -Raw
$env:TAURI_CONFIG = $fileContent
# 判断参数是否包含 --release
if ($Prod) {
    Write-Output "Prod Env"
    cargo build --release --features "tauri/custom-protocol"
} else {
    Write-Output "Test Env"
    $env:RUSTFLAGS="--cfg sider_test";
    cargo build --release --features "tauri/custom-protocol"
}
$env:TAURI_CONFIG = $null
Pop-Location

Push-Location .\src-tauri\target\release
if (Test-Path .\sider-ai.exe) {
    Remove-Item .\sider-ai.exe
}
Rename-Item .\sider-tauri.exe .\sider-ai.exe
# if (Test-Path .\dist) {
#     Remove-Item .\dist -Recurse
# }
# Copy-Item ..\..\..\dist .\dist -Recurse

# upx -9 sider.exe
# 7z.exe a sider.zip dist\ sider.exe
Pop-Location
