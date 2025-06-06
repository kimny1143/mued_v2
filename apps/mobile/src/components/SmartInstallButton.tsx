import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const SmartInstallButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // デバイス検出
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // インストール済みチェック
    const isStandalone = (window.navigator as any).standalone || 
                        window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Chrome/Edge用のインストールプロンプト
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOSの場合はガイドを表示
      setShowIOSGuide(true);
    } else if (installPrompt) {
      // Chrome/Edgeの場合は直接インストール
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.error('インストールエラー:', error);
      }
    }
  };

  // 既にインストール済みの場合は表示しない
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#1e40af',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '50px',
          border: 'none',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 999,
        }}
      >
        <span style={{ fontSize: '20px' }}>📱</span>
        アプリとして使う
      </button>

      {/* iOSガイドモーダル */}
      {showIOSGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 1001,
        }}
        onClick={() => setShowIOSGuide(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              width: '100%',
              padding: '30px 20px',
              borderRadius: '20px 20px 0 0',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>
              かんたん2ステップ！
            </h2>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '30px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '15px',
                backgroundColor: '#f3f4f6',
                borderRadius: '10px',
              }}>
                <div style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    画面下の共有ボタンをタップ
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    <span style={{ fontSize: '24px' }}>⬆️</span> こんなマークです
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '15px',
                backgroundColor: '#f3f4f6',
                borderRadius: '10px',
              }}>
                <div style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    「ホーム画面に追加」をタップ
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    アプリのように使えるようになります！
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              わかった！
            </button>
          </div>
        </div>
      )}
    </>
  );
};