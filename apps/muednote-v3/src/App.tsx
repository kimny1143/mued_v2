import { useState, useEffect } from 'react';
import { FragmentInput } from './components/FragmentInput';
import { tauriListen, tauriInvoke } from './utils/tauri';
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window';
import './index.css';

// ウィンドウサイズ定数
const CONSOLE_SIZE = { width: 620, height: 140 };
const DASHBOARD_SIZE = { width: 800, height: 600 };

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ウィンドウサイズを変更する関数
  const resizeWindow = async (isDashboard: boolean) => {
    const win = getCurrentWindow();
    const size = isDashboard ? DASHBOARD_SIZE : CONSOLE_SIZE;
    try {
      await win.setSize(new PhysicalSize(size.width, size.height));
    } catch (error) {
      console.error('Failed to resize window:', error);
    }
  };

  useEffect(() => {
    // Load saved messages on app start
    loadMessages();

    // Listen for dashboard toggle
    const unlistenPromise = tauriListen('toggle-dashboard', async () => {
      setShowDashboard(prev => {
        const newValue = !prev;
        // ウィンドウサイズを変更
        resizeWindow(newValue);
        // ダッシュボード表示時にメッセージを再読み込み
        if (newValue) {
          loadMessages();
        }
        return newValue;
      });
    });

    return () => {
      unlistenPromise.then(fn => fn());
    };
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch messages from Rust backend
      const result = await tauriInvoke<ChatMessage[]>('fetch_messages');
      setMessages(result);
      console.log('Loaded messages:', result.length);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await tauriInvoke('delete_message', { messageId });
      // 削除後にリストを更新
      setMessages(prev => prev.filter(m => m.id !== messageId));
      console.log('Deleted message:', messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Fragment Input Overlay */}
      <FragmentInput />

      {/* Dashboard (future implementation) */}
      {showDashboard && (
        <div className="fixed inset-0 backdrop-blur-lg z-50 flex flex-col" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
          {/* ドラッグ領域 - ダッシュボードモード用 */}
          <div
            onMouseDown={() => getCurrentWindow().startDragging()}
            className="flex-shrink-0 h-8 cursor-move flex items-center justify-center"
          >
            <div className="w-16 h-1.5 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-muednote-text">
                MUEDnote v3
              </h1>
              <button
                onClick={() => {
                  setShowDashboard(false);
                  resizeWindow(false);
                }}
                className="text-muednote-muted hover:text-muednote-text transition-colors text-sm"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muednote-muted text-lg">読み込み中...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-muednote-error text-lg">エラー: {error}</p>
                  <button
                    onClick={loadMessages}
                    className="mt-4 px-4 py-2 bg-muednote-accent text-white rounded"
                  >
                    再試行
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muednote-muted text-lg">
                    まだメッセージがありません
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'rgba(138, 138, 138, 0.6)' }}>
                    Cmd+Shift+Space でConsoleを開いて入力してみてください
                  </p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className="p-4 bg-muednote-secondary rounded-lg border border-muednote-secondary hover:border-muednote-accent transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: message.role === 'user' ? 'rgba(74, 144, 226, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: message.role === 'user' ? '#4a90e2' : '#10b981'
                        }}
                      >
                        {message.role === 'user' ? 'あなた' : 'AI'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muednote-muted">
                          {new Date(message.created_at).toLocaleString('ja-JP')}
                        </span>
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded hover:bg-red-500/20 text-red-400"
                          title="削除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="text-muednote-text whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;