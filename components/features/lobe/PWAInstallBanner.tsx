'use client';

import { useTranslations } from 'next-intl';
import { usePwaInstall } from '@/hooks/use-pwa-install';

export function PWAInstallBanner() {
  const t = useTranslations('muedlobe.pwa');
  const { shouldShowBanner, canInstallNative, isIOS, isIOSSafari, promptInstall, dismiss } =
    usePwaInstall();

  if (!shouldShowBanner) return null;

  // Determine description and instructions based on platform
  const description = canInstallNative
    ? t('descriptionAndroid')
    : isIOS
      ? t('descriptionIOS')
      : t('descriptionAndroid');

  const instructions = canInstallNative
    ? null // native install button handles it
    : isIOS && isIOSSafari
      ? `${t('iosStep1')} → ${t('iosStep2')}`
      : isIOS && !isIOSSafari
        ? t('iosOtherBrowser')
        : t('androidManual');

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">{t('title')}</h3>
          <p className="mt-1 text-xs text-white/50">{description}</p>

          {instructions && (
            <p className="mt-2 text-xs text-white/40">{instructions}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canInstallNative && (
            <button
              onClick={promptInstall}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              {t('installButton')}
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
            aria-label={t('dismiss')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
