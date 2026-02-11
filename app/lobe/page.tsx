import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GAME_META, GAME_ORDER } from '@/lib/muedlobe/constants';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';

/** User-facing display names (non-clinical) */
const VARIABLE_DISPLAY: Record<string, string> = {
  WM: 'Memory',
  PS: 'Tempo',
  VC: 'Word Sense',
  PR: 'Patterns',
  ATT: 'Focus',
};

export default async function LobePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [measurements, profile] = await Promise.all([
    cognitiveProfileRepository.findMeasurementsByUserId(userId),
    cognitiveProfileRepository.findByUserId(userId),
  ]);

  const completedGames = new Set(measurements.map((m) => m.gameType));
  const completedCount = GAME_ORDER.filter((g) => completedGames.has(g)).length;
  const allComplete = completedCount === GAME_ORDER.length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">MUEDlobe</h1>
          <p className="text-white/50">
            Discover your thinking style through 7 short games.
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Progress</span>
            <span className="text-white/60 font-mono">{completedCount}/{GAME_ORDER.length}</span>
          </div>
          <div
            className="h-1.5 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={GAME_ORDER.length}
            aria-label={`${completedCount} of ${GAME_ORDER.length} games completed`}
          >
            <div
              className={`h-full rounded-full transition-all ${allComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${(completedCount / GAME_ORDER.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          <h2 className="text-sm text-white/40 uppercase tracking-wider">Games</h2>
          {GAME_ORDER.map((gameType) => {
            const meta = GAME_META[gameType];
            const isCompleted = completedGames.has(gameType);

            return (
              <Link
                key={gameType}
                href={`/lobe/games/${gameType}`}
                className={`block p-4 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-white/[0.03] border-white/10 hover:border-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:border-indigo-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-mono ${isCompleted ? 'text-emerald-400' : 'text-violet-400'}`}>
                      {VARIABLE_DISPLAY[meta.variable] ?? meta.variable}
                    </span>
                    <h3 className="text-white font-medium">{meta.name}</h3>
                    <p className="text-xs text-white/40">{meta.duration}</p>
                  </div>
                  {isCompleted ? (
                    <span className="text-emerald-400 text-sm" aria-label="Completed">
                      Done
                    </span>
                  ) : (
                    <span className="text-white/20">→</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Profile / Results Link */}
        {profile ? (
          <Link
            href="/lobe/results"
            className="inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View Your Thinking Style →
          </Link>
        ) : allComplete ? (
          <p className="text-sm text-white/40">
            Profile is being calculated. <Link href="/lobe/results" className="text-indigo-400 hover:text-indigo-300">Check results →</Link>
          </p>
        ) : (
          <p className="text-sm text-white/30">
            Complete all 7 games to discover your thinking style.
          </p>
        )}
      </div>
    </div>
  );
}
