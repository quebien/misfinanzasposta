<#
  Build script for Windows.

  This PowerShell script installs the Tauri CLI if it isn't already
  installed and then compiles the Mis Finanzas Posta desktop application
  in release mode. Run it from the project root with:
    powershell -ExecutionPolicy Bypass -File .\build.ps1
  The resulting installer/binary will be found under
  src-tauri\target\release\bundle.
#>

param()

function Ensure-Rust {
  if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Error "Rust toolchain is required but not installed. Please install Rust via rustup."
    exit 1
  }
}

function Ensure-TauriCLI {
  if (-not (Get-Command cargo-tauri -ErrorAction SilentlyContinue) -and -not (cargo tauri -V 2>$null)) {
    Write-Host "Installing Tauri CLI..."
    cargo install tauri-cli --locked
  }
}

function Build-App {
  Write-Host "Building Mis Finanzas Posta desktop application..."
  cargo tauri build --release
  Write-Host "Build complete. Find your installers in src-tauri\\target\\release\\bundle\\"
}

Ensure-Rust
Ensure-TauriCLI
Build-App