import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import Link from 'next/link';
import type { SignificantPattern, PromptParams } from '@/types/muedlobe';

// ========================================
// Score Bar Component
// ========================================

function ScoreBar({ label, score, id }: { label: string; score: number; id: string }) {
  const width = Math.max(0, Math.min(100, score));
  const color =
    score >= 65
      ? 'bg-emerald-500'
      : score >= 36
        ? 'bg-indigo-500'
        : 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-mono text-white font-medium">{score}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${id} score: ${score}`}
        />
      </div>
    </div>
  );
}

// ========================================
// Pattern Badge
// ========================================

const PATTERN_LABELS: Record<string, string> = {
  architect_type: 'Architect',
  performer_type: 'Performer',
  theorist_type: 'Theorist',
  visualizer_type: 'Visualizer',
  balanced_type: 'Balanced',
  low_attention_modifier: 'Low Focus',
  high_attention_modifier: 'High Focus',
  high_wm_low_ps: 'High Memory / Low Tempo',
  low_wm_high_ps: 'Low Memory / High Tempo',
  high_wm_low_vc: 'High Memory / Low Word Sense',
  low_wm_high_vc: 'Low Memory / High Word Sense',
  high_wm_low_pr: 'High Memory / Low Patterns',
  low_wm_high_pr: 'Low Memory / High Patterns',
  high_ps_low_vc: 'High Tempo / Low Word Sense',
  low_ps_high_vc: 'Low Tempo / High Word Sense',
  high_ps_low_pr: 'High Tempo / Low Patterns',
  low_ps_high_pr: 'Low Tempo / High Patterns',
  high_vc_low_pr: 'High Word Sense / Low Patterns',
  low_vc_high_pr: 'Low Word Sense / High Patterns',
};

function PatternBadge({ pattern }: { pattern: string }) {
  const isComposite = pattern.endsWith('_type');
  const isModifier = pattern.endsWith('_modifier');

  const bgColor = isComposite
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    : isModifier
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-white/10 text-white/60 border-white/10';

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded-full border ${bgColor}`}
    >
      {PATTERN_LABELS[pattern] ?? pattern}
    </span>
  );
}

// ========================================
// Prompt Params Display
// ========================================

const PARAM_LABELS: Record<keyof PromptParams, string> = {
  informationDensity: 'Info Density',
  chunkSize: 'Chunk Size',
  pacing: 'Pacing',
  confirmationFrequency: 'Confirmation',
  modality: 'Modality',
  abstractionLevel: 'Abstraction',
  responseLength: 'Response Length',
};

function PromptParamTag({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 font-mono capitalize">{value}</span>
    </div>
  );
}

// ========================================
// Variable Labels
// ========================================

const VARIABLE_LABELS: Record<string, string> = {
  wm: 'Memory',
  ps: 'Tempo',
  vc: 'Word Sense',
  pr: 'Patterns',
  att: 'Focus',
};

// ========================================
// Page
// ========================================

export default async function LobeResultsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [profile, measurements] = await Promise.all([
    cognitiveProfileRepository.findByUserId(userId),
    cognitiveProfileRepository.findMeasurementsByUserId(userId),
  ]);

  if (measurements.length === 0 && !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">No Results Yet</h1>
          <p className="text-white/50">Complete all 7 games to discover your thinking style.</p>
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

  const scores = profile
    ? {
        wm: profile.wmScore ?? 0,
        ps: profile.psScore ?? 0,
        vc: profile.vcScore ?? 0,
        pr: profile.prScore ?? 0,
        att: profile.attScore ?? 0,
      }
    : null;

  const patterns = (profile?.significantPatterns as SignificantPattern[] | null) ?? [];
  const promptParams = profile?.promptParams as PromptParams | null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Your Thinking Style</h1>
          <p className="text-white/50 mt-1">
            {profile
              ? `Last measured: ${profile.measuredAt ? new Date(profile.measuredAt).toLocaleDateString() : 'Unknown'}`
              : 'Complete all 7 games to generate your profile'}
          </p>
        </div>

        {/* Profile Summary */}
        {scores && (
          <section className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              Normalized Scores
            </h2>
            {(['wm', 'ps', 'vc', 'pr', 'att'] as const).map((key) => (
              <ScoreBar
                key={key}
                id={key.toUpperCase()}
                label={VARIABLE_LABELS[key]}
                score={scores[key]}
              />
            ))}
          </section>
        )}

        {/* Detected Patterns */}
        {patterns.length > 0 && (
          <section className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              Detected Patterns
            </h2>
            <div className="flex flex-wrap gap-2">
              {patterns.map((p) => (
                <PatternBadge key={p} pattern={p} />
              ))}
            </div>
          </section>
        )}

        {/* Prompt Parameters */}
        {promptParams && (
          <section className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              Hoo Tuning
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PARAM_LABELS) as (keyof PromptParams)[]).map(
                (key) => (
                  <PromptParamTag
                    key={key}
                    label={PARAM_LABELS[key]}
                    value={promptParams[key]}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* Raw Measurement History */}
        {measurements.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              Measurement History
            </h2>
            <div className="space-y-3">
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
                        {(score?.rawScore ?? score?.totalScore) !== undefined && (
                          <p className="text-xl font-bold text-white mt-1">
                            Score: {score?.rawScore ?? score?.totalScore}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-white/30">
                        {m.measuredAt
                          ? new Date(m.measuredAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Link
          href="/lobe"
          className="inline-block text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          &larr; Back to Lobe
        </Link>
      </div>
    </div>
  );
}
