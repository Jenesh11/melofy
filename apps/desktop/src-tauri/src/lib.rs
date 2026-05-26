// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                // Bring the existing app instance to the front
                let _ = window.show();
                let _ = window.set_focus();
                
                // Forward the deep link to the JS frontend
                for arg in args {
                    if arg.starts_with("melofy://") {
                        let _ = window.eval(&format!(
                            r#"if (window.__handleDeepLinkUrl) {{ window.__handleDeepLinkUrl("{}"); }} else {{ window.__MELOFY_PENDING_DEEP_LINK = "{}"; }}"#,
                            arg.as_str().replace('"', r#"\""#),
                            arg.as_str().replace('"', r#"\""#)
                        ));
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
                        // Inject the pending URL into the WebView's JS context
                        // so the auth-context listener can pick it up.
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval(&format!(
                                r#"window.__MELOFY_PENDING_DEEP_LINK = "{}";"#,
                                url.as_str().replace('"', r#"\""#)
                            ));
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
