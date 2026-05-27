// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use tauri::Manager;

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

pub struct TrayState {
    pub minimize_to_tray: tauri::menu::CheckMenuItem<tauri::Wry>,
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
            // 1. Create the system tray menu items
            let toggle_minimize = tauri::menu::CheckMenuItem::with_id(
                app,
                "toggle_minimize",
                "Minimize to System Tray",
                true, // enabled
                true, // checked by default
                None::<&str>
            ).expect("failed to create check menu item");

            let exit_item = tauri::menu::MenuItem::with_id(
                app,
                "exit",
                "Exit",
                true, // enabled
                None::<&str>
            ).expect("failed to create exit menu item");

            // 2. Create the menu
            let menu = tauri::menu::Menu::new(app).expect("failed to create tray menu");
            let _ = menu.append(&toggle_minimize);
            let _ = menu.append(&exit_item);

            // 3. Build the Tray Icon
            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)
                .expect("failed to build tray icon");

            // 4. Manage the tray state so it's accessible in window events
            app.manage(TrayState {
                minimize_to_tray: toggle_minimize,
            });

            // ── Deep Link: handle URLs that arrived before the app was ready ───
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Ok(Some(urls)) = app.deep_link().get_current() {
                    for url in urls {
                        println!("[Melofy] Deep link received on startup: {}", url);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval(&format!(
                                r#"window.__MELOFY_PENDING_DEEP_LINK = "{}";"#,
                                url.as_str().replace('"', r#"\""#)
                            ));
                        }
                    }
                }
            }

            // ── Reconnectivity check: redirect to offline screen if remote server is unreachable ──
            {
                use std::net::ToSocketAddrs;
                let is_reachable = if let Ok(addrs) = "melofy.jene.in:443".to_socket_addrs() {
                    let addr_list: Vec<_> = addrs.collect();
                    if !addr_list.is_empty() {
                        std::net::TcpStream::connect_timeout(&addr_list[0], std::time::Duration::from_millis(1500)).is_ok()
                    } else {
                        false
                    }
                } else {
                    false
                };

                if !is_reachable {
                    println!("[Melofy] Live site melofy.jene.in is unreachable. Loading local offline screen.");
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(resource_path) = app.path().resolve("src/offline.html", tauri::path::BaseDirectory::Resource) {
                            if let Ok(file_url) = tauri::Url::from_file_path(resource_path) {
                                let _ = window.navigate(file_url);
                            }
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
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "exit" {
                app.exit(0);
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let app = window.app_handle();
                    let state = app.state::<TrayState>();
                    if state.minimize_to_tray.is_checked().unwrap_or(true) {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        app.exit(0);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
