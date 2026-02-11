'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  generatePatternQuestions,
  scorePatternComplete,
  type PatternQuestion,
  type PatternResponse,
  type PatternCompleteResult,
} from '@/lib/muedlobe/games/patternComplete';
import { gameLog } from '@/lib/muedlobe/games/debug';
import { PatternCompleteSpecimen } from '@/components/features/lobe/specimens/PatternCompleteSpecimen';
import { GAME_META } from '@/lib/muedlobe/constants';

interface PatternCompleteProps {
  onComplete: (result: PatternCompleteResult) => void;
}

export function PatternComplete({ onComplete }: PatternCompleteProps) {
  const t = useTranslations('muedlobe.gameUI.patternComplete');
  const tc = useTranslations('muedlobe.gameUI.common');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [questions] = useState(() => generatePatternQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<PatternResponse[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const trialStartRef = useRef(Date.now());
  const currentQuestion = questions[currentIndex] as PatternQuestion | undefined;

  const startGame = useCallback(() => {
    setIsStarted(true);
    trialStartRef.current = Date.now();
  }, []);

  const handleOptionClick = useCallback((optionIndex: number) => {
    if (!currentQuestion || feedback !== null) return;

    const responseTime = Date.now() - trialStartRef.current;
    const correct = optionIndex === currentQuestion.correctIndex;

    gameLog('PatternComplete', 'answer', { questionId: currentQuestion.id, difficulty: currentQuestion.difficulty, correct, selectedIndex: optionIndex });
    const response: PatternResponse = {
      questionId: currentQuestion.id,
      correct,
      difficulty: currentQuestion.difficulty,
      responseTime,
      selectedIndex: optionIndex,
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);
    setFeedback(correct);

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
        const result = scorePatternComplete(newResponses);
        gameLog('PatternComplete', 'complete', { totalScore: result.totalScore, correctCount: result.correctCount });
        onComplete(result);
      } else {
        setCurrentIndex(prev => prev + 1);
        setFeedback(null);
        trialStartRef.current = Date.now();
      }
    }, 1000);
  }, [currentQuestion, currentIndex, questions, responses, feedback, onComplete]);

  if (!isStarted) {
    const meta = GAME_META['pattern-complete'];
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 py-16">
        <div className="flex items-center justify-center md:w-2/5">
          <PatternCompleteSpecimen />
        </div>
        <div className="flex flex-col items-center md:items-start gap-6 md:w-3/5">
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
            <p className="text-xs text-white/30">{meta.duration}</p>
          </div>
          <p className="text-white/50 text-sm max-w-md text-center md:text-left">
            {t('description')}
          </p>
          <button onClick={startGame} className="px-10 py-3 bg-transparent border border-white/20 text-white/70 rounded-[2px] text-sm tracking-wide hover:text-white/95 hover:border-white/35 transition-colors">
            {tc('start')}
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const result = scorePatternComplete(responses);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">{tc('complete')}</h2>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{result.correctCount}</div>
          <div className="text-sm text-white/50">{t('correctCount', { correct: result.correctCount, total: result.totalQuestions })}</div>
        </div>
        <div className="text-sm text-white/40">{tc('score')}: {result.totalScore}</div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const difficultyLabel = currentQuestion.difficulty === 'easy' ? t('easy')
    : currentQuestion.difficulty === 'medium' ? t('medium')
    : currentQuestion.difficulty === 'hard' ? t('hard') : t('expert');

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Progress */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white/40">
          {currentIndex + 1} / {questions.length}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs ${
          currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
          currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          currentQuestion.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {difficultyLabel}
        </span>
      </div>

      {/* 3×3 Matrix */}
      <div className="grid grid-cols-3 gap-1 p-4 bg-white/5 rounded-xl">
        {currentQuestion.matrix.map((cell, i) => (
          <div
            key={i}
            className={`
              w-20 h-20 flex items-center justify-center text-2xl rounded-lg
              ${cell === null
                ? 'border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                : 'bg-white/10 border border-white/10 text-white'
              }
            `}
          >
            {cell === null ? '?' : cell}
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {currentQuestion.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleOptionClick(i)}
            disabled={feedback !== null}
            className={`
              h-16 rounded-lg text-xl transition-all
              ${feedback !== null
                ? i === currentQuestion.correctIndex
                  ? 'bg-green-500/30 border border-green-500 text-white'
                  : feedback !== null && responses[responses.length - 1]?.selectedIndex === i
                    ? 'bg-red-500/30 border border-red-500 text-white'
                    : 'bg-white/5 border border-white/10 text-white/30'
                : 'bg-white/10 border border-white/20 text-white hover:bg-white/20 cursor-pointer'
              }
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
