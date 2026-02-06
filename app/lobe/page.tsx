import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GAME_META, GAME_ORDER } from '@/lib/muedlobe/constants';

export default async function LobePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">MUEDlobe</h1>
          <p className="text-white/50">
            Measure your cognitive profile to optimize Hoo for your thinking style.
          </p>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          <h2 className="text-sm text-white/40 uppercase tracking-wider">Games</h2>
          {GAME_ORDER.map((gameType) => {
            const meta = GAME_META[gameType];
            const isAvailable = gameType === 'symbol-match'; // MVP: only Symbol Match

            return (
              <div
                key={gameType}
                className={`p-4 rounded-lg border transition-colors ${
                  isAvailable
                    ? 'bg-white/5 border-white/10 hover:border-indigo-500/50'
                    : 'bg-white/[0.02] border-white/5 opacity-40'
                }`}
              >
                {isAvailable ? (
                  <Link href={`/lobe/games/${gameType}`} className="block">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-indigo-400 font-mono">{meta.id}</span>
                        <h3 className="text-white font-medium">{meta.name}</h3>
                        <p className="text-xs text-white/40">{meta.variable} · {meta.duration}</p>
                      </div>
                      <span className="text-white/20">→</span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-white/30 font-mono">{meta.id}</span>
                      <h3 className="text-white/50 font-medium">{meta.name}</h3>
                      <p className="text-xs text-white/20">{meta.variable} · {meta.duration}</p>
                    </div>
                    <span className="text-xs text-white/20">Coming Soon</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results Link */}
        <Link
          href="/lobe/results"
          className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View Results →
        </Link>
      </div>
    </div>
  );
}
