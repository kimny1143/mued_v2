import React, { useEffect, useState } from 'react';

export const PWAPrompt: React.FC = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // iOSでSafariの場合
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      // Safariかどうかをチェック
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        setShowIOSPrompt(true);
      }
    }
  }, []);

  if (!showIOSPrompt) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      backgroundColor: '#1e40af',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      lineHeight: '1.5',
      zIndex: 1000,
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        ホーム画面に追加
      </div>
      <div style={{ marginBottom: '12px' }}>
        1. 下部の共有ボタン
        <span style={{ display: 'inline-block', margin: '0 4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}>
            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        をタップ
      </div>
      <div>
        2. 「ホーム画面に追加」を選択
      </div>
      <button
        onClick={() => setShowIOSPrompt(false)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        ×
      </button>
    </div>
  );
};