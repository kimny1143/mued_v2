'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
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

  const handleComplete = useCallback(async (result: Record<string, unknown>) => {
    try {
      await fetch('/api/lobe/measurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          rawData: result,
          calculatedScore: result,
        }),
      });
    } catch (e) {
      console.error('Failed to save measurement:', e);
    }

    setTimeout(() => router.push('/lobe/results'), 2000);
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
        {children({ onComplete: handleComplete })}
      </main>
    </div>
  );
}
