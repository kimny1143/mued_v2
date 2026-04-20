'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMultiTakePlayer, type TakeDef } from '@/hooks/use-multi-take-player';
import { useMultiTakeAnalyzerData } from '@/hooks/use-multi-take-analyzer-data';
import { useStemPeaks } from '@/hooks/use-stem-peaks';
import { usePerStemPeak } from '@/hooks/use-per-stem-peak';
import { useLocale } from '@/lib/i18n/locale-context';
import { Micro, Readout, Btn } from './atoms';
import { IconPlay, IconPause, IconSkipBack, IconSpinner } from './icons';
import { OverviewWave, genPeaks, seededRand, type PeakPoint } from './waveform';
import { TakeHistory, groupTakeEntries, type TakeSub } from './take-pills';
import type { TakeStage } from '@/components/dial/unified-session-player';
import { StemPanel, type StemData, type StemUpdate } from './stem-panel';
import { AnalyzerCluster } from './analyzer';
import { ChatPanelV2, type ChatPanelV2Props } from './chat';
import type { TakeEntry, StemParamChange } from '@/components/dial/unified-session-player';
import { measureIntegratedLufs } from '@/lib/audio/measure-lufs';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEM_COLORS = [
  '#5d8ab8', // blue
  '#4ea674', // emerald
  '#b8835d', // warm
  '#8b5db8', // violet
  '#b85d7a', // rose
  '#5db88b', // teal
  '#b8b05d', // gold
  '#7a8fb8', // slate-blue
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Derive a stable integer seed from a string (sessionId) */
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Convert useStemPeaks output (number[]) → PeakPoint[] for StemWave */
function toPeakPoints(raw: number[]): PeakPoint[] {
  return raw.map((v) => ({ min: -v, max: v }));
}

/** Normalize stem key: strip extension + _normalized suffix */
function normalizeBase(k: string): string {
  return k.replace(/\.[^.]+$/, '').replace(/_normalized$/i, '').toLowerCase();
}

// ─── TransportBar ─────────────────────────────────────────────────────────────

interface TransportAction {
  label: string;
  onClick(): void;
  variant: 'amber' | 'emerald';
  disabled?: boolean;
  testId?: string;
}

interface TransportBarProps {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay(): void;
  onPause(): void;
  onSeekToStart(): void;
  actions?: TransportAction[];
}

function TransportBar({ isReady, isPlaying, currentTime, duration, onPlay, onPause, onSeekToStart, actions }: TransportBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid var(--line-soft)' }}>
      <Btn onClick={onSeekToStart} disabled={!isReady} title="Return to start">
        <IconSkipBack size={11} />
      </Btn>
      <Btn
        onClick={isPlaying ? onPause : onPlay}
        disabled={!isReady}
        active={isPlaying}
        className="w-8 justify-center"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {!isReady ? <IconSpinner size={11} /> : isPlaying ? <IconPause size={12} /> : <IconPlay size={12} />}
      </Btn>
      <div className="flex-1" />
      <Readout
        value={formatTime(currentTime)}
        size="sm"
        tone="var(--fg-1)"
        className="tabular-nums"
      />
      <Micro tone="var(--fg-3)">/</Micro>
      <Readout
        value={formatTime(duration)}
        size="sm"
        tone="var(--fg-3)"
        className="tabular-nums"
      />
      {actions && actions.length > 0 && (
        <>
          <div className="w-px h-4 mx-1" style={{ background: 'var(--line-soft)' }} />
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              disabled={a.disabled}
              data-testid={a.testId}
              className="h-7 px-3 rounded-[3px] text-[11px] mono font-medium tracking-wide transition-colors disabled:opacity-40"
              style={
                a.variant === 'emerald'
                  ? { background: 'var(--emerald)', color: '#081a0f' }
                  : { background: 'var(--amber)', color: '#1a1200' }
              }
            >
              {a.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ─── SessionHeader ─────────────────────────────────────────────────────────────

interface SessionHeaderProps {
  title: string | null | undefined;
  draftNumber: number | null | undefined;
  sampleRate?: number;
  bitDepth?: number;
  activeTakeLabel?: string;
}

function SessionHeader({ title, draftNumber, sampleRate, bitDepth, activeTakeLabel }: SessionHeaderProps) {
  const displayTitle = title || (draftNumber ? `Session #${draftNumber}` : 'Session');
  return (
    <div className="h-9 px-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--line-soft)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-0)' }}>
          {displayTitle}
        </span>
        {activeTakeLabel && (
          <Micro tone="var(--fg-3)">{activeTakeLabel}</Micro>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {sampleRate && sampleRate > 0 && (
          <Readout value={`${(sampleRate / 1000).toFixed(1)}k`} unit="Hz" size="xs" tone="var(--fg-3)" />
        )}
        {bitDepth && bitDepth > 0 && (
          <Readout value={bitDepth} unit="bit" size="xs" tone="var(--fg-3)" />
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UnifiedSessionPlayerV2Props {
  takes: TakeEntry[];
  sessionId: string;
  guestToken?: string | null;
  initialParams?: StemParamChange[];
  sessionTitle?: string | null;
  draftNumber?: number | null;
  sampleRate?: number;
  bitDepth?: number;
  compact?: boolean; // accepted for API compatibility, not used in v2 layout
  stemLabelMap?: Record<string, string>; // track UUID → short display label (e.g. BASS, VOCAL)
  /** RAW take integrated loudness (LUFS) — used to level-match RAW to -14 LUFS target. */
  rawLoudnessLufs?: number | null;
  // Chat props — omit to render player-only (no chat column)
  chatProps?: Omit<ChatPanelV2Props, 'className'>;
}

// ─── UnifiedSessionPlayerV2 ───────────────────────────────────────────────────

export function UnifiedSessionPlayerV2({
  takes,
  initialParams,
  sessionTitle,
  draftNumber,
  sampleRate,
  bitDepth,
  chatProps,
  stemLabelMap,
  rawLoudnessLufs,
  compact: _compact,
}: UnifiedSessionPlayerV2Props) {
  const TARGET_LUFS = -18; // RoEx outputs ~-17.8 LUFS; -14 made RAW 4dB louder than MIXED

  // Only pass enabled (ready) takes to the player hook
  const takeDefs: TakeDef[] = useMemo(() =>
    takes
      .filter((t) => t.enabled)
      .map((t) => ({
        id: t.id,
        label: t.label,
        stemUrls: t.stemsUrls ?? { main: t.url },
        ...(t.label === 'RAW' && rawLoudnessLufs != null
          ? { gainOffsetDb: TARGET_LUFS - rawLoudnessLufs }
          : {}),
      })),
    [takes, rawLoudnessLufs],
  );

  const {
    isReady, isPlaying, isDecoding, decodeProgress, takeDecodeStatus,
    currentTime, duration, activeTakeId,
    setActiveTake, play, pause, seek,
    stemStates, toggleStemMute, toggleStemSolo, setStemGain, setStemPan,
    analyserNode, analyserL, analyserR, sampleRate: audioSampleRate,
    getStemAnalysers,
    getTakeBuffer, updateTakeGainOffset,
    momentaryLufs, shortTermLufs, integratedLufs,
  } = useMultiTakePlayer(takeDefs);

  // In-browser LUFS measurement for RAW take when analysisResult is unavailable.
  // Runs once after RAW decode completes; caches per-take to avoid re-measurement.
  const measuredTakesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (rawLoudnessLufs != null) return; // server-side value available — no need to measure
    const rawTakeDef = takeDefs.find((t) => t.label === 'RAW');
    if (!rawTakeDef) return;
    const { id: rawTakeId } = rawTakeDef;
    if (takeDecodeStatus[rawTakeId] !== 'ready') return;
    if (measuredTakesRef.current.has(rawTakeId)) return;
    measuredTakesRef.current.add(rawTakeId);

    const buffer = getTakeBuffer(rawTakeId, 'main');
    if (!buffer) return;

    measureIntegratedLufs(buffer).then((measuredLufs) => {
      const gainOffsetDb = TARGET_LUFS - measuredLufs;
      updateTakeGainOffset(rawTakeId, gainOffsetDb);
      console.log(`[dial:lufs] RAW in-browser: ${measuredLufs.toFixed(1)} LUFS → gainOffset ${gainOffsetDb.toFixed(1)} dB`);
    }).catch((e) => {
      console.warn('[dial:lufs] RAW LUFS measurement failed:', e);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeDecodeStatus, rawLoudnessLufs]);

  const analyzerData = useMultiTakeAnalyzerData({
    analyser: analyserNode,
    analyserL,
    analyserR,
    sampleRate: audioSampleRate,
    momentaryLufs,
    shortTermLufs,
    integratedLufs,
  });

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? takes[0];
  const activeStemUrls = activeTake?.stemsUrls ?? null;
  const stemNames = useMemo(() => activeStemUrls ? Object.keys(activeStemUrls) : [], [activeStemUrls]);
  const showStemPanel = activeTake?.label === 'RAW' || activeTake?.label === 'MIXED';

  // Per-stem peak meter (via AnalyserNode tap added in v2.4)
  const stemAnalysers = getStemAnalysers(activeTakeId);
  const perStemPeakDb = usePerStemPeak(stemAnalysers);

  // Waveform peaks from audio decode (cached)
  const stemPeaks = useStemPeaks(activeTakeId, activeStemUrls);

  // Overview waveform — generated from seed (sessionId hash) for instant display
  // Real peak computation happens asynchronously in useStemPeaks
  const overviewPeaks = useMemo(() => {
    if (stemNames.length === 0) return genPeaks(0, 220);
    // Mix first two stems' peaks if available; else use generated
    const firstStemName = stemNames[0];
    const firstPeaks = stemPeaks[firstStemName];
    if (firstPeaks && firstPeaks.length > 0) {
      return firstPeaks.map((v) => ({ min: -v, max: v })) as PeakPoint[];
    }
    const seed = strHash(activeTakeId || 'default');
    return genPeaks(seed, 220, 'mid');
  }, [stemNames, stemPeaks, activeTakeId]);

  // Normalize initialParams map: normalizedBase → {gainDb, pan}
  const initialStemMap = useMemo(() => {
    if (!Array.isArray(initialParams) || initialParams.length === 0) return {} as Record<string, { gainDb: number; pan: number }>;
    return Object.fromEntries(
      initialParams.map((p) => [
        normalizeBase(p.track),
        {
          gainDb: p.changes?.gainDb ?? 0,
          pan: p.changes?.panAngleDegrees != null
            ? Math.max(-1, Math.min(1, p.changes.panAngleDegrees / 90))
            : 0,
        },
      ]),
    );
  }, [initialParams]);

  // Build StemData[] for StemPanel
  const stemDataList: StemData[] = useMemo(() => {
    const r = seededRand(strHash(activeTakeId || 'x'));
    return stemNames.map((name, i) => {
      const state = stemStates[activeTakeId]?.[name] ?? { muted: false, solo: false };
      const rawPeaks = stemPeaks[name] ?? [];
      const colorIdx = i % STEM_COLORS.length;
      const shape = i === 0 ? 'mid' : i % 3 === 0 ? 'kick' : 'hat';
      const peaks = rawPeaks.length > 0
        ? toPeakPoints(rawPeaks.slice(0, 120))
        : genPeaks(Math.floor(r() * 10000), 120, shape as 'mid' | 'kick' | 'hat');

      const baseKey = normalizeBase(name);
      const initParams = initialStemMap[baseKey];

      return {
        id: name,
        name: stemLabelMap?.[normalizeBase(name)] ?? normalizeBase(name),
        color: STEM_COLORS[colorIdx],
        peaks,
        gainDb: initParams?.gainDb ?? 0,
        pan: initParams?.pan ?? 0,
        muted: state.muted,
        soloed: state.solo,
        peakDb: perStemPeakDb[name] ?? -60,
      };
    });
  }, [stemNames, stemStates, activeTakeId, stemPeaks, initialStemMap, perStemPeakDb, stemLabelMap]);

  const initialGainDbMap = useMemo(() =>
    Object.fromEntries(stemDataList.map((s) => [s.id, s.gainDb])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTakeId],
  );

  const initialPanMap = useMemo(() =>
    Object.fromEntries(stemDataList.map((s) => [s.id, s.pan])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTakeId],
  );

  const handleStemUpdate = useCallback((stemId: string, patch: StemUpdate) => {
    if (patch.mute !== undefined) toggleStemMute(activeTakeId, stemId);
    if (patch.solo !== undefined) toggleStemSolo(activeTakeId, stemId);
    if (patch.gainDb !== undefined) setStemGain(activeTakeId, stemId, patch.gainDb);
    if (patch.pan !== undefined) setStemPan(activeTakeId, stemId, patch.pan);
  }, [activeTakeId, toggleStemMute, toggleStemSolo, setStemGain, setStemPan]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, play, pause]);

  const handleSeekToStart = useCallback(() => seek(0), [seek]);

  const handleOverviewSeek = useCallback((pos: number) => {
    seek(pos * duration);
  }, [seek, duration]);

  const playhead = duration > 0 ? currentTime / duration : 0;

  // Take groups + drawer state for TakeHistory
  const takeGroups = useMemo(() => groupTakeEntries(takes), [takes]);
  const [takeDrawerOpen, setTakeDrawerOpen] = useState(false);

  // Derive activeTake (TakeStage) and activeSub (TakeSub) from activeTakeId
  const activeTakeStage = useMemo((): TakeStage => {
    const t = takes.find((t) => t.id === activeTakeId);
    return t?.label ?? 'RAW';
  }, [takes, activeTakeId]);

  const activeTakeSub = useMemo((): TakeSub | null => {
    for (const group of takeGroups) {
      const sub = group.subs.find((s) => s.id === activeTakeId);
      if (sub) return sub;
    }
    return null;
  }, [takeGroups, activeTakeId]);

  const handlePickTake = useCallback((key: TakeStage, subId: string) => {
    void key; // key is informational — we route by ID
    setActiveTake(subId);
  }, [setActiveTake]);

  // Active take label for header and analyzer reset
  const activeTakeObj = takes.find((t) => t.id === activeTakeId);
  const activeTakeLabel = activeTakeObj?.sublabel ?? activeTakeObj?.label ?? '';

  // Derived sampleRate / bitDepth: prefer analysisResult prop, fall back to AudioContext rate
  const displaySampleRate = sampleRate ?? (audioSampleRate !== 44100 ? audioSampleRate : undefined);
  const displayBitDepth = bitDepth;

  const { t } = useLocale();

  // B10: action buttons in transport bar — stage-based display (replaces chat ParamChangeCard buttons)
  const transportActions = useMemo((): TransportAction[] => {
    if (!chatProps) return [];
    const hasMixed = takes.some((take) => take.enabled && take.label === 'MIXED');
    const hasMastered = takes.some((take) => take.enabled && take.label === 'MASTERED');
    const isGenerating = chatProps.generating ?? false;

    if (chatProps.isMasteringPhase && !hasMastered) {
      return [{
        label: isGenerating ? t.dial.chat.generating : t.dial.stemPanel.generateMaster,
        onClick: () => chatProps.onMasteringFinalRequested?.(),
        variant: 'emerald',
        disabled: isGenerating,
        testId: 'dial-transport-generate-master',
      }];
    }

    if (!hasMixed) {
      return [{
        label: isGenerating ? t.dial.chat.generating : t.dial.stemPanel.generatePreview,
        onClick: () => chatProps.onPreviewRequested?.(),
        variant: 'amber',
        disabled: isGenerating,
        testId: 'dial-transport-generate-preview',
      }];
    }

    if (!hasMastered) {
      const actions: TransportAction[] = [];
      if (chatProps.mode === 'dialogue') {
        actions.push({
          label: isGenerating ? t.dial.chat.generating : t.dial.stemPanel.generateMixCheck,
          onClick: () => chatProps.onMixCheckRequested?.(),
          variant: 'amber',
          disabled: isGenerating,
          testId: 'dial-transport-generate-mix-check',
        });
      }
      actions.push({
        label: isGenerating ? t.dial.chat.generating : t.dial.stemPanel.generateFinal,
        onClick: () => chatProps.onFinalRequested?.(),
        variant: 'emerald',
        disabled: isGenerating,
        testId: 'dial-transport-generate-final',
      });
      return actions;
    }

    return [];
  }, [chatProps, takes, t]);

  return (
    <div className="flex min-h-0 h-full gap-0" style={{ background: 'var(--ink-0)' }}>

      {/* ── LEFT: Player column ──────────────────────────────────────────────── */}
      <div
        className="flex-1 min-w-0 flex flex-col overflow-y-auto"
        style={chatProps ? { borderRight: '1px solid var(--line)' } : undefined}
      >
        <SessionHeader
          title={sessionTitle}
          draftNumber={draftNumber}
          sampleRate={displaySampleRate}
          bitDepth={displayBitDepth}
          activeTakeLabel={activeTakeLabel}
        />

        {/* Take Selector */}
        <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--line-soft)' }}>
          <TakeHistory
            open={takeDrawerOpen}
            takes={takeGroups}
            activeTake={activeTakeStage}
            activeSub={activeTakeSub}
            onPick={handlePickTake}
            onToggle={() => setTakeDrawerOpen((v) => !v)}
            takeDecodeStatus={takeDecodeStatus}
          />
        </div>

        {/* Overview waveform */}
        <div className="px-3 pt-2 flex-shrink-0">
          <OverviewWave
            peaks={overviewPeaks}
            playhead={playhead}
            onSeek={handleOverviewSeek}
          />
        </div>

        {/* Decode progress — active take buffering */}
        {isDecoding && !isReady && decodeProgress.total > 0 && (
          <div className="px-3 py-[3px] flex-shrink-0">
            <Micro tone="var(--fg-3)">
              Decoding audio… {decodeProgress.done}/{decodeProgress.total}
            </Micro>
          </div>
        )}

        {/* Transport */}
        <TransportBar
          isReady={isReady}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlay={handlePlayPause}
          onPause={handlePlayPause}
          onSeekToStart={handleSeekToStart}
          actions={transportActions}
        />

        {/* Analyzer — always visible, fixed above StemPanel (B7: DAW master section convention) */}
        <div className="flex-shrink-0 mt-0">
          <AnalyzerCluster
            data={analyzerData}
            activeTakeLabel={activeTakeLabel}
          />
        </div>

        {/* Stem Panel — RAW/MIXED only, below Analyzer, scrollable */}
        {showStemPanel && stemDataList.length > 0 && (
          <div className="flex-shrink-0 max-h-64 overflow-y-auto">
            <StemPanel
              stems={stemDataList}
              playhead={playhead}
              initialGainDbMap={initialGainDbMap}
              initialPanMap={initialPanMap}
              onUpdateStem={handleStemUpdate}
            />
          </div>
        )}
      </div>

      {/* ── RIGHT: Chat column — only when chatProps provided ───────────────── */}
      {chatProps && (
        <div className="shrink-0 w-[440px] flex flex-col" style={{ minHeight: 0 }}>
          <ChatPanelV2
            {...chatProps}
            className="flex-1 min-h-0 rounded-none border-0"
          />
        </div>
      )}
    </div>
  );
}
