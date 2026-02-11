'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  FOCUS_SYMBOLS,
  FOCUS_CONFIG,
  generateStimulusSequence,
  scoreFocusFlow,
  type FocusTrial,
  type FocusFlowResult,
} from '@/lib/muedlobe/games/focusFlow';
import { gameLog } from '@/lib/muedlobe/games/debug';
import { FocusFlowSpecimen } from '@/components/features/lobe/specimens/FocusFlowSpecimen';
import { GAME_META } from '@/lib/muedlobe/constants';

interface FocusFlowProps {
  onComplete: (result: FocusFlowResult) => void;
}

export function FocusFlow({ onComplete }: FocusFlowProps) {
  const t = useTranslations('muedlobe.gameUI.focusFlow');
  const tc = useTranslations('muedlobe.gameUI.common');
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
    const meta = GAME_META['focus-flow'];
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 py-16">
        <div className="flex items-center justify-center md:w-2/5">
          <FocusFlowSpecimen />
        </div>
        <div className="flex flex-col items-center md:items-start gap-6 md:w-3/5">
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
            <p className="text-xs text-white/30">{meta.duration}</p>
          </div>
          <p className="text-white/50 text-sm max-w-md text-center md:text-left">
            {t('description', { target: FOCUS_SYMBOLS[0] })}
          </p>
          <button onClick={startGame} className="px-10 py-3 bg-transparent border border-white/20 text-white/70 rounded-[2px] text-sm tracking-wide hover:text-white/95 hover:border-white/35 transition-colors">
            {tc('start')}
          </button>
        </div>
      </div>
    );
  }

  if (isFinished && resultRef.current) {
    const r = resultRef.current;
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <h2 className="text-2xl font-bold text-white">{tc('complete')}</h2>
        <div className="text-center space-y-1">
          <div className="text-4xl font-bold text-white">{r.rawScore}</div>
          <div className="text-sm text-white/50">{tc('rawScore')}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/60">
          <div>{t('hitRate')}: <span className="text-white">{(r.hitRate * 100).toFixed(0)}%</span></div>
          <div>{t('falseAlarm')}: <span className="text-white">{(r.falseAlarmRate * 100).toFixed(0)}%</span></div>
          <div>d&apos;: <span className="text-white">{r.dPrime}</span></div>
          <div>{t('rtCv')}: <span className="text-white">{r.rtCv}</span></div>
        </div>
      </div>
    );
  }

  if (showTarget) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="text-white/60 text-sm">{t('targetLabel')}:</div>
        <div className="text-8xl text-indigo-400">{FOCUS_SYMBOLS[0]}</div>
        <div className="text-white/40 text-sm">{t('startingIn')}</div>
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
        {t('clickOrSpace', { target: FOCUS_SYMBOLS[0] })}
      </div>
    </div>
  );
}
