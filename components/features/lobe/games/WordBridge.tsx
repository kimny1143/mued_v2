'use client';

import { useState, useCallback, useRef } from 'react';
import {
  WORD_BRIDGE_QUESTIONS,
  shuffleOptions,
  scoreWordBridge,
  type WordBridgeTrial,
  type WordBridgeResult,
} from '@/lib/muedlobe/games/wordBridge';

interface WordBridgeProps {
  onComplete: (result: WordBridgeResult) => void;
}

export function WordBridge({ onComplete }: WordBridgeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trials, setTrials] = useState<WordBridgeTrial[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [shuffledQuestions] = useState(() => WORD_BRIDGE_QUESTIONS.map(shuffleOptions));
  const trialStartRef = useRef(0);

  const startGame = useCallback(() => {
    setIsStarted(true);
    trialStartRef.current = Date.now();
  }, []);

  const handleAnswer = useCallback((score: number) => {
    const responseTime = Date.now() - trialStartRef.current;
    const trial: WordBridgeTrial = {
      questionId: shuffledQuestions[currentIndex].id,
      selectedScore: score,
      responseTime,
    };

    const newTrials = [...trials, trial];
    setTrials(newTrials);

    if (currentIndex + 1 >= shuffledQuestions.length) {
      setIsFinished(true);
      onComplete(scoreWordBridge(newTrials));
    } else {
      setCurrentIndex(prev => prev + 1);
      trialStartRef.current = Date.now();
    }
  }, [currentIndex, trials, shuffledQuestions, onComplete]);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Word Bridge</h2>
          <p className="text-white/60 max-w-md">
            2つの単語に共通することを4つの選択肢から選んでください。より抽象的な答えほど高得点です。全12問。
          </p>
        </div>
        <button onClick={startGame} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          Start
        </button>
      </div>
    );
  }

  if (isFinished) {
    const result = scoreWordBridge(trials);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">Complete!</h2>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{result.totalScore}</div>
          <div className="text-sm text-white/50">/ {result.maxScore} points</div>
        </div>
      </div>
    );
  }

  const question = shuffledQuestions[currentIndex];

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-sm text-white/40">
        {currentIndex + 1} / {shuffledQuestions.length}
      </div>

      {/* Word pair */}
      <div className="flex items-center gap-6">
        <span className="text-2xl font-bold text-white">{question.wordA}</span>
        <span className="text-white/30">と</span>
        <span className="text-2xl font-bold text-white">{question.wordB}</span>
      </div>

      <p className="text-white/50 text-sm">この2つの共通点は？</p>

      {/* Options */}
      <div className="w-full max-w-sm space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(opt.score)}
            className="w-full px-6 py-4 text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-lg text-white transition-colors"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
