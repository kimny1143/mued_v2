import React, { useState, useEffect } from 'react';

export const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // iOS検出
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // スタンドアロンモード検出（既にインストール済み）
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    setIsInStandaloneMode(isStandalone);

    // iOSかつ未インストールの場合のみ表示
    if (isIOSDevice && !isStandalone) {
      // 初回訪問または前回の表示から24時間経過していたら表示
      const lastPromptTime = localStorage.getItem('iosInstallPromptTime');
      const now = Date.now();
      
      if (!lastPromptTime || now - parseInt(lastPromptTime) > 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    }
  }, []);

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('iosInstallPromptTime', Date.now().toString());
  };

  if (!isIOS || isInStandaloneMode || !showPrompt) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e40af',
      color: 'white',
      padding: '20px',
      boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out',
    }}>
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            ホーム画面に追加して快適に使おう！
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            fontSize: '16px',
            marginTop: '15px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>1️⃣</span>
              <span style={{ fontSize: '24px' }}>⬇️</span>
              <span>下の共有ボタン</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>2️⃣</span>
              <span style={{ 
                padding: '2px 8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                fontSize: '14px',
              }}>
                ホーム画面に追加
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            marginLeft: '10px',
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        opacity: 0.8,
      }}>
        ※ アプリのように全画面で使えるようになります
      </div>
    </div>
  );
};