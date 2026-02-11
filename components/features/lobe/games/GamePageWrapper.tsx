'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { GameType } from '@/types/muedlobe';
import { GAME_META } from '@/lib/muedlobe/constants';
import { savePendingResult, syncPendingResults, getPendingResults } from '@/lib/muedlobe/offline-sync';

/** User-facing display names (non-clinical) */
const VARIABLE_DISPLAY: Record<string, string> = {
  WM: 'Memory',
  PS: 'Tempo',
  VC: 'Word Sense',
  PR: 'Patterns',
  ATT: 'Focus',
};

interface GamePageWrapperProps {
  gameType: GameType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (props: { onComplete: (result: any) => void }) => React.ReactNode;
}

export function GamePageWrapper({ gameType, children }: GamePageWrapperProps) {
  const router = useRouter();
  const meta = GAME_META[gameType];
  const [status, setStatus] = useState<'playing' | 'saving' | 'error' | 'saved' | 'saved-offline' | 'profile-ready'>('playing');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Auto-sync pending results when coming online
  useEffect(() => {
    const handleOnline = async () => {
      const pending = getPendingResults();
      if (pending.length === 0) return;

      const synced = await syncPendingResults();
      if (synced > 0) {
        setSyncNotice(`${synced} offline result${synced > 1 ? 's' : ''} synced`);
        setTimeout(() => setSyncNotice(null), 3000);
      }
    };

    window.addEventListener('online', handleOnline);
    // Also try on mount in case we're already online with pending results
    handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleComplete = useCallback(async (result: Record<string, unknown>) => {
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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs text-violet-400 font-mono">{VARIABLE_DISPLAY[meta.variable] ?? meta.variable}</span>
            <h1 className="text-lg font-semibold text-white">{meta.name}</h1>
          </div>
        </div>
      </header>

      {/* Sync notification */}
      {syncNotice && (
        <div className="bg-violet-500/20 border-b border-violet-500/30 px-6 py-2">
          <p className="text-xs text-violet-300 text-center">{syncNotice}</p>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-6">
        {status === 'profile-ready' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-white">
                Profile Calculated
              </p>
              <p className="text-sm text-white/50">
                All 7 games complete. Your thinking style has been generated.
              </p>
            </div>
          </div>
        ) : status === 'saved' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-white">
                Result Saved
              </p>
              <p className="text-sm text-white/50">
                Returning to game list...
              </p>
            </div>
          </div>
        ) : status === 'saved-offline' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-violet-300">
                Saved Locally
              </p>
              <p className="text-sm text-white/50">
                Your result will sync when you&apos;re back online.
              </p>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold text-red-400">
                Failed to Save
              </p>
              <p className="text-sm text-white/50">
                Your result could not be saved. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/lobe')}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Back to Games
                </button>
              </div>
            </div>
          </div>
        ) : (
          children({ onComplete: handleComplete })
        )}
      </main>

      {status === 'playing' && (
        <footer className="border-t border-white/5 px-6 py-3">
          <p className="max-w-4xl mx-auto text-[10px] text-white/20 text-center leading-relaxed">
            These games are not a medical or psychological assessment. They are a calibration tool that helps Hoo adapt its communication style to you. Scores are not diagnostic results — they are tuning parameters for Hoo.
          </p>
        </footer>
      )}
    </div>
  );
}
