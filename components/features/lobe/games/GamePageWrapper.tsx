'use client';
import { BrandMark } from '@/components/brand/brand-mark';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GameType } from '@/types/muedlobe';
import { GAME_META, VARIABLE_DISPLAY, VARIABLE_COLORS } from '@/lib/muedlobe/constants';
import { savePendingResult, syncPendingResults, getPendingResults } from '@/lib/muedlobe/offline-sync';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameResult = Record<string, any>;

interface GamePageWrapperProps {
  gameType: GameType;
  requiresLandscape?: boolean;
  children: (props: { onComplete: (result: GameResult) => void }) => React.ReactNode;
}

function usePortraitDetection(enabled: boolean) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const mq = window.matchMedia('(orientation: portrait)');
    // Only enforce on mobile-sized screens (≤768px width in landscape)
    const isMobile = window.screen.width <= 768 || window.screen.height <= 768;
    if (!isMobile) return;

    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [enabled]);

  return isPortrait;
}

export function GamePageWrapper({ gameType, requiresLandscape = false, children }: GamePageWrapperProps) {
  const router = useRouter();
  const meta = GAME_META[gameType];
  const t = useTranslations('muedlobe.gameUI.common');
  const tGame = useTranslations(`muedlobe.games.${gameType}`);
  const accentColor = VARIABLE_COLORS[meta.variable] ?? 'var(--color-lobe-memory)';
  const isPortrait = usePortraitDetection(requiresLandscape);
  const [status, setStatus] = useState<'playing' | 'saving' | 'error' | 'saved' | 'saved-offline' | 'profile-ready'>('playing');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  // Auto-sync pending results when coming online
  useEffect(() => {
    const handleOnline = async () => {
      const pending = getPendingResults();
      if (pending.length === 0) return;

      const synced = await syncPendingResults();
      if (synced > 0) {
        setSyncNotice(t('offlineSynced', { count: synced }));
        setTimeout(() => setSyncNotice(null), 3000);
      }
    };

    window.addEventListener('online', handleOnline);
    // Also try on mount in case we're already online with pending results
    handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, [t]);

  const handleComplete = useCallback(async (result: GameResult) => {
    setLastResult(result);
    setStatus('saving');

    try {
      const res = await fetch('/api/lobe/measurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          rawData: result,
          calculatedScore: result,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.profileCalculated) {
          setStatus('profile-ready');
          setTimeout(() => router.push('/lobe/results'), 3000);
          return;
        }
        setStatus('saved');
        setTimeout(() => router.push('/lobe'), 2000);
        return;
      }

      setStatus('error');
    } catch (e) {
      console.error('Failed to save measurement:', e);
      // Save locally for later sync
      savePendingResult(gameType, result, result);
      setStatus('saved-offline');
      setTimeout(() => router.push('/lobe'), 2000);
    }
  }, [gameType, router]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <header className="border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-stretch gap-3">
            <div className="w-[2px] rounded-full" style={{ backgroundColor: accentColor }} />
            <div>
              <span className="text-xs" style={{ color: accentColor }}>{VARIABLE_DISPLAY[meta.variable] ?? meta.variable}</span>
              <h1 className="text-base sm:text-lg font-semibold text-white">{tGame('name')}</h1>
            </div>
          </div>
          <span className="hidden sm:inline-flex"><BrandMark compact product="MUEDlobe" /></span>
        </div>
      </header>

      {/* Sync notification */}
      {syncNotice && (
        <div className="bg-violet-500/20 border-b border-violet-500/30 px-6 py-2">
          <p className="text-xs text-violet-300 text-center">{syncNotice}</p>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6">
        {status === 'profile-ready' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-white">
                {t('profileCalculated')}
              </p>
              <p className="text-sm text-white/50">
                {t('profileCalculatedDesc')}
              </p>
            </div>
          </div>
        ) : status === 'saved' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-white">
                {t('resultSaved')}
              </p>
              <p className="text-sm text-white/50">
                {t('returning')}
              </p>
            </div>
          </div>
        ) : status === 'saved-offline' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-violet-300">
                {t('savedLocally')}
              </p>
              <p className="text-sm text-white/50">
                {t('savedLocallyDesc')}
              </p>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold text-red-400">
                {t('failedToSave')}
              </p>
              <p className="text-sm text-white/50">
                {t('failedToSaveDesc')}
              </p>
              <div className="flex gap-3 justify-center">
                {lastResult && (
                  <button
                    onClick={() => handleComplete(lastResult)}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                  >
                    {t('retry')}
                  </button>
                )}
                <button
                  onClick={() => router.push('/lobe')}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  {t('backToGames')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          children({ onComplete: handleComplete })
        )}
      </main>

      {/* Portrait orientation overlay */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-bg-primary flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">📱↔️</div>
            <p className="text-lg font-semibold text-white">{t('rotateLandscape')}</p>
            <p className="text-sm text-white/50">{t('rotateLandscapeDesc')}</p>
          </div>
        </div>
      )}

    </div>
  );
}
