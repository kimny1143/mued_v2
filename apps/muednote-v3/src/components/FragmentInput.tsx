import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tauriInvoke, tauriListen } from '../utils/tauri';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface Fragment {
  id: string;
  content: string;
  timestamp: number;
  processed?: boolean;
}

export const FragmentInput: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true); // デバッグのため初期表示をtrueに
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // グローバルホットキーのイベントをリッスン
  useEffect(() => {
    const unlistenPromise = tauriListen('toggle-console', () => {
      setIsVisible(prev => !prev);
      if (!isVisible) {
        // 表示する際は自動的にinputにフォーカス
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    });

    return () => {
      unlistenPromise.then(fn => fn());
    };
  }, [isVisible]);

  // inputが表示されたら自動フォーカス
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Fragment送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    setIsProcessing(true);

    try {
      // Fragmentオブジェクトを作成
      const fragment: Fragment = {
        id: `fragment-${Date.now()}`,
        content: inputValue.trim(),
        timestamp: Date.now(),
      };

      // Rust側のprocess_fragmentを呼び出し
      const processed = await tauriInvoke('process_fragment', { fragment }) as Fragment | null;
      console.log('Fragment processed:', processed);

      // 入力をクリア
      setInputValue('');

      // 500ms後に自動的に隠す
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 500);

    } catch (error) {
      console.error('Failed to process fragment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ESCキーで閉じる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
      setInputValue('');
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="overlay-window"
        >
          <div className="overlay-container">
            {/* ドラッグ領域 - ウィンドウを移動可能にする */}
            <div
              onMouseDown={() => getCurrentWindow().startDragging()}
              className="absolute top-0 left-0 right-0 h-8 cursor-move flex items-center justify-center rounded-t-xl z-10"
            >
              <div className="w-16 h-1.5 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
            </div>
            <form onSubmit={handleSubmit} className="h-full flex items-center p-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="思いついたことを入力..."
                className="fragment-input"
                disabled={isProcessing}
                autoFocus
              />
              {isProcessing && (
                <div className="ml-4">
                  <div className="animate-spin h-5 w-5 border-2 border-muednote-accent border-t-transparent rounded-full" />
                </div>
              )}
            </form>
          </div>

          {/* 下部にヒント表示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muednote-muted text-sm"
          >
            <span className="opacity-60">
              Enter: 保存 | Esc: キャンセル
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};