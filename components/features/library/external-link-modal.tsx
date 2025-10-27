'use client';

/**
 * External Link Modal
 * 外部リンクモーダル
 *
 * Brand boundary warning modal for external content
 */

import { useState } from 'react';

interface ExternalLinkModalProps {
  url: string;
  sourceName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExternalLinkModal({
  url,
  sourceName,
  isOpen,
  onClose,
  onConfirm,
}: ExternalLinkModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dontShowAgain) {
      // Store preference in localStorage
      localStorage.setItem('mued_skip_external_warning', 'true');
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mx-auto mb-4">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          外部サイトへ移動します
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 text-center mb-4">
          {sourceName}（外部サイト）に移動しようとしています。
          <br />
          MUEDを離れて続けますか？
        </p>

        {/* URL Display */}
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">移動先:</p>
          <p className="text-xs text-gray-700 break-all font-mono">{url}</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-xs text-blue-800">
            ⚠️ 外部サイトのコンテンツはMUEDが管理しているものではありません。
            コンテンツの品質や安全性については、提供元のポリシーに従います。
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="mt-1 mr-2"
          />
          <span className="text-sm text-gray-700">
            今後この警告を表示しない
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] text-white rounded-md font-medium transition-colors"
          >
            続ける
          </button>
        </div>
      </div>
    </div>
  );
}
