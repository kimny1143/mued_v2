'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CODE_PAIRS,
  CODE_FILL_TIME_LIMIT_MS,
  generateCodeFillTrial,
  scoreCodeFill,
  type CodeFillTrial,
  type CodeFillResult,
} from '@/lib/muedlobe/games/codeFill';
import { gameLog } from '@/lib/muedlobe/games/debug';

interface CodeFillProps {
  onComplete: (result: CodeFillResult) => void;
}

export function CodeFill({ onComplete }: CodeFillProps) {
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
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Code Fill</h2>
          <p className="text-white/60 max-w-md">
            数字が表示されたら、対応表を見て正しい記号をクリックしてください。制限時間は2分です。
          </p>
        </div>
        <button onClick={startGame} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          Start
        </button>
      </div>
    );
  }

  if (isFinished) {
    const result = scoreCodeFill(trials);
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
            <div className="text-3xl font-bold text-white">{result.rawScore.toFixed(1)}</div>
            <div className="text-sm text-white/50">Score</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center gap-6 text-white/60">
        <span className="text-lg font-mono">{formatTime(timeLeft)}</span>
        <span className="text-sm">{trials.length} answered</span>
      </div>

      {/* Reference table */}
      <div className="grid grid-cols-9 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
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
          <div className="w-24 h-24 flex items-center justify-center text-5xl font-bold text-white bg-white/10 rounded-xl border border-white/20">
            {currentTrial.digit}
          </div>

          {/* Symbol buttons (shuffled per trial to prevent position memorization) */}
          <div className="grid grid-cols-3 gap-3">
            {currentTrial.shuffledSymbols.map(symbol => (
              <button
                key={symbol}
                onClick={() => handleAnswer(symbol)}
                className="w-16 h-16 flex items-center justify-center text-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-indigo-500/50 rounded-lg text-white transition-colors"
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
