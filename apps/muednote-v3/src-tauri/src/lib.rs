use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use tauri::{AppHandle, Manager, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct Fragment {
    id: String,
    content: String,
    timestamp: u64,
    processed: Option<bool>,
}

// Fragment処理コマンド
#[tauri::command]
async fn process_fragment(fragment: Fragment) -> Result<Fragment, String> {
    // ここで実際のFragment処理を実装
    // 今回は500ms以内の処理をシミュレート
    let start = SystemTime::now();

    // TODO: 実際の処理ロジック
    // - 自然言語処理
    // - カテゴライズ
    // - インデックス作成
    // - ベクトル化

    // 処理済みのFragmentを返す
    let mut processed = fragment;
    processed.processed = Some(true);

    // レイテンシチェック
    let elapsed = start.elapsed().map_err(|e| e.to_string())?;
    if elapsed.as_millis() > 500 {
        eprintln!("Warning: Fragment processing took {}ms", elapsed.as_millis());
    }

    Ok(processed)
}

// アプリの表示/非表示を切り替える
#[tauri::command]
async fn toggle_visibility(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible().map_err(|e| e.to_string())? {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// オーバーレイウィンドウを表示
#[tauri::command]
async fn show_overlay(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// オーバーレイウィンドウを隠す
#[tauri::command]
async fn hide_overlay(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // グローバルホットキーを登録 (Cmd+Shift+Space)
            let app_handle = app.handle().clone();

            app.handle().global_shortcut().on_shortcut("CmdOrCtrl+Shift+Space", move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    // toggle-consoleイベントをフロントエンドに送信
                    if let Err(e) = app_handle.emit("toggle-console", ()) {
                        eprintln!("Failed to emit toggle-console event: {}", e);
                    }
                }
            })?;

            // メインウィンドウ設定
            if let Some(window) = app.get_webview_window("main") {
                // 初期状態では表示
                window.show().unwrap();
                window.set_focus().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            process_fragment,
            toggle_visibility,
            show_overlay,
            hide_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}