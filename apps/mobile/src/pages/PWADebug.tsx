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
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
          }}
        >
          {beforeInstallPromptEvent ? 'Trigger Install' : 'Install not available'}
        </button>
      </div>

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