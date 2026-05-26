// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

pub struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
}

impl DiscordState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn update_discord_presence(
    state: tauri::State<'_, DiscordState>,
    title: String,
    artist: String,
    artwork_url: Option<String>,
    duration: Option<u64>,
    progress: Option<u64>,
    is_playing: bool,
    party_id: Option<String>,
) -> Result<(), String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;

    // Attempt to connect if not already connected
    if client_guard.is_none() {
        let mut client = DiscordIpcClient::new("1480090164213846238");
        if client.connect().is_ok() {
            *client_guard = Some(client);
        } else {
            println!("[DiscordRPC] Failed to connect to Discord client (is Discord open?)");
        }
    }

    if let Some(client) = client_guard.as_mut() {
        let details_str = if is_playing {
            title.clone()
        } else {
            format!("{} (Paused)", title)
        };

        let mut payload = activity::Activity::new()
            .details(&details_str)
            .state(&artist);

        let mut assets = activity::Assets::new();
        if let Some(ref url) = artwork_url {
            if !url.is_empty() {
                assets = assets.large_image(url);
            }
        }
        assets = assets.large_text(&title);
        payload = payload.assets(assets);

        if is_playing {
            if let (Some(dur), Some(prog)) = (duration, progress) {
                let current_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                let prog_secs = prog / 1000;
                let dur_secs = dur / 1000;

                let start_time = current_time.saturating_sub(prog_secs);
                let end_time = start_time + dur_secs;

                payload = payload.timestamps(activity::Timestamps::new()
                    .start(start_time as i64)
                    .end(end_time as i64)
                );
            }
        }

        let mut buttons = Vec::new();
        let join_url = party_id
            .as_ref()
            .filter(|id| !id.is_empty())
            .map(|id| format!("https://melofy.jene.in/listen/{}", id))
            .unwrap_or_default();

        if !join_url.is_empty() {
            buttons.push(activity::Button::new(
                "Join Jam",
                &join_url,
            ));
        }

        // If not in a jam, add a fallback "Open Melofy" button (Tauri App exclusive)
        if buttons.is_empty() {
            buttons.push(activity::Button::new(
                "Open Melofy",
                "https://melofy.jene.in",
            ));
        }

        if !buttons.is_empty() {
            payload = payload.buttons(buttons);
        }

        if let Err(e) = client.set_activity(payload) {
            println!("[DiscordRPC] Failed to set activity: {:?}", e);
            // Connection might have dropped, clear it so next update attempts reconnection
            *client_guard = None;
            return Err(e.to_string());
        }
    } else {
        return Err("Discord client not connected".to_string());
    }

    Ok(())
}

#[tauri::command]
fn clear_discord_presence(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;
    if let Some(client) = client_guard.as_mut() {
        if let Err(e) = client.clear_activity() {
            println!("[DiscordRPC] Failed to clear activity: {:?}", e);
            *client_guard = None;
            return Err(e.to_string());
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
mod win32 {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;

    #[link(name = "shell32")]
    extern "system" {
        fn SetCurrentProcessExplicitAppUserModelID(appID: *const u16) -> i32;
    }

    pub fn set_aumid() {
        let app_id = OsStr::new("com.melofy.desktop")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>();

        unsafe {
            let res = SetCurrentProcessExplicitAppUserModelID(app_id.as_ptr());
            if res != 0 {
                println!("[Melofy] Warning: Failed to set AppUserModelID, HRESULT: {}", res);
            } else {
                println!("[Melofy] Successfully set AppUserModelID to com.melofy.desktop");
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    win32::set_aumid();

    tauri::Builder::default()
        .manage(DiscordState::new())
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
        .plugin(tauri_plugin_taskbar::init())
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
        .invoke_handler(tauri::generate_handler![
            greet,
            update_discord_presence,
            clear_discord_presence
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
