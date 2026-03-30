'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

function PatternBadge({ pattern, label }: { pattern: string; label: string }) {
  const isComposite = pattern.endsWith('_type');
  const isModifier = pattern.endsWith('_modifier');

  const bgColor = isComposite
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    : isModifier
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-white/10 text-white/60 border-white/10';

  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${bgColor}`}>
      {label}
    </span>
  );
}

// ========================================
// Prompt Param Tag
// ========================================

function PromptParamTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 font-mono capitalize">{value}</span>
    </div>
  );
}

// ========================================
// Types
// ========================================

interface Measurement {
  id: string;
  gameType: string;
  calculatedScore: Record<string, number> | null;
  measuredAt: Date | string | null;
}

interface ResultsContentProps {
  scores: Record<string, number> | null;
  patterns: SignificantPattern[];
  promptParams: PromptParams | null;
  measurements: Measurement[];
  measuredAt: string | null;
  hasProfile: boolean;
}

// ========================================
// Main Component
// ========================================

const VARIABLE_KEYS = ['wm', 'ps', 'vc', 'pr', 'att'] as const;
const PARAM_KEYS: (keyof PromptParams)[] = [
  'informationDensity',
  'chunkSize',
  'pacing',
  'confirmationFrequency',
  'modality',
  'abstractionLevel',
  'responseLength',
];

export function ResultsContent({
  scores,
  patterns,
  promptParams,
  measurements,
  measuredAt,
  hasProfile,
}: ResultsContentProps) {
  const t = useTranslations('muedlobe.results');
  const [commentary, setCommentary] = useState<string | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryError, setCommentaryError] = useState(false);

  useEffect(() => {
    if (!hasProfile) return;

    setCommentaryLoading(true);
    setCommentaryError(false);
    fetch('/api/lobe/commentary')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Commentary API ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data) setCommentary(data.data?.commentary ?? null);
      })
      .catch((err) => {
        console.error('[Commentary]', err);
        setCommentary(null);
        setCommentaryError(true);
      })
      .finally(() => {
        setCommentaryLoading(false);
      });
  }, [hasProfile]);

  if (measurements.length === 0 && !hasProfile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{t('noResultsTitle')}</h1>
          <p className="text-white/50">{t('noResultsDesc')}</p>
          <Link
            href="/lobe"
            className="inline-block bg-transparent border border-white/20 text-white/70 rounded-[2px] text-sm tracking-wide hover:text-white/95 hover:border-white/35 px-10 py-3 transition-colors"
          >
            {t('startMeasurement')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 mt-1">
            {hasProfile
              ? t('lastMeasured', { date: measuredAt ?? '' })
              : t('completeAll')}
          </p>
        </div>

        {/* Hoo's Commentary */}
        {hasProfile && (commentaryLoading || commentary || commentaryError) && (
          <section className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              {t('hooComment')}
            </h2>
            {commentaryLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-4/6" />
                <p className="text-xs text-white/30 mt-2">{t('generating')}</p>
              </div>
            ) : commentaryError ? (
              <div className="flex items-center gap-3">
                <p className="text-xs text-white/30">{t('commentaryFailed')}</p>
                <button
                  onClick={() => {
                    setCommentaryLoading(true);
                    setCommentaryError(false);
                    fetch('/api/lobe/commentary')
                      .then(async (res) => {
                        if (!res.ok) throw new Error(`${res.status}`);
                        return res.json();
                      })
                      .then((data) => {
                        if (data) setCommentary(data.data?.commentary ?? null);
                      })
                      .catch(() => setCommentaryError(true))
                      .finally(() => setCommentaryLoading(false));
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {t('retryCommentary')}
                </button>
              </div>
            ) : (
              <div className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {commentary}
              </div>
            )}
          </section>
        )}

        {/* Profile Summary */}
        {scores && (
          <section className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              {t('normalizedScores')}
            </h2>
            {VARIABLE_KEYS.map((key) => (
              <ScoreBar
                key={key}
                id={key.toUpperCase()}
                label={t(`variables.${key}`)}
                score={scores[key] ?? 0}
              />
            ))}
          </section>
        )}

        {/* Detected Patterns */}
        {patterns.length > 0 && (
          <section className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              {t('detectedPatterns')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {patterns.map((p) => (
                <PatternBadge key={p} pattern={p} label={t(`patterns.${p}`, { defaultValue: p })} />
              ))}
            </div>
          </section>
        )}

        {/* Prompt Parameters */}
        {promptParams && (
          <section className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              {t('hooTuning')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PARAM_KEYS.map((key) => (
                <PromptParamTag
                  key={key}
                  label={t(`params.${key}`)}
                  value={promptParams[key]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Raw Measurement History */}
        {measurements.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
              {t('measurementHistory')}
            </h2>
            <div className="space-y-3">
              {measurements.map((m) => {
                const score = m.calculatedScore;
                const rawScore = score?.rawScore ?? score?.totalScore;
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
                        {rawScore !== undefined && (
                          <p className="text-xl font-bold text-white mt-1">
                            {t('score', { score: rawScore })}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-white/30" suppressHydrationWarning>
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
          &larr; {t('backToLobe')}
        </Link>
      </div>
    </div>
  );
}
