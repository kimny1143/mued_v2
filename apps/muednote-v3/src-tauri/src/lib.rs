use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager, Emitter};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

// グローバルDBプール
static DB_POOL: OnceLock<PgPool> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize)]
pub struct Fragment {
    id: String,
    content: String,
    timestamp: u64,
    processed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChatMessage {
    id: String,
    session_id: String,
    role: String,
    content: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

// メッセージ取得コマンド - chat_messagesテーブルから
#[tauri::command]
async fn fetch_messages() -> Result<Vec<ChatMessage>, String> {
    let pool = DB_POOL.get().ok_or("Database not initialized")?;

    let messages = sqlx::query_as::<_, ChatMessage>(
        r#"
        SELECT
            id::text as id,
            session_id::text as session_id,
            role,
            content,
            created_at
        FROM chat_messages
        ORDER BY created_at DESC
        LIMIT 50
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(messages)
}

// Fragment処理コマンド - chat_sessionsとchat_messagesに保存
#[tauri::command]
async fn process_fragment(fragment: Fragment) -> Result<Fragment, String> {
    let start = SystemTime::now();
    let pool = DB_POOL.get().ok_or("Database not initialized")?;

    // タイトルを生成（最初の50文字または全文）- UTF-8対応
    let title: String = fragment.content.chars().take(50).collect();
    let title = if fragment.content.chars().count() > 50 {
        format!("{}...", title)
    } else {
        title.clone()
    };

    // 1. アクティブなセッションを取得、なければ作成
    let session_id: String = sqlx::query_scalar(
        r#"
        WITH active_session AS (
            SELECT id FROM chat_sessions
            WHERE device_id = 'default' AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
        ),
        new_session AS (
            INSERT INTO chat_sessions (device_id, title, is_active, last_message_at)
            SELECT 'default', $1, true, NOW()
            WHERE NOT EXISTS (SELECT 1 FROM active_session)
            RETURNING id
        )
        SELECT COALESCE(
            (SELECT id::text FROM active_session),
            (SELECT id::text FROM new_session)
        )
        "#
    )
    .bind(&title)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to get/create session: {}", e))?;

    // 2. chat_messagesにINSERT
    let result = sqlx::query(
        r#"
        INSERT INTO chat_messages (session_id, role, content)
        VALUES ($1::uuid, 'user', $2)
        "#
    )
    .bind(&session_id)
    .bind(&fragment.content)
    .execute(pool)
    .await;

    // 3. セッションのlast_message_atを更新
    if result.is_ok() {
        let _ = sqlx::query(
            r#"
            UPDATE chat_sessions
            SET last_message_at = NOW(), title = COALESCE(title, $2)
            WHERE id = $1::uuid
            "#
        )
        .bind(&session_id)
        .bind(&title)
        .execute(pool)
        .await;
    }

    match &result {
        Ok(_) => eprintln!("✅ Message saved to session {}: {}", &session_id, &title),
        Err(e) => eprintln!("❌ Failed to save message: {}", e),
    }

    result.map_err(|e| format!("Failed to save message: {}", e))?;

    let mut processed = fragment;
    processed.processed = Some(true);

    let elapsed = start.elapsed().map_err(|e| e.to_string())?;
    if elapsed.as_millis() > 500 {
        eprintln!("Warning: Fragment processing took {}ms", elapsed.as_millis());
    }

    Ok(processed)
}

// メッセージ削除コマンド
#[tauri::command]
async fn delete_message(message_id: String) -> Result<(), String> {
    let pool = DB_POOL.get().ok_or("Database not initialized")?;

    let result = sqlx::query(
        r#"
        DELETE FROM chat_messages
        WHERE id = $1::uuid
        "#
    )
    .bind(&message_id)
    .execute(pool)
    .await;

    match &result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                eprintln!("🗑️ Message deleted: {}", &message_id);
            } else {
                eprintln!("⚠️ Message not found: {}", &message_id);
            }
        }
        Err(e) => eprintln!("❌ Failed to delete message: {}", e),
    }

    result.map_err(|e| format!("Failed to delete message: {}", e))?;
    Ok(())
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

    // Load DATABASE_URL from env - muednote-v3/.env.local
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let env_file = manifest_dir.join("..").join(".env.local");
    let env_file = env_file.canonicalize().unwrap_or(env_file);
    eprintln!("📂 Loading env from: {:?}", env_file);
    if let Err(e) = dotenvy::from_path(&env_file) {
        eprintln!("⚠️ Failed to load .env.local: {}", e);
    }

    let db_url = std::env::var("MUEDNOTE_DATABASE_URL")
        .unwrap_or_else(|_| {
            eprintln!("⚠️ MUEDNOTE_DATABASE_URL not found, using default");
            "postgres://localhost/muednote".to_string()
        });
    eprintln!("🔗 Database URL: {}...", &db_url[..50.min(db_url.len())]);

    // Initialize database pool with timeout
    let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
    rt.block_on(async {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(30))
            .connect(&db_url)
            .await
            .expect("Failed to connect to database");
        DB_POOL.set(pool).expect("Failed to set pool");
        eprintln!("✅ Database connected");
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // グローバルホットキーを登録 (Cmd+Shift+Space)
            let app_handle = app.handle().clone();

            app.handle().global_shortcut().on_shortcut("CmdOrCtrl+Shift+Space", move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Err(e) = app_handle.emit("toggle-console", ()) {
                        eprintln!("Failed to emit toggle-console event: {}", e);
                    }
                }
            })?;

            // ダッシュボード表示用ショートカット (Cmd+Shift+D)
            let app_handle_dashboard = app.handle().clone();
            app.handle().global_shortcut().on_shortcut("CmdOrCtrl+Shift+D", move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Err(e) = app_handle_dashboard.emit("toggle-dashboard", ()) {
                        eprintln!("Failed to emit toggle-dashboard event: {}", e);
                    }
                }
            })?;

            // メインウィンドウ設定
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_messages,
            process_fragment,
            delete_message,
            toggle_visibility,
            show_overlay,
            hide_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
