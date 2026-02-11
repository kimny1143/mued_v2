'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  TONE_NOTES,
  TONE_MODES,
  generateSequence,
  getExpectedAnswer,
  checkAnswer,
  scoreToneSequence,
  playTone,
  type ToneSequenceResult,
} from '@/lib/muedlobe/games/toneSequence';
import { gameLog } from '@/lib/muedlobe/games/debug';
import { ToneSequenceSpecimen } from '@/components/features/lobe/specimens/ToneSequenceSpecimen';
import { GAME_META } from '@/lib/muedlobe/constants';

interface ToneSequenceProps {
  onComplete: (result: ToneSequenceResult) => void;
}

type Phase = 'idle' | 'playing' | 'answering' | 'feedback';

export function ToneSequence({ onComplete }: ToneSequenceProps) {
  const t = useTranslations('muedlobe.gameUI.toneSequence');
  const tc = useTranslations('muedlobe.gameUI.common');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [activeNote, setActiveNote] = useState<number | null>(null);

  // All mutable game state in refs to avoid stale closures
  const phaseRef = useRef<Phase>('idle');
  const userInputRef = useRef<number[]>([]);
  const modeIndexRef = useRef(0);
  const currentLengthRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const sequenceRef = useRef<number[]>([]);
  const spansRef = useRef({ forward: 0, backward: 0, sequencing: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Display state synced from refs for rendering
  const [displayState, setDisplayState] = useState({
    phase: 'idle' as Phase,
    userInput: [] as number[],
    modeIndex: 0,
    currentLength: 0,
    spans: { forward: 0, backward: 0, sequencing: 0 },
  });

  const syncDisplay = useCallback(() => {
    setDisplayState({
      phase: phaseRef.current,
      userInput: [...userInputRef.current],
      modeIndex: modeIndexRef.current,
      currentLength: currentLengthRef.current,
      spans: { ...spansRef.current },
    });
  }, []);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const currentMode = TONE_MODES[displayState.modeIndex];

  const startGame = useCallback(() => {
    modeIndexRef.current = 0;
    currentLengthRef.current = TONE_MODES[0].startLength;
    consecutiveFailsRef.current = 0;
    spansRef.current = { forward: 0, backward: 0, sequencing: 0 };
    phaseRef.current = 'idle';
    setIsStarted(true);
    syncDisplay();
  }, [syncDisplay]);

  const advanceMode = useCallback(() => {
    const mi = modeIndexRef.current;
    if (mi + 1 >= TONE_MODES.length) {
      setIsFinished(true);
      const s = spansRef.current;
      const result = scoreToneSequence(s.forward, s.backward, s.sequencing);
      gameLog('ToneSequence', 'complete', { forward: s.forward, backward: s.backward, sequencing: s.sequencing, rawScore: result.rawScore });
      onComplete(result);
    } else {
      const nextIdx = mi + 1;
      modeIndexRef.current = nextIdx;
      currentLengthRef.current = TONE_MODES[nextIdx].startLength;
      consecutiveFailsRef.current = 0;
      phaseRef.current = 'idle';
      syncDisplay();
    }
  }, [onComplete, syncDisplay]);

  const playCurrentSequence = useCallback(async () => {
    const ctx = getAudioContext();
    const length = currentLengthRef.current;
    const seq = generateSequence(length);
    sequenceRef.current = seq;
    phaseRef.current = 'playing';
    userInputRef.current = [];
    setFeedback(null);
    syncDisplay();

    for (let i = 0; i < seq.length; i++) {
      setActiveNote(seq[i]);
      await playTone(ctx, TONE_NOTES[seq[i]].freq);
      setActiveNote(null);
      if (i < seq.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    phaseRef.current = 'answering';
    syncDisplay();
  }, [getAudioContext, syncDisplay]);

  const handleNoteClick = useCallback((noteIndex: number) => {
    if (phaseRef.current !== 'answering') return;

    const ctx = getAudioContext();
    playTone(ctx, TONE_NOTES[noteIndex].freq, 200);

    userInputRef.current = [...userInputRef.current, noteIndex];
    const newInput = userInputRef.current;

    const mode = TONE_MODES[modeIndexRef.current];
    const expected = getExpectedAnswer(sequenceRef.current, mode.mode);

    if (newInput.length >= expected.length) {
      const isCorrect = checkAnswer(newInput, expected);
      gameLog('ToneSequence', 'answer', { mode: mode.mode, input: newInput, expected, isCorrect });
      setFeedback(isCorrect ? 'correct' : 'wrong');
      phaseRef.current = 'feedback';

      if (isCorrect) {
        const spanKey = mode.mode === 'forward' ? 'forward'
          : mode.mode === 'backward' ? 'backward'
          : 'sequencing' as const;
        spansRef.current[spanKey] = Math.max(spansRef.current[spanKey], newInput.length);
        consecutiveFailsRef.current = 0;

        setTimeout(() => {
          if (currentLengthRef.current < mode.maxLength) {
            currentLengthRef.current += 1;
            phaseRef.current = 'idle';
            syncDisplay();
          } else {
            advanceMode();
          }
        }, 1000);
      } else {
        consecutiveFailsRef.current += 1;

        setTimeout(() => {
          if (consecutiveFailsRef.current >= 2) {
            advanceMode();
          } else {
            phaseRef.current = 'idle';
            syncDisplay();
          }
        }, 1000);
      }
    }

    syncDisplay();
  }, [getAudioContext, advanceMode, syncDisplay]);

  const undoLastNote = useCallback(() => {
    if (phaseRef.current === 'answering' && userInputRef.current.length > 0) {
      userInputRef.current = userInputRef.current.slice(0, -1);
      syncDisplay();
    }
  }, [syncDisplay]);

  if (!isStarted) {
    const meta = GAME_META['tone-sequence'];
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 py-8 md:py-16">
        <div className="flex items-center justify-center md:w-2/5">
          <ToneSequenceSpecimen />
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
    const s = displayState.spans;
    const result = scoreToneSequence(s.forward, s.backward, s.sequencing);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-8 md:py-16">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{tc('complete')}</h2>
        <div className="space-y-2 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-white">{result.rawScore.toFixed(1)}</div>
          <div className="text-sm text-white/50">{tc('rawScore')}</div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm text-white/60">
          <div>{t('forward')}: <span className="text-white">{s.forward}</span></div>
          <div>{t('backward')}: <span className="text-white">{s.backward}</span></div>
          <div>{t('sequencing')}: <span className="text-white">{s.sequencing}</span></div>
        </div>
      </div>
    );
  }

  const modeLabel = currentMode.mode === 'forward' ? t('forward')
    : currentMode.mode === 'backward' ? t('backward')
    : t('sequencing');

  const expectedLength = sequenceRef.current.length > 0
    ? getExpectedAnswer(sequenceRef.current, currentMode.mode).length
    : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Mode & Progress */}
      <div className="text-center space-y-1">
        <div className="text-xs text-indigo-400 font-mono">{t('mode', { current: displayState.modeIndex + 1 })}</div>
        <div className="text-lg font-semibold text-white">{modeLabel}</div>
        <div className="text-sm text-white/40">{t('length')}: {displayState.currentLength}</div>
      </div>

      {/* Phase indicator */}
      <div className="h-8 flex items-center">
        {displayState.phase === 'idle' && (
          <button onClick={playCurrentSequence} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
            {t('playSequence')}
          </button>
        )}
        {displayState.phase === 'playing' && (
          <div className="text-white/60 animate-pulse">{tc('listening')}</div>
        )}
        {displayState.phase === 'answering' && (
          <div className="text-white/60">
            {t('tapNotes', { current: displayState.userInput.length, total: expectedLength })}
          </div>
        )}
        {displayState.phase === 'feedback' && feedback === 'correct' && (
          <div className="text-green-400">{tc('correct')}</div>
        )}
        {displayState.phase === 'feedback' && feedback === 'wrong' && (
          <div className="text-red-400">{tc('incorrect')}</div>
        )}
      </div>

      {/* User input display */}
      {displayState.phase === 'answering' && displayState.userInput.length > 0 && (
        <div className="flex items-center gap-2">
          {displayState.userInput.map((noteIdx, i) => (
            <span key={i} className="px-3 py-1 bg-indigo-600/30 border border-indigo-500/50 rounded text-white text-sm">
              {TONE_NOTES[noteIdx].name}
            </span>
          ))}
          <button onClick={undoLastNote} className="px-2 py-1 text-white/40 hover:text-white/70 text-xs transition-colors">
            {tc('undo')}
          </button>
        </div>
      )}

      {/* Piano keyboard */}
      <div className="flex gap-1 overflow-x-auto max-w-full pb-2">
        {TONE_NOTES.map((note, i) => (
          <button
            key={note.name}
            onClick={() => handleNoteClick(i)}
            disabled={displayState.phase !== 'answering'}
            className={`
              w-10 sm:w-14 h-16 sm:h-24 shrink-0 rounded-b-lg border text-xs sm:text-sm font-mono transition-all
              ${activeNote === i
                ? 'bg-indigo-500 border-indigo-400 text-white scale-95'
                : displayState.phase === 'answering'
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer'
                  : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
              }
            `}
          >
            {note.name}
          </button>
        ))}
      </div>
    </div>
  );
}
