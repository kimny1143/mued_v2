'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  generateMathQuestions,
  scoreMentalMath,
  speakText,
  type MathQuestion,
  type MathResponse,
  type MentalMathResult,
} from '@/lib/muedlobe/games/mentalMath';
import { gameLog } from '@/lib/muedlobe/games/debug';

interface MentalMathProps {
  onComplete: (result: MentalMathResult) => void;
}

type Phase = 'idle' | 'speaking' | 'answering' | 'feedback';

export function MentalMath({ onComplete }: MentalMathProps) {
  const t = useTranslations('muedlobe.gameUI.mentalMath');
  const tc = useTranslations('muedlobe.gameUI.common');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [questions] = useState(() => generateMathQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [inputValue, setInputValue] = useState('');
  const [responses, setResponses] = useState<MathResponse[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const trialStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const currentQuestion = questions[currentIndex] as MathQuestion | undefined;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startQuestion = useCallback(async () => {
    const q = questions[currentIndex];
    if (!q) return;

    setPhase('speaking');
    setInputValue('');
    setFeedback(null);

    await speakText(q.text);

    setPhase('answering');
    trialStartRef.current = Date.now();
    setTimeLeft(q.timeLimit);

    // Start countdown
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - trialStartRef.current;
      const remaining = Math.max(0, q.timeLimit - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        // Time's up - auto submit as wrong
        submitAnswer(null, q);
      }
    }, 100);
  }, [currentIndex, questions]);

  const submitAnswer = useCallback((userAnswer: number | null, question?: MathQuestion) => {
    const q = question ?? currentQuestion;
    if (!q) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - trialStartRef.current;
    const correct = userAnswer === q.answer;
    gameLog('MentalMath', 'answer', { level: q.level, userAnswer, expected: q.answer, correct, responseTime });

    const response: MathResponse = {
      questionId: q.id,
      correct,
      level: q.level,
      responseTime,
      timeLimit: q.timeLimit,
      userAnswer,
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);
    setFeedback({ correct, answer: q.answer });
    setPhase('feedback');

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
        const result = scoreMentalMath(newResponses);
        gameLog('MentalMath', 'complete', { totalScore: result.totalScore, correctCount: result.correctCount });
        onComplete(result);
      } else {
        setCurrentIndex(prev => prev + 1);
        setPhase('idle');
      }
    }, 1500);
  }, [currentQuestion, currentIndex, questions, responses, onComplete]);

  const handleKeypadClick = useCallback((key: string) => {
    if (phase !== 'answering') return;

    if (key === 'clear') {
      setInputValue('');
    } else if (key === 'backspace') {
      setInputValue(prev => prev.slice(0, -1));
    } else if (key === 'submit') {
      if (inputValue === '') return;
      submitAnswer(parseInt(inputValue, 10));
    } else if (key === '-') {
      setInputValue(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
    } else {
      setInputValue(prev => prev + key);
    }
  }, [phase, inputValue, submitAnswer]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== 'answering') return;
      if (e.key >= '0' && e.key <= '9') handleKeypadClick(e.key);
      else if (e.key === '-') handleKeypadClick('-');
      else if (e.key === 'Backspace') handleKeypadClick('backspace');
      else if (e.key === 'Enter') handleKeypadClick('submit');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handleKeypadClick]);

  const startGame = useCallback(() => {
    setIsStarted(true);
    setPhase('idle');
  }, []);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-white/60 max-w-md">
            {t('description')}
          </p>
          <p className="text-xs text-white/40">
            {t('audioWarning')}
          </p>
        </div>
        <button onClick={startGame} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          {tc('start')}
        </button>
      </div>
    );
  }

  if (isFinished) {
    const result = scoreMentalMath(responses);
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

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Progress */}
      <div className="text-sm text-white/40">
        {currentIndex + 1} / {questions.length}
        {currentQuestion && (
          <span className="ml-2 text-indigo-400">{t('level', { level: currentQuestion.level })}</span>
        )}
      </div>

      {/* Phase display */}
      <div className="h-20 flex items-center justify-center">
        {phase === 'idle' && (
          <button onClick={startQuestion} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
            {t('playQuestion')}
          </button>
        )}
        {phase === 'speaking' && (
          <div className="text-white/60 animate-pulse text-lg">{tc('listening')}</div>
        )}
        {phase === 'answering' && (
          <div className="text-center space-y-2">
            <div className="text-white/40 text-xs">
              {t('time')}: {Math.ceil(timeLeft / 1000)}s
            </div>
            {/* Progress bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-100"
                style={{ width: `${currentQuestion ? (timeLeft / currentQuestion.timeLimit) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        {phase === 'feedback' && feedback && (
          <div className="text-center space-y-1">
            <div className={feedback.correct ? 'text-green-400' : 'text-red-400'}>
              {feedback.correct ? tc('correct') : tc('incorrect')}
            </div>
            <div className="text-sm text-white/50">
              {t('answer')}: {feedback.answer}
              {currentQuestion && <span className="ml-2 text-white/30">({currentQuestion.display})</span>}
            </div>
          </div>
        )}
      </div>

      {/* Input display */}
      <div className="w-48 h-14 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
        <span className="text-2xl font-mono text-white">
          {inputValue || <span className="text-white/20">?</span>}
        </span>
      </div>

      {/* Number keypad */}
      <div className="grid grid-cols-3 gap-2 w-48">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'backspace'].map(key => (
          <button
            key={key}
            onClick={() => handleKeypadClick(key)}
            disabled={phase !== 'answering'}
            className={`
              h-12 rounded-lg font-mono text-lg transition-colors
              ${phase === 'answering'
                ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              }
            `}
          >
            {key === 'backspace' ? '←' : key}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={() => handleKeypadClick('submit')}
        disabled={phase !== 'answering' || inputValue === ''}
        className={`
          w-48 py-3 rounded-lg font-medium transition-colors
          ${phase === 'answering' && inputValue
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
          }
        `}
      >
        {tc('submit')}
      </button>
    </div>
  );
}
