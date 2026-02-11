'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  FOCUS_SYMBOLS,
  FOCUS_CONFIG,
  generateStimulusSequence,
  scoreFocusFlow,
  type FocusTrial,
  type FocusFlowResult,
} from '@/lib/muedlobe/games/focusFlow';
import { gameLog } from '@/lib/muedlobe/games/debug';

interface FocusFlowProps {
  onComplete: (result: FocusFlowResult) => void;
}

export function FocusFlow({ onComplete }: FocusFlowProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showTarget, setShowTarget] = useState(true);
  const [clickFlash, setClickFlash] = useState(false);

  const sequenceRef = useRef<ReturnType<typeof generateStimulusSequence>>([]);
  const trialsRef = useRef<FocusTrial[]>([]);
  const currentIndexRef = useRef(0);
  const stimulusStartRef = useRef(0);
  const respondedRef = useRef(false);
  const gameLoopRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resultRef = useRef<FocusFlowResult | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const playClickSound = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, []);

  const recordResponse = useCallback(() => {
    if (respondedRef.current) return;
    respondedRef.current = true;

    const idx = currentIndexRef.current;
    const trial = trialsRef.current[idx];
    if (trial) {
      trial.responded = true;
      trial.responseTime = Date.now() - stimulusStartRef.current;
      gameLog('FocusFlow', 'response', { index: idx, isTarget: trial.isTarget, responseTime: trial.responseTime });
    }
  }, []);

  const presentNextStimulus = useCallback(() => {
    const sequence = sequenceRef.current;
    const idx = currentIndexRef.current;

    if (idx >= sequence.length) {
      // Game over
      const result = scoreFocusFlow(trialsRef.current);
      gameLog('FocusFlow', 'complete', { rawScore: result.rawScore, dPrime: result.dPrime, hits: result.hits, misses: result.misses });
      resultRef.current = result;
      setIsFinished(true);
      setCurrentSymbol(null);
      onComplete(result);
      return;
    }

    const stimulus = sequence[idx];
    respondedRef.current = false;

    // Initialize trial
    trialsRef.current[idx] = {
      symbolIndex: stimulus.symbolIndex,
      isTarget: stimulus.isTarget,
      responded: false,
      responseTime: null,
    };

    // Show stimulus
    stimulusStartRef.current = Date.now();
    setCurrentSymbol(FOCUS_SYMBOLS[stimulus.symbolIndex]);
    setProgress(idx / sequence.length);

    // Hide after duration
    gameLoopRef.current = setTimeout(() => {
      setCurrentSymbol(null);

      // Wait ISI then present next
      gameLoopRef.current = setTimeout(() => {
        currentIndexRef.current = idx + 1;
        presentNextStimulus();
      }, FOCUS_CONFIG.interStimulusInterval - FOCUS_CONFIG.stimulusDuration);
    }, FOCUS_CONFIG.stimulusDuration);
  }, [onComplete]);

  const startGame = useCallback(() => {
    sequenceRef.current = generateStimulusSequence();
    trialsRef.current = [];
    currentIndexRef.current = 0;
    setIsStarted(true);
    setShowTarget(true);

    // Show target instruction for 3 seconds, then start
    setTimeout(() => {
      setShowTarget(false);
      presentNextStimulus();
    }, 3000);
  }, [presentNextStimulus]);

  // Click/tap to respond
  const handleResponse = useCallback(() => {
    if (!isStarted || isFinished) return;
    recordResponse();
    playClickSound();
    setClickFlash(true);
    setTimeout(() => setClickFlash(false), 100);
  }, [isStarted, isFinished, recordResponse, playClickSound]);

  // Keyboard support (spacebar)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleResponse]);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Focus Flow</h2>
          <p className="text-white/60 max-w-md">
            画面に記号が次々と表示されます。ターゲット「{FOCUS_SYMBOLS[0]}」が出たらすぐにクリック（またはスペースキー）してください。他の記号には反応しないでください。
          </p>
          <p className="text-xs text-white/40">約3分間。集中力を測定します。</p>
        </div>
        <button onClick={startGame} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          Start
        </button>
      </div>
    );
  }

  if (isFinished && resultRef.current) {
    const r = resultRef.current;
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">Complete!</h2>
        <div className="text-center space-y-1">
          <div className="text-4xl font-bold text-white">{r.rawScore}</div>
          <div className="text-sm text-white/50">Raw Score</div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/60">
          <div>Hit Rate: <span className="text-white">{(r.hitRate * 100).toFixed(0)}%</span></div>
          <div>False Alarm: <span className="text-white">{(r.falseAlarmRate * 100).toFixed(0)}%</span></div>
          <div>d&apos;: <span className="text-white">{r.dPrime}</span></div>
          <div>RT CV: <span className="text-white">{r.rtCv}</span></div>
        </div>
      </div>
    );
  }

  if (showTarget) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="text-white/60 text-sm">Target:</div>
        <div className="text-8xl text-indigo-400">{FOCUS_SYMBOLS[0]}</div>
        <div className="text-white/40 text-sm">Starting in 3 seconds...</div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-8 min-h-[400px] cursor-pointer select-none"
      onClick={handleResponse}
    >
      {/* Progress bar */}
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Stimulus area */}
      <div className={`w-40 h-40 flex items-center justify-center rounded-full transition-shadow duration-100 ${
        clickFlash ? 'shadow-[0_0_0_3px_rgba(129,140,248,0.6)]' : ''
      }`}>
        {currentSymbol ? (
          <span className="text-8xl text-white">{currentSymbol}</span>
        ) : (
          <span className="text-white/10 text-2xl">+</span>
        )}
      </div>

      <div className="text-xs text-white/20">
        Click or press Space when you see {FOCUS_SYMBOLS[0]}
      </div>
    </div>
  );
}
