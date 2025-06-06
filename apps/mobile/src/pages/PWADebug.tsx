import React, { useEffect, useState } from 'react';

const PWADebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkPWA = async () => {
      const info: any = {
        https: window.location.protocol === 'https:',
        serviceWorker: 'serviceWorker' in navigator,
        manifest: false,
        beforeInstallPrompt: false,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        iosStandalone: (window.navigator as any).standalone || false,
      };

      // Manifest check
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        info.manifest = true;
        info.manifestHref = manifestLink.getAttribute('href');
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
        }));
      }

      setDebugInfo(info);
    };

    checkPWA();

    // beforeinstallprompt listener
    const handleBeforeInstallPrompt = () => {
      setDebugInfo((prev: any) => ({ ...prev, beforeInstallPrompt: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h2>PWA Debug Info</h2>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
};

export default PWADebug;