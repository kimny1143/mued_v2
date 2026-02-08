'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

interface ToneSequenceProps {
  onComplete: (result: ToneSequenceResult) => void;
}

type Phase = 'idle' | 'playing' | 'answering' | 'feedback';

export function ToneSequence({ onComplete }: ToneSequenceProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [userInput, setUserInput] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [activeNote, setActiveNote] = useState<number | null>(null);

  // Use refs for mutable game state to avoid stale closures
  const modeIndexRef = useRef(0);
  const currentLengthRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const sequenceRef = useRef<number[]>([]);
  const spansRef = useRef({ forward: 0, backward: 0, sequencing: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Display state derived from refs (updated via forceUpdate pattern)
  const [displayState, setDisplayState] = useState({
    modeIndex: 0,
    currentLength: 0,
    spans: { forward: 0, backward: 0, sequencing: 0 },
  });

  const syncDisplay = useCallback(() => {
    setDisplayState({
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
    setIsStarted(true);
    setPhase('idle');
    syncDisplay();
  }, [syncDisplay]);

  const advanceMode = useCallback(() => {
    const mi = modeIndexRef.current;
    if (mi + 1 >= TONE_MODES.length) {
      setIsFinished(true);
      const s = spansRef.current;
      onComplete(scoreToneSequence(s.forward, s.backward, s.sequencing));
    } else {
      const nextIdx = mi + 1;
      modeIndexRef.current = nextIdx;
      currentLengthRef.current = TONE_MODES[nextIdx].startLength;
      consecutiveFailsRef.current = 0;
      setPhase('idle');
      syncDisplay();
    }
  }, [onComplete, syncDisplay]);

  const playCurrentSequence = useCallback(async () => {
    const ctx = getAudioContext();
    const length = currentLengthRef.current;
    const seq = generateSequence(length);
    sequenceRef.current = seq;
    setPhase('playing');
    setUserInput([]);
    setFeedback(null);

    for (let i = 0; i < seq.length; i++) {
      setActiveNote(seq[i]);
      await playTone(ctx, TONE_NOTES[seq[i]].freq);
      setActiveNote(null);
      if (i < seq.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setPhase('answering');
  }, [getAudioContext]);

  const handleNoteClick = useCallback((noteIndex: number) => {
    if (phase !== 'answering') return;

    const ctx = getAudioContext();
    playTone(ctx, TONE_NOTES[noteIndex].freq, 200);

    const newInput = [...userInput, noteIndex];
    setUserInput(newInput);

    const mode = TONE_MODES[modeIndexRef.current];
    const expected = getExpectedAnswer(sequenceRef.current, mode.mode);

    if (newInput.length >= expected.length) {
      const isCorrect = checkAnswer(newInput, expected);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setPhase('feedback');

      if (isCorrect) {
        const spanKey = mode.mode === 'forward' ? 'forward'
          : mode.mode === 'backward' ? 'backward'
          : 'sequencing' as const;
        spansRef.current[spanKey] = Math.max(spansRef.current[spanKey], newInput.length);
        consecutiveFailsRef.current = 0;

        setTimeout(() => {
          if (currentLengthRef.current < mode.maxLength) {
            currentLengthRef.current += 1;
            setPhase('idle');
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
            setPhase('idle');
          }
        }, 1000);
      }
    }
  }, [phase, userInput, getAudioContext, advanceMode, syncDisplay]);

  const undoLastNote = useCallback(() => {
    if (phase === 'answering' && userInput.length > 0) {
      setUserInput(prev => prev.slice(0, -1));
    }
  }, [phase, userInput]);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Tone Sequence</h2>
          <p className="text-white/60 max-w-md">
            音の列を聴いて、指定された順序で再現してください。Forward → Backward → Sequencing の3モードがあります。
          </p>
        </div>
        <button onClick={startGame} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          Start
        </button>
      </div>
    );
  }

  if (isFinished) {
    const s = displayState.spans;
    const result = scoreToneSequence(s.forward, s.backward, s.sequencing);
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">Complete!</h2>
        <div className="space-y-2 text-center">
          <div className="text-4xl font-bold text-white">{result.rawScore.toFixed(1)}</div>
          <div className="text-sm text-white/50">Raw Score</div>
        </div>
        <div className="flex gap-6 text-sm text-white/60">
          <div>Forward: <span className="text-white">{s.forward}</span></div>
          <div>Backward: <span className="text-white">{s.backward}</span></div>
          <div>Sequencing: <span className="text-white">{s.sequencing}</span></div>
        </div>
      </div>
    );
  }

  const modeLabel = currentMode.mode === 'forward' ? 'Forward（順方向）'
    : currentMode.mode === 'backward' ? 'Backward（逆方向）'
    : 'Sequencing（低→高順）';

  const expectedLength = sequenceRef.current.length > 0
    ? getExpectedAnswer(sequenceRef.current, currentMode.mode).length
    : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Mode & Progress */}
      <div className="text-center space-y-1">
        <div className="text-xs text-indigo-400 font-mono">Mode {displayState.modeIndex + 1}/3</div>
        <div className="text-lg font-semibold text-white">{modeLabel}</div>
        <div className="text-sm text-white/40">Length: {displayState.currentLength}</div>
      </div>

      {/* Phase indicator */}
      <div className="h-8 flex items-center">
        {phase === 'idle' && (
          <button onClick={playCurrentSequence} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
            Play Sequence
          </button>
        )}
        {phase === 'playing' && (
          <div className="text-white/60 animate-pulse">Listening...</div>
        )}
        {phase === 'answering' && (
          <div className="text-white/60">
            Tap the notes ({userInput.length}/{expectedLength})
          </div>
        )}
        {phase === 'feedback' && feedback === 'correct' && (
          <div className="text-green-400">Correct!</div>
        )}
        {phase === 'feedback' && feedback === 'wrong' && (
          <div className="text-red-400">Incorrect</div>
        )}
      </div>

      {/* User input display */}
      {phase === 'answering' && userInput.length > 0 && (
        <div className="flex items-center gap-2">
          {userInput.map((noteIdx, i) => (
            <span key={i} className="px-3 py-1 bg-indigo-600/30 border border-indigo-500/50 rounded text-white text-sm">
              {TONE_NOTES[noteIdx].name}
            </span>
          ))}
          <button onClick={undoLastNote} className="px-2 py-1 text-white/40 hover:text-white/70 text-xs transition-colors">
            Undo
          </button>
        </div>
      )}

      {/* Piano keyboard */}
      <div className="flex gap-1">
        {TONE_NOTES.map((note, i) => (
          <button
            key={note.name}
            onClick={() => handleNoteClick(i)}
            disabled={phase !== 'answering'}
            className={`
              w-14 h-24 rounded-b-lg border text-sm font-mono transition-all
              ${activeNote === i
                ? 'bg-indigo-500 border-indigo-400 text-white scale-95'
                : phase === 'answering'
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
