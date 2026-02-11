'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { generateTrial, scoreSymbolMatch } from '@/lib/muedlobe/games/symbolMatch';
import { SYMBOL_MATCH_CONFIG } from '@/lib/muedlobe/constants';
import type { SymbolMatchTrial, SymbolMatchResult } from '@/types/muedlobe';
import { gameLog } from '@/lib/muedlobe/games/debug';
import { SymbolMatchSpecimen } from '@/components/features/lobe/specimens/SymbolMatchSpecimen';
import { GAME_META } from '@/lib/muedlobe/constants';

interface SymbolMatchProps {
  onComplete: (result: SymbolMatchResult) => void;
}

export function SymbolMatch({ onComplete }: SymbolMatchProps) {
  const t = useTranslations('muedlobe.gameUI.symbolMatch');
  const tc = useTranslations('muedlobe.gameUI.common');
  const [trials, setTrials] = useState<SymbolMatchTrial[]>([]);
  const [currentTrial, setCurrentTrial] = useState<SymbolMatchTrial | null>(null);
  const [timeLeft, setTimeLeft] = useState(SYMBOL_MATCH_CONFIG.timeLimitMs);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const trialStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const nextTrial = useCallback(() => {
    const trial = generateTrial();
    setCurrentTrial(trial);
    trialStartRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setIsRunning(true);
    setTrials([]);
    nextTrial();
  }, [nextTrial]);

  const finishGame = useCallback((completedTrials: SymbolMatchTrial[]) => {
    setIsRunning(false);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const result = scoreSymbolMatch(completedTrials);
    gameLog('SymbolMatch', 'complete', { correct: result.correct, incorrect: result.incorrect, rawScore: result.rawScore });
    onComplete(result);
  }, [onComplete]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100;
        if (next <= 0) {
          finishGame(trials);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, trials, finishGame]);

  const handleAnswer = useCallback((answer: boolean) => {
    if (!currentTrial || !isRunning) return;

    const responseTime = Date.now() - trialStartRef.current;
    const isCorrect = answer === currentTrial.hasTarget;
    gameLog('SymbolMatch', 'answer', { answer, hasTarget: currentTrial.hasTarget, correct: isCorrect, responseTime });
    const completed: SymbolMatchTrial = {
      ...currentTrial,
      userAnswer: answer,
      correct: isCorrect,
      responseTime,
    };

    setTrials(prev => {
      const updated = [...prev, completed];
      return updated;
    });

    nextTrial();
  }, [currentTrial, isRunning, nextTrial]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isRunning) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') handleAnswer(true);
      if (e.key === 'ArrowRight' || e.key === 'd') handleAnswer(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRunning, handleAnswer]);

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Pre-game screen
  if (!isRunning && !isFinished) {
    const meta = GAME_META['symbol-match'];
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 py-16">
        <div className="flex items-center justify-center md:w-2/5">
          <SymbolMatchSpecimen />
        </div>
        <div className="flex flex-col items-center md:items-start gap-6 md:w-3/5">
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
            <p className="text-xs text-white/30">{meta.duration}</p>
          </div>
          <p className="text-white/50 text-sm max-w-md text-center md:text-left">
            {t('description')}
          </p>
          <p className="text-xs text-white/30 text-center md:text-left">
            {t('keyboardHint')}
          </p>
          <button
            onClick={startGame}
            className="px-10 py-3 bg-transparent border border-white/20 text-white/70 rounded-[2px] text-sm tracking-wide hover:text-white/95 hover:border-white/35 transition-colors"
          >
            {tc('start')}
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (isFinished) {
    const result = scoreSymbolMatch(trials);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">{tc('complete')}</h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-green-400">{result.correct}</div>
            <div className="text-sm text-white/50">{tc('correct')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-400">{result.incorrect}</div>
            <div className="text-sm text-white/50">{tc('incorrect')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{result.rawScore}</div>
            <div className="text-sm text-white/50">{tc('score')}</div>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Timer + Progress */}
      <div className="flex items-center gap-6 text-white/60">
        <span className="text-lg font-mono">{formatTime(timeLeft)}</span>
        <span className="text-sm">{trials.length} answered</span>
      </div>

      {currentTrial && (
        <>
          {/* Target symbols */}
          <div className="text-center space-y-2">
            <div className="text-sm text-white/40 uppercase tracking-wider">{t('target')}</div>
            <div className="flex gap-4 justify-center">
              {currentTrial.targetSymbols.map((s, i) => (
                <div
                  key={i}
                  className="w-16 h-16 flex items-center justify-center text-3xl bg-white/10 rounded-lg border border-white/20 text-white"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-full max-w-sm border-t border-white/10" />

          {/* Comparison symbols */}
          <div className="text-center space-y-2">
            <div className="text-sm text-white/40 uppercase tracking-wider">{t('comparison')}</div>
            <div className="flex gap-3 justify-center">
              {currentTrial.comparisonSymbols.map((s, i) => (
                <div
                  key={i}
                  className="w-14 h-14 flex items-center justify-center text-2xl bg-white/5 rounded-lg border border-white/10 text-white"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Answer buttons */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => handleAnswer(true)}
              className="px-10 py-4 bg-green-600/80 hover:bg-green-500 text-white rounded-lg font-medium text-lg transition-colors"
            >
              {t('present')}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="px-10 py-4 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-medium text-lg transition-colors"
            >
              {t('absent')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
