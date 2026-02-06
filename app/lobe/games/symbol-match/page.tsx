'use client';

import { useRouter } from 'next/navigation';
import { SymbolMatch } from '@/components/features/lobe/games/SymbolMatch';
import type { SymbolMatchResult } from '@/types/muedlobe';

export default function SymbolMatchPage() {
  const router = useRouter();

  const handleComplete = async (result: SymbolMatchResult) => {
    try {
      await fetch('/api/lobe/measurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'symbol-match',
          rawData: result,
          calculatedScore: { rawScore: result.rawScore },
        }),
      });
    } catch (e) {
      console.error('Failed to save measurement:', e);
    }

    // Navigate to results after a short delay
    setTimeout(() => {
      router.push('/lobe/results');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-400 font-mono">PS-1</span>
            <h1 className="text-lg font-semibold text-white">Symbol Match</h1>
          </div>
          <span className="text-xs text-white/30">Processing Speed</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6">
        <SymbolMatch onComplete={handleComplete} />
      </main>
    </div>
  );
}
