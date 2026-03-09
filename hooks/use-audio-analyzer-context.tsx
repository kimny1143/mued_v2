'use client';

import { createContext, useContext, useCallback, useState, useRef, type ReactNode, type RefObject } from 'react';
import { useAudioAnalyzer, type AnalyzerData } from './use-audio-analyzer';

// ─── Context ─────────────────────────────────────────────────────────────────

interface AudioAnalyzerContextValue {
  /** Current analyzer data (null when inactive) */
  data: AnalyzerData | null;
  /** Whether the analyzer is connected and running */
  isActive: boolean;
  /** Connect an <audio> element to the analyzer */
  connect: () => void;
  /** The ref to attach to any <audio> element */
  audioRef: RefObject<HTMLAudioElement | null>;
}

const AudioAnalyzerContext = createContext<AudioAnalyzerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AudioAnalyzerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { data, isActive, connect } = useAudioAnalyzer(audioRef);

  return (
    <AudioAnalyzerContext.Provider value={{ data, isActive, connect, audioRef }}>
      {children}
    </AudioAnalyzerContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAudioAnalyzerContext() {
  const ctx = useContext(AudioAnalyzerContext);
  if (!ctx) {
    throw new Error('useAudioAnalyzerContext must be used within <AudioAnalyzerProvider>');
  }
  return ctx;
}
