import React, { useEffect, useState } from 'react';

interface PWARequirement {
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'checking';
  details?: string;
}

const PWADebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [requirements, setRequirements] = useState<PWARequirement[]>([]);
  const [manifestData, setManifestData] = useState<any>(null);
  const [beforeInstallPromptEvent, setBeforeInstallPromptEvent] = useState<any>(null);
  const [engagementScore, setEngagementScore] = useState(0);
  const [showManualInstall, setShowManualInstall] = useState(false);

  useEffect(() => {
    const checkPWA = async () => {
      const info: any = {
        // Environment
        environment: {
          nodeEnv: process.env.NODE_ENV,
          reactAppEnv: process.env.REACT_APP_ENV,
          publicUrl: process.env.PUBLIC_URL || '/',
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
        // Basic checks
        url: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        https: window.location.protocol === 'https:',
        serviceWorker: 'serviceWorker' in navigator,
        manifest: false,
        beforeInstallPrompt: false,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        iosStandalone: (window.navigator as any).standalone || false,
        // Browser detection
        browser: {
          isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
          isEdge: /Edg/.test(navigator.userAgent),
          isFirefox: /Firefox/.test(navigator.userAgent),
          isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
          isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
          isAndroid: /Android/.test(navigator.userAgent),
        },
      };

      // Manifest check
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        info.manifest = true;
        info.manifestHref = manifestLink.getAttribute('href');
        
        // Fetch and parse manifest
        try {
          const response = await fetch(info.manifestHref);
          const manifest = await response.json();
          setManifestData(manifest);
          info.manifestContent = manifest;
        } catch (error) {
          info.manifestError = error instanceof Error ? error.message : String(error);
        }
      }

      // Service Worker registration check
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        info.serviceWorkerRegistrations = registrations.length;
        info.serviceWorkerDetails = registrations.map(reg => ({
          scope: reg.scope,
          active: reg.active?.state,
          waiting: reg.waiting?.state,
          installing: reg.installing?.state,
          scriptURL: reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL,
        }));

        // Check if service worker is ready
        try {
          const ready = await navigator.serviceWorker.ready;
          info.serviceWorkerReady = true;
          info.serviceWorkerReadyScope = ready.scope;
        } catch (error) {
          info.serviceWorkerReady = false;
          info.serviceWorkerError = error instanceof Error ? error.message : String(error);
        }
      }

      setDebugInfo(info);
      checkRequirements(info, info.manifestContent || manifestData);
    };

    const checkRequirements = (info: any, manifest: any) => {
      const reqs: PWARequirement[] = [
        {
          name: 'HTTPS Connection',
          description: 'Site must be served over HTTPS',
          status: info.https ? 'pass' : 'fail',
          details: `Protocol: ${info.protocol}`,
        },
        {
          name: 'Service Worker Support',
          description: 'Browser must support Service Workers',
          status: info.serviceWorker ? 'pass' : 'fail',
        },
        {
          name: 'Service Worker Registration',
          description: 'Service Worker must be registered',
          status: info.serviceWorkerRegistrations > 0 ? 'pass' : 'fail',
          details: `Registrations: ${info.serviceWorkerRegistrations}`,
        },
        {
          name: 'Manifest File',
          description: 'Valid manifest.json must be linked',
          status: info.manifest ? 'pass' : 'fail',
          details: info.manifestHref,
        },
        {
          name: 'Manifest start_url',
          description: 'Manifest must have valid start_url',
          status: manifest?.start_url ? (manifest.start_url === '/' || manifest.start_url === './' ? 'pass' : 'warning') : 'fail',
          details: `start_url: ${manifest?.start_url || 'not set'}`,
        },
        {
          name: 'Manifest display mode',
          description: 'Display must be standalone, fullscreen, or minimal-ui',
          status: ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest?.display) ? 'pass' : 'fail',
          details: `display: ${manifest?.display || 'not set'}`,
        },
        {
          name: 'Icons',
          description: 'Must have 192x192 and 512x512 icons',
          status: checkIcons(manifest) ? 'pass' : 'fail',
          details: `Icons: ${manifest?.icons?.length || 0}`,
        },
        {
          name: 'Name and short_name',
          description: 'Must have name or short_name',
          status: (manifest?.name || manifest?.short_name) ? 'pass' : 'fail',
        },
        {
          name: 'beforeinstallprompt Event',
          description: 'Browser must fire beforeinstallprompt event',
          status: info.beforeInstallPrompt ? 'pass' : 'warning',
          details: 'Waiting for event...',
        },
      ];

      setRequirements(reqs);
    };

    const checkIcons = (manifest: any): boolean => {
      if (!manifest?.icons || !Array.isArray(manifest.icons)) return false;
      
      const has192 = manifest.icons.some((icon: any) => 
        icon.sizes?.includes('192x192')
      );
      const has512 = manifest.icons.some((icon: any) => 
        icon.sizes?.includes('512x512')
      );
      
      return has192 && has512;
    };

    checkPWA();

    // beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired!', e);
      setBeforeInstallPromptEvent(e);
      setDebugInfo((prev: any) => ({ 
        ...prev, 
        beforeInstallPrompt: true,
        beforeInstallPromptTime: new Date().toISOString(),
      }));
      setRequirements(prev => 
        prev.map(req => 
          req.name === 'beforeinstallprompt Event' 
            ? { ...req, status: 'pass', details: 'Event fired!' }
            : req
        )
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Engagement tracking
    const engagementInterval = setInterval(() => {
      setEngagementScore(prev => prev + 1);
    }, 1000);

    // Track clicks
    const handleClick = () => {
      setEngagementScore(prev => prev + 5);
    };
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(engagementInterval);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const triggerInstall = async () => {
    if (!beforeInstallPromptEvent) {
      alert('No install prompt available');
      return;
    }

    try {
      beforeInstallPromptEvent.preventDefault();
      beforeInstallPromptEvent.prompt();
      const { outcome } = await beforeInstallPromptEvent.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      alert(`Install outcome: ${outcome}`);
    } catch (error) {
      console.error('Install error:', error);
      alert(`Install error: ${error}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#4CAF50';
      case 'fail': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>PWA Debug Info</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Quick Actions</h2>
        <button 
          onClick={triggerInstall}
          disabled={!beforeInstallPromptEvent}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: beforeInstallPromptEvent ? '#1e40af' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: beforeInstallPromptEvent ? 'pointer' : 'not-allowed',
            marginRight: '10px',
          }}
        >
          {beforeInstallPromptEvent ? 'Trigger Install' : 'Install not available'}
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Reload Page
        </button>
        <button 
          onClick={() => setShowManualInstall(!showManualInstall)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showManualInstall ? '閉じる' : '手動インストール方法'}
        </button>
      </div>

      {!beforeInstallPromptEvent && (
        <div style={{ 
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #F59E0B',
        }}>
          <h3 style={{ marginTop: 0, color: '#92400E' }}>⚠️ beforeinstallprompt イベントが発火していません</h3>
          
          <div style={{ 
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#FFF',
            borderRadius: '4px',
          }}>
            <strong>エンゲージメントスコア: {engagementScore}</strong>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              (時間経過: +1/秒, クリック: +5/回)
            </div>
          </div>

          <h4 style={{ color: '#92400E', marginTop: '20px' }}>🎯 最も簡単な方法：モバイルデバイスで確認</h4>
          <div style={{ 
            padding: '15px',
            backgroundColor: '#DBEAFE',
            borderRadius: '4px',
            marginBottom: '20px',
          }}>
            <p style={{ marginTop: 0, color: '#1E40AF' }}><strong>スマートフォンでこのURLを開いてください：</strong></p>
            <code style={{ 
              display: 'block',
              padding: '10px',
              backgroundColor: '#FFF',
              borderRadius: '4px',
              marginBottom: '10px',
              wordBreak: 'break-all',
            }}>
              https://mued-pwa-git-develop-glasswerks.vercel.app
            </code>
            <p style={{ marginBottom: 0, color: '#1E40AF', fontSize: '14px' }}>
              モバイルブラウザ（Chrome/Safari）でアクセスすると、インストールプロンプトが表示されやすくなります。
            </p>
          </div>

          <h4 style={{ color: '#92400E' }}>💻 PC Chromeでの手動インストール方法</h4>
          <ol style={{ color: '#92400E' }}>
            <li><strong>Chrome DevToolsを開く</strong>（F12キー または 右クリック→検証）</li>
            <li><strong>「Application」タブ</strong>をクリック</li>
            <li>左メニューの<strong>「Manifest」</strong>をクリック</li>
            <li>右側に表示される<strong>「Install」ボタン</strong>をクリック</li>
          </ol>

          <h4 style={{ color: '#92400E' }}>🔄 それでもダメな場合</h4>
          <ol style={{ color: '#92400E' }}>
            <li><strong>シークレットモード</strong>で試す（Ctrl+Shift+N）</li>
            <li><strong>Microsoft Edge</strong>で試す（ChromeよりPWAインストールが積極的）</li>
            <li><strong>アドレスバーの右端</strong>にインストールアイコン（⊕）が表示されているか確認</li>
          </ol>
        </div>
      )}

      {showManualInstall && (
        <div style={{ 
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#F0FDF4',
          borderRadius: '8px',
          border: '1px solid #10B981',
        }}>
          <h3 style={{ marginTop: 0, color: '#065F46' }}>📱 デバイス別インストール方法</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#065F46' }}>iOS Safari</h4>
            <ol style={{ color: '#065F46' }}>
              <li>Safariで開く（Chrome不可）</li>
              <li>下部の共有ボタン <span style={{ fontSize: '20px' }}>⬆️</span> をタップ</li>
              <li>「ホーム画面に追加」を選択</li>
              <li>名前を確認して「追加」をタップ</li>
            </ol>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#065F46' }}>Android Chrome</h4>
            <ol style={{ color: '#065F46' }}>
              <li>メニュー（縦3点）をタップ</li>
              <li>「ホーム画面に追加」または「アプリをインストール」を選択</li>
              <li>プロンプトで「インストール」をタップ</li>
            </ol>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#065F46' }}>PC Chrome/Edge</h4>
            <ol style={{ color: '#065F46' }}>
              <li>アドレスバー右端のインストールアイコンを探す</li>
              <li>または、メニュー → 「〇〇をインストール」を選択</li>
              <li>DevTools: F12 → Application → Manifest → Install</li>
            </ol>
          </div>

          <div style={{ 
            padding: '10px',
            backgroundColor: '#FEFCE8',
            borderRadius: '4px',
            marginTop: '15px',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#713F12' }}>
              💡 <strong>ヒント:</strong> インストールボタンが表示されない場合は、
              シークレット/プライベートモードで試すか、ブラウザのキャッシュをクリアしてください。
            </p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>PWA Requirements Checklist</h2>
        {requirements.map((req, index) => (
          <div key={index} style={{ 
            padding: '10px',
            marginBottom: '5px',
            backgroundColor: '#f5f5f5',
            borderLeft: `4px solid ${getStatusColor(req.status)}`,
          }}>
            <div style={{ fontWeight: 'bold', color: getStatusColor(req.status) }}>
              {req.status === 'pass' ? '✓' : req.status === 'fail' ? '✗' : '⚠'} {req.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>{req.description}</div>
            {req.details && (
              <div style={{ fontSize: '12px', marginTop: '4px', fontFamily: 'monospace' }}>
                {req.details}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Manifest Data</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '12px',
        }}>
          {manifestData ? JSON.stringify(manifestData, null, 2) : 'Loading...'}
        </pre>
      </div>

      <div>
        <h2>Debug Info</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '12px',
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PWADebug;