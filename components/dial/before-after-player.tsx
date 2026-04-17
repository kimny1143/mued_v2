'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useAudioAnalyzer } from '@/hooks/use-audio-analyzer';

interface Props {
  beforeUrl: string;
  afterUrl: string;
}

const SPOTIFY_TARGET = -14;
const SPOTIFY_TOLERANCE = 1;

export function BeforeAfterPlayer({ beforeUrl, afterUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { data, connect } = useAudioAnalyzer(audioRef);
  const [source, setSource] = useState<'before' | 'after'>('after');
  const [isPlaying, setIsPlaying] = useState(false);

  const currentUrl = source === 'before' ? beforeUrl : afterUrl;

  // Switch source: update src, reconnect analyzer, resume if playing
  const switchSource = useCallback((next: 'before' | 'after') => {
    const el = audioRef.current;
    if (!el || next === source) return;
    const wasPlaying = !el.paused;
    const pos = el.currentTime;
    el.src = next === 'before' ? beforeUrl : afterUrl;
    el.load();
    connect();
    el.currentTime = pos;
    if (wasPlaying) el.play().catch(() => {});
    setSource(next);
  }, [source, beforeUrl, afterUrl, connect]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const lufs = data?.integratedLufs ?? null;
  const momentary = data?.momentaryLufs ?? null;
  const atSpotify = lufs !== null && Math.abs(lufs - SPOTIFY_TARGET) <= SPOTIFY_TOLERANCE;

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Before / After</span>
        {atSpotify && (
          <span className="text-xs text-green-400 font-medium">✓ Spotify −14 LUFS</span>
        )}
      </div>

      {/* Source toggle + play */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchSource('before')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            source === 'before'
              ? 'bg-zinc-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Before
        </button>
        <button
          onClick={() => switchSource('after')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            source === 'after'
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          After
        </button>

        <button
          onClick={togglePlay}
          className="ml-auto w-9 h-9 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <span className="w-3 h-3 flex gap-0.5">
              <span className="w-1 h-full bg-white rounded-sm" />
              <span className="w-1 h-full bg-white rounded-sm" />
            </span>
          ) : (
            <span className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-white ml-0.5" />
          )}
        </button>
      </div>

      {/* LUFS display */}
      <div className="flex gap-6 text-xs text-zinc-500">
        <div>
          <span className="block text-zinc-600 mb-0.5">Momentary</span>
          <span className={`font-mono text-sm ${momentary !== null && momentary > -20 ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {momentary !== null ? `${momentary.toFixed(1)} LUFS` : '—'}
          </span>
        </div>
        <div>
          <span className="block text-zinc-600 mb-0.5">Integrated</span>
          <span className={`font-mono text-sm ${atSpotify ? 'text-green-400' : lufs !== null ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {lufs !== null ? `${lufs.toFixed(1)} LUFS` : '—'}
          </span>
        </div>
        <div className="ml-auto self-end text-zinc-600">
          Target: {SPOTIFY_TARGET} LUFS
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentUrl}
        onPlay={connect}
        className="hidden"
      />
    </div>
  );
}
