'use client';

import { useState, useEffect } from 'react';
import { useMultiStemPlayer } from '@/hooks/use-multi-stem-player';

interface ParameterChange {
  track: string;
  reason: string;
}

interface Props {
  stemsUrls: Record<string, string>;
  sessionId: string;
  headers: Record<string, string>;
  compact?: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function matchReason(stemFileName: string, changes: ParameterChange[]): string | null {
  const base = stemFileName.toLowerCase().replace(/\.[^.]+$/, '');
  for (const pc of changes) {
    const t = pc.track.toLowerCase();
    if (t === base || base.includes(t) || t.includes(base)) {
      return pc.reason;
    }
  }
  return null;
}

export function MultiStemPanel({ stemsUrls, sessionId, headers, compact }: Props) {
  const [paramChanges, setParamChanges] = useState<ParameterChange[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { isReady, isPlaying, currentTime, duration, stems, play, pause, toggleMute, toggleSolo } =
    useMultiStemPlayer({
      stemUrls: stemsUrls,
      onError: (err) => setLoadError(err.message),
    });

  useEffect(() => {
    fetch(`/api/dial/chat?sessionId=${sessionId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const msgs: Array<{ role: string; parameterChanges?: ParameterChange[] | null }> = data.data.messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.role === 'assistant' && msg.parameterChanges?.length) {
            setParamChanges(msg.parameterChanges);
            break;
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const stemNames = Object.keys(stemsUrls);

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Stem Tracks</span>
        {!isReady && !loadError && (
          <span className="text-xs text-zinc-500 animate-pulse">Loading stems…</span>
        )}
        {loadError && (
          <span className="text-xs text-red-400">Load failed</span>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? pause : play}
          disabled={!isReady}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        <span className="font-mono text-xs text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Stem rows */}
      <div className="space-y-2">
        {stemNames.map((stemName) => {
          const stemState = stems[stemName] ?? { muted: false, solo: false };
          const reason = matchReason(stemName, paramChanges);
          const displayName = stemName.replace(/\.[^.]+$/, '');
          const anySoloed = Object.values(stems).some((s) => s.solo);
          const isActive = !anySoloed ? !stemState.muted : stemState.solo;

          return (
            <div key={stemName} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium capitalize block truncate">{displayName}</span>
                {reason && (
                  <span className="text-xs text-zinc-500 block mt-0.5 leading-snug line-clamp-2">{reason}</span>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => toggleMute(stemName)}
                  aria-label={`${stemState.muted ? 'Unmute' : 'Mute'} ${displayName}`}
                  aria-pressed={stemState.muted}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    stemState.muted
                      ? 'bg-red-600/80 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(stemName)}
                  aria-label={`${stemState.solo ? 'Unsolo' : 'Solo'} ${displayName}`}
                  aria-pressed={stemState.solo}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    stemState.solo
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
