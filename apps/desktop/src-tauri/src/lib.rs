// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::sync::Mutex;

struct PendingDeepLink(Mutex<Option<String>>);

#[tauri::command]
fn get_pending_deep_link(state: tauri::State<PendingDeepLink>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PendingDeepLink(Mutex::new(None)))
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::Manager;
            use tauri::Emitter;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
                
                // Pass deep link to the already-running webview via safe Tauri event
                for arg in args {
                    if arg.starts_with("melofy://") {
                        let _ = window.emit("melofy-deep-link", arg);
                    }
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ── Deep Link: handle URLs that arrived before the app was ready ───
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                use tauri::Manager;
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Ok(Some(urls)) = app.deep_link().get_current() {
                    for url in urls {
                        println!("[Melofy] Deep link received on startup: {}", url);
                        // Save the URL in state so the frontend can retrieve it once fully loaded
                        let state = app.state::<PendingDeepLink>();
                        *state.0.lock().unwrap() = Some(url.to_string());
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_pending_deep_link])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
