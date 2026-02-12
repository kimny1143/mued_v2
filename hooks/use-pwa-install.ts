'use client';

import { useState, useEffect, useCallback } from 'react';

const DISMISSED_KEY = 'muedlobe-pwa-dismissed';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check dismissed state
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
    setIsIOSSafari(isIOS && isSafari);

    // Listen for beforeinstallprompt (Android Chrome / Edge)
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const canInstallNative = deferredPrompt !== null;

  const shouldShowBanner =
    !isStandalone && !isDismissed && (canInstallNative || isIOSSafari);

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
    isIOSSafari,
    promptInstall,
    dismiss,
  };
}
