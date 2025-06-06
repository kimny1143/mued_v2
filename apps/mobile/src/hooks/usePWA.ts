import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    console.log('PWA Hook initialized');
    
    // PWAがインストール済みかチェック
    const checkInstallation = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('PWA is running in standalone mode');
        setIsInstalled(true);
        return;
      }
      
      // iOS Safari
      if ((window.navigator as any).standalone) {
        console.log('PWA is running in iOS standalone mode');
        setIsInstalled(true);
        return;
      }
      
      console.log('PWA is not installed');
    };

    checkInstallation();

    // インストールプロンプトのイベントリスナー
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('PWA install prompt captured');
    };

    // インストール成功のイベントリスナー
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!installPrompt) {
      console.log('Install prompt not available');
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
        setInstallPrompt(null);
        return true;
      } else {
        console.log('PWA installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  return {
    isInstalled,
    isInstallable,
    installPWA,
  };
};