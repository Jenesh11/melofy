fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["greet", "update_discord_presence", "clear_discord_presence"])),
    )
    .unwrap();
}
