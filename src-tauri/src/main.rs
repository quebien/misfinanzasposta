#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    // Build and run the Tauri application. The default builder loads
    // frontend assets from the dist directory specified in `tauri.conf.json`.
    tauri::Builder::default()
        .setup(|app| {
            // Set the application version on the window badge for display
            let version = env!("CARGO_PKG_VERSION");
            let window = app.get_window("main").unwrap();
            window.emit("app_version", version.to_string()).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Mis Finanzas Posta application");
}