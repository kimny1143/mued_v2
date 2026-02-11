'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  CODE_PAIRS,
  CODE_FILL_TIME_LIMIT_MS,
  generateCodeFillTrial,
  scoreCodeFill,
  type CodeFillTrial,
  type CodeFillResult,
} from '@/lib/muedlobe/games/codeFill';
import { gameLog } from '@/lib/muedlobe/games/debug';
import { CodeFillSpecimen } from '@/components/features/lobe/specimens/CodeFillSpecimen';
import { GAME_META } from '@/lib/muedlobe/constants';

interface CodeFillProps {
  onComplete: (result: CodeFillResult) => void;
}

export function CodeFill({ onComplete }: CodeFillProps) {
  const t = useTranslations('muedlobe.gameUI.codeFill');
  const tc = useTranslations('muedlobe.gameUI.common');
  const [trials, setTrials] = useState<CodeFillTrial[]>([]);
  const [currentTrial, setCurrentTrial] = useState<CodeFillTrial | null>(null);
  const [timeLeft, setTimeLeft] = useState(CODE_FILL_TIME_LIMIT_MS);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const trialStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const nextTrial = useCallback(() => {
    setCurrentTrial(generateCodeFillTrial());
    trialStartRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setIsRunning(true);
    setTrials([]);
    nextTrial();
  }, [nextTrial]);

  const finishGame = useCallback((completedTrials: CodeFillTrial[]) => {
    setIsRunning(false);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const result = scoreCodeFill(completedTrials);
    gameLog('CodeFill', 'complete', { correct: result.correct, incorrect: result.incorrect, rawScore: result.rawScore });
    onComplete(result);
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) { finishGame(trials); return 0; }
        return prev - 100;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, trials, finishGame]);

  const handleAnswer = useCallback((symbol: string) => {
    if (!currentTrial || !isRunning) return;
    const responseTime = Date.now() - trialStartRef.current;
    const isCorrect = symbol === currentTrial.correctSymbol;
    gameLog('CodeFill', 'answer', { digit: currentTrial.digit, selected: symbol, expected: currentTrial.correctSymbol, correct: isCorrect, responseTime });
    const completed: CodeFillTrial = {
      ...currentTrial,
      userAnswer: symbol,
      correct: isCorrect,
      responseTime,
    };
    setTrials(prev => [...prev, completed]);
    nextTrial();
  }, [currentTrial, isRunning, nextTrial]);

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (!isRunning && !isFinished) {
    const meta = GAME_META['code-fill'];
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 py-8 md:py-16">
        <div className="flex items-center justify-center md:w-2/5">
          <CodeFillSpecimen />
        </div>
        <div className="flex flex-col items-center md:items-start gap-6 md:w-3/5">
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
            <p className="text-xs text-white/30">{meta.duration}</p>
          </div>
          <p className="text-white/50 text-sm max-w-md text-center md:text-left">
            {t('description')}
          </p>
          <button onClick={startGame} className="px-6 sm:px-10 py-2 sm:py-3 bg-transparent border border-white/20 text-white/70 rounded-[2px] text-sm tracking-wide hover:text-white/95 hover:border-white/35 transition-colors">
            {tc('start')}
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const result = scoreCodeFill(trials);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-8 md:py-16">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{tc('complete')}</h2>
        <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{result.correct}</div>
            <div className="text-sm text-white/50">{tc('correct')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-400">{result.incorrect}</div>
            <div className="text-sm text-white/50">{tc('incorrect')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{result.rawScore.toFixed(1)}</div>
            <div className="text-sm text-white/50">{tc('score')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center gap-6 text-white/60">
        <span className="text-lg font-mono">{formatTime(timeLeft)}</span>
        <span className="text-sm">{t('answered', { count: trials.length })}</span>
      </div>

      {/* Reference table */}
      <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
        {CODE_PAIRS.map(p => (
          <div key={p.digit} className="text-center">
            <div className="text-xs text-white/40">{p.digit}</div>
            <div className="text-lg text-white">{p.symbol}</div>
          </div>
        ))}
      </div>

      {currentTrial && (
        <>
          {/* Current digit */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white bg-white/10 rounded-xl border border-white/20">
            {currentTrial.digit}
          </div>

          {/* Symbol buttons (shuffled per trial to prevent position memorization) */}
          <div className="grid grid-cols-3 gap-3">
            {currentTrial.shuffledSymbols.map(symbol => (
              <button
                key={symbol}
                onClick={() => handleAnswer(symbol)}
                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-indigo-500/50 rounded-lg text-white transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
