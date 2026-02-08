'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { GameType } from '@/types/muedlobe';
import { GAME_META } from '@/lib/muedlobe/constants';

interface GamePageWrapperProps {
  gameType: GameType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (props: { onComplete: (result: any) => void }) => React.ReactNode;
}

export function GamePageWrapper({ gameType, children }: GamePageWrapperProps) {
  const router = useRouter();
  const meta = GAME_META[gameType];
  const [status, setStatus] = useState<'playing' | 'saving' | 'error' | 'saved' | 'profile-ready'>('playing');

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
      setStatus('error');
    }
  }, [gameType, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-400 font-mono">{meta.id}</span>
            <h1 className="text-lg font-semibold text-white">{meta.name}</h1>
          </div>
          <span className="text-xs text-white/30">{meta.variable}</span>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-6">
        {status === 'profile-ready' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-white">
                Profile Calculated
              </p>
              <p className="text-sm text-white/50">
                All 7 games complete. Your cognitive profile has been generated.
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
    </div>
  );
}
