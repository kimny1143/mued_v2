'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateTrial, scoreSymbolMatch } from '@/lib/muedlobe/games/symbolMatch';
import { SYMBOL_MATCH_CONFIG } from '@/lib/muedlobe/constants';
import type { SymbolMatchTrial, SymbolMatchResult } from '@/types/muedlobe';

interface SymbolMatchProps {
  onComplete: (result: SymbolMatchResult) => void;
}

export function SymbolMatch({ onComplete }: SymbolMatchProps) {
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
    const completed: SymbolMatchTrial = {
      ...currentTrial,
      userAnswer: answer,
      correct: answer === currentTrial.hasTarget,
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
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Symbol Match</h2>
          <p className="text-white/60 max-w-md">
            ターゲット記号が下の比較群に含まれていれば「ある」、なければ「ない」を選んでください。
            制限時間は2分です。
          </p>
          <div className="text-sm text-white/40 space-y-1">
            <p>キーボード: ← or A = ある / → or D = ない</p>
          </div>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  // Finished screen
  if (isFinished) {
    const result = scoreSymbolMatch(trials);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">Complete!</h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-green-400">{result.correct}</div>
            <div className="text-sm text-white/50">Correct</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-400">{result.incorrect}</div>
            <div className="text-sm text-white/50">Incorrect</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{result.rawScore}</div>
            <div className="text-sm text-white/50">Score</div>
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
            <div className="text-sm text-white/40 uppercase tracking-wider">Target</div>
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
            <div className="text-sm text-white/40 uppercase tracking-wider">Comparison</div>
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
              ある
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="px-10 py-4 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-medium text-lg transition-colors"
            >
              ない
            </button>
          </div>
        </>
      )}
    </div>
  );
}
