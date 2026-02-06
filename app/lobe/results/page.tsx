import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import Link from 'next/link';

export default async function LobeResultsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const measurements = await cognitiveProfileRepository.findMeasurementsByUserId(userId);

  if (measurements.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">No Results Yet</h1>
          <p className="text-white/50">Complete a game to see your results.</p>
          <Link
            href="/lobe"
            className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Start Measurement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Measurement Results</h1>
          <p className="text-white/50 mt-1">Your cognitive profile data</p>
        </div>

        <div className="space-y-4">
          {measurements.map((m) => {
            const score = m.calculatedScore as Record<string, number> | null;
            return (
              <div
                key={m.id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-indigo-400 font-mono uppercase">
                      {m.gameType}
                    </span>
                    {score?.rawScore !== undefined && (
                      <p className="text-xl font-bold text-white mt-1">
                        Score: {score.rawScore}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-white/30">
                    {m.measuredAt ? new Date(m.measuredAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/lobe"
          className="inline-block text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          ← Back to Lobe
        </Link>
      </div>
    </div>
  );
}
