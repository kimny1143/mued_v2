'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GAME_META, GAME_ORDER, VARIABLE_DISPLAY, VARIABLE_COLORS } from '@/lib/muedlobe/constants';
import { PWAInstallBanner } from '@/components/features/lobe/PWAInstallBanner';

interface LobeListContentProps {
  completedGames: string[];
  hasProfile: boolean;
  allComplete: boolean;
}

export function LobeListContent({ completedGames, hasProfile, allComplete }: LobeListContentProps) {
  const t = useTranslations('muedlobe.list');
  const tGames = useTranslations('muedlobe.games');
  const tLobe = useTranslations('muedlobe');

  const completedSet = new Set(completedGames);
  const completedCount = GAME_ORDER.filter((g) => completedSet.has(g)).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">MUEDlobe</h1>
          <p className="text-white/50">
            {t('subtitle')}
          </p>
        </div>

        {/* 7-Segment Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">{t('progress')}</span>
            <span className="text-white/60">{completedCount}/{GAME_ORDER.length}</span>
          </div>
          <div
            className="flex gap-1 h-1.5"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={GAME_ORDER.length}
            aria-label={t('progressLabel', { completed: completedCount, total: GAME_ORDER.length })}
          >
            {GAME_ORDER.map((gameType) => {
              const meta = GAME_META[gameType];
              const isCompleted = completedSet.has(gameType);
              return (
                <div
                  key={gameType}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: isCompleted
                      ? VARIABLE_COLORS[meta.variable]
                      : 'rgba(255,255,255,0.08)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          <h2 className="text-sm text-white/40 uppercase tracking-wider">{t('games')}</h2>
          {GAME_ORDER.map((gameType) => {
            const meta = GAME_META[gameType];
            const isCompleted = completedSet.has(gameType);
            const accentColor = VARIABLE_COLORS[meta.variable];

            return (
              <Link
                key={gameType}
                href={`/lobe/games/${gameType}`}
                className={`block rounded-lg border transition-colors overflow-hidden ${
                  isCompleted
                    ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex">
                  {/* Color bar */}
                  <div
                    className="w-[3px] shrink-0"
                    style={{
                      backgroundColor: accentColor,
                      opacity: isCompleted ? 1 : 0.3,
                    }}
                  />
                  <div className="flex items-center justify-between flex-1 p-4">
                    <div>
                      <span
                        className="text-xs"
                        style={{ color: isCompleted ? accentColor : accentColor, opacity: isCompleted ? 1 : 0.6 }}
                      >
                        {VARIABLE_DISPLAY[meta.variable] ?? meta.variable}
                      </span>
                      <h3 className="text-white font-medium">{tGames(`${gameType}.name`)}</h3>
                      <p className="text-xs text-white/40">{meta.duration}</p>
                    </div>
                    {isCompleted ? (
                      <span className="text-emerald-400 text-sm" aria-label="Completed">
                        {t('done')}
                      </span>
                    ) : (
                      <span className="text-white/20">&rarr;</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Profile / Results Link */}
        {hasProfile ? (
          <Link
            href="/lobe/results"
            className="inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {t('viewResults')} &rarr;
          </Link>
        ) : allComplete ? (
          <p className="text-sm text-white/40">
            {t('profileCalculating')}{' '}
            <Link href="/lobe/results" className="text-indigo-400 hover:text-indigo-300">
              {t('checkResults')} &rarr;
            </Link>
          </p>
        ) : (
          <p className="text-sm text-white/30">
            {t('completeAll')}
          </p>
        )}

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Disclaimer footer */}
        <footer className="pt-6 border-t border-white/5">
          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            {tLobe('disclaimer')}
          </p>
        </footer>
      </div>
    </div>
  );
}
