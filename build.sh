#!/bin/bash

# Build script for Linux and macOS environments.
#
# This script installs the Tauri CLI if it isn't already available and
# compiles the Mis Finanzas Posta desktop application in release mode.
#
# Usage: run `./build.sh` from the project root. The resulting native
# installer/binary will be generated under `src-tauri/target/release/bundle`.

set -euo pipefail

# Ensure rust is installed
if ! command -v rustc >/dev/null 2>&1; then
  echo "Rust toolchain is required but not installed. Please install Rust via rustup." >&2
  exit 1
fi

# Install the Tauri CLI if missing
if ! command -v cargo-tauri >/dev/null 2>&1 && ! cargo tauri -V >/dev/null 2>&1; then
  echo "Installing Tauri CLI..."
  cargo install tauri-cli --locked
fi

# Build the application
echo "Building Mis Finanzas Posta desktop application..."
cargo tauri build --release

echo "Build complete. Find your installers in src-tauri/target/release/bundle/"