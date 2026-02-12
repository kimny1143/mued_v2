'use client';

import { useState, useEffect, useCallback } from 'react';

const DISMISSED_KEY = 'muedlobe-pwa-dismissed';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check dismissed state
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    // Detect platform
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
    const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    setIsIOS(ios);
    setIsIOSSafari(ios && safari);
    setIsMobile(mobile);

    // Listen for beforeinstallprompt (Android Chrome / Edge)
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const canInstallNative = deferredPrompt !== null;

  // Show banner on any mobile browser that isn't already standalone
  const shouldShowBanner =
    !isStandalone && !isDismissed && (canInstallNative || isMobile);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  }, []);

  return {
    shouldShowBanner,
    canInstallNative,
    isIOS,
    isIOSSafari,
    isMobile,
    promptInstall,
    dismiss,
  };
}
