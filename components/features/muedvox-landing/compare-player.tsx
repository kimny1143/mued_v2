"use client";

// The /muedvox listening example: one song, four takes (Before / After × Mix / Vocals only), switched while it plays.
//
// ★All four takes run at once from the same start instant and only their gains change — so a switch never restarts
//   or re-seeks anything, and the takes cannot drift apart (they are the same length and start on the same sample;
//   tests/unit/muedvox-compare-player.test.tsx pins both). Swapping one <audio>'s src (the /muedial player) leaves a
//   gap while the next file loads, which is exactly what an A/B of a vocal must not have.
// ★Nothing is fetched until Play is pressed (no autoplay, no preload): four files per example, ~0.5 MB each.
import { useCallback, useEffect, useRef, useState } from "react";
import type { MuedvoxAudioExample, MuedvoxAudioTake } from "@/lib/muedvox/config";

export type CompareSide = "before" | "after";
export type CompareLayer = "mix" | "vocal";
export const TAKES: readonly MuedvoxAudioTake[] = ["mix_before", "mix_after", "vocal_before", "vocal_after"];
export const takeOf = (layer: CompareLayer, side: CompareSide): MuedvoxAudioTake => `${layer}_${side}`;

export type ComparePlayerLabels = {
  play: string; pause: string; position: string; loading: string; failed: string;
  sideGroup: string; layerGroup: string;
  before: string; after: string; mix: string; vocal: string;
};

/** Long enough that a gain change does not click, short enough to feel like a switch. */
const SWITCH_SECONDS = 0.015;

type Engine = {
  buffers: Record<MuedvoxAudioTake, AudioBuffer>;
  gains: Record<MuedvoxAudioTake, GainNode>;
  sources: AudioBufferSourceNode[];
  duration: number;
};

let sharedContext: AudioContext | null = null;
function audioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedContext = new Ctor();
    // iOS plays Web Audio as "ambient" (silenced by the ring switch) unless told it is media playback.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  }
  return sharedContext;
}

/** The example that is sounding. Starting another one stops it — two songs never overlap. */
let stopCurrent: (() => void) | null = null;

const formatTime = (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, "0")}`;

export function ComparePlayer({ example, labels }: { example: MuedvoxAudioExample; labels: ComparePlayerLabels }) {
  const [side, setSide] = useState<CompareSide>("before");
  const [layer, setLayer] = useState<CompareLayer>("mix");
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "failed">("idle");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const engine = useRef<Engine | null>(null);
  const loading = useRef<Promise<Engine> | null>(null);
  const startedAt = useRef(0); // context time at which position 0 would have sounded
  const offset = useRef(0); // where playback resumes from while not playing
  const audible = useRef<MuedvoxAudioTake>("mix_before");
  const frame = useRef(0);
  const ownStop = useRef<() => void>(() => {});

  const haltSources = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const current = engine.current;
    if (!current) return;
    for (const source of current.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* never started */ }
      source.disconnect();
    }
    current.sources = [];
  }, []);

  const pause = useCallback(() => {
    const current = engine.current;
    if (current && current.sources.length > 0) {
      offset.current = Math.min(current.duration, Math.max(0, audioContext().currentTime - startedAt.current));
    }
    haltSources();
    setPosition(offset.current);
    setStatus((now) => (now === "playing" ? "paused" : now));
    if (stopCurrent === ownStop.current) stopCurrent = null;
  }, [haltSources]);

  const load = useCallback((): Promise<Engine> => {
    if (engine.current) return Promise.resolve(engine.current);
    if (!loading.current) {
      const context = audioContext();
      loading.current = Promise.all(TAKES.map(async (take) => {
        const response = await fetch(example.files[take]);
        if (!response.ok) throw new Error(`${example.files[take]}: ${response.status}`);
        return context.decodeAudioData(await response.arrayBuffer());
      })).then((decoded) => {
        const buffers = {} as Engine["buffers"];
        const gains = {} as Engine["gains"];
        TAKES.forEach((take, index) => {
          buffers[take] = decoded[index];
          gains[take] = context.createGain();
          gains[take].gain.value = take === audible.current ? 1 : 0;
          gains[take].connect(context.destination);
        });
        engine.current = { buffers, gains, sources: [], duration: Math.min(...decoded.map((buffer) => buffer.duration)) };
        setDuration(engine.current.duration);
        return engine.current;
      }).finally(() => { loading.current = null; });
    }
    return loading.current;
  }, [example]);

  const startFrom = useCallback((current: Engine, from: number) => {
    const context = audioContext();
    haltSources();
    const begin = from >= current.duration ? 0 : from;
    const when = context.currentTime + 0.03;
    current.sources = TAKES.map((take) => {
      const source = context.createBufferSource();
      source.buffer = current.buffers[take];
      source.connect(current.gains[take]);
      source.start(when, begin); // ★the same `when` and offset for all four: this is what keeps them aligned
      return source;
    });
    current.sources[0].onended = () => {
      offset.current = 0;
      haltSources();
      setPosition(0);
      setStatus("paused");
      if (stopCurrent === ownStop.current) stopCurrent = null;
    };
    startedAt.current = when - begin;
    const tick = () => {
      setPosition(Math.min(current.duration, Math.max(0, context.currentTime - startedAt.current)));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [haltSources]);

  const play = useCallback(async () => {
    if (stopCurrent && stopCurrent !== ownStop.current) stopCurrent();
    stopCurrent = ownStop.current;
    const context = audioContext();
    void context.resume(); // inside the click: browsers only start audio from a user gesture
    try {
      if (!engine.current) setStatus("loading");
      const current = await load();
      if (stopCurrent !== ownStop.current) { setStatus("paused"); return; } // another example started meanwhile
      startFrom(current, offset.current);
      setStatus("playing");
    } catch {
      if (stopCurrent === ownStop.current) stopCurrent = null;
      setStatus("failed");
    }
  }, [load, startFrom]);

  useEffect(() => {
    ownStop.current = pause;
    return () => {
      if (stopCurrent === ownStop.current) stopCurrent = null;
      haltSources();
      const current = engine.current;
      if (current) for (const take of TAKES) current.gains[take].disconnect();
      engine.current = null;
    };
  }, [pause, haltSources]);

  const choose = (nextLayer: CompareLayer, nextSide: CompareSide) => {
    setLayer(nextLayer);
    setSide(nextSide);
    const take = takeOf(nextLayer, nextSide);
    audible.current = take;
    const current = engine.current;
    if (!current) return;
    const now = audioContext().currentTime;
    for (const each of TAKES) current.gains[each].gain.setTargetAtTime(each === take ? 1 : 0, now, SWITCH_SECONDS / 3);
  };

  const seek = (to: number) => {
    offset.current = to;
    setPosition(to);
    if (status === "playing" && engine.current) startFrom(engine.current, to);
  };

  const playing = status === "playing";
  const message = status === "loading" ? labels.loading : status === "failed" ? labels.failed : "";
  const switchClass = (on: boolean) =>
    `min-w-[5.5rem] flex-1 px-4 py-2.5 font-mono text-[13px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
      on ? "bg-[#f5a524] text-black" : "bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white"
    }`;

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5" data-testid={`compare-player-${example.id}`}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => (playing ? pause() : void play())}
          disabled={status === "loading"}
          aria-label={`${playing ? labels.pause : labels.play} — ${example.title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5a524] text-black transition-colors hover:bg-[#ffc35a] disabled:opacity-50"
        >
          {playing ? (
            <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg aria-hidden="true" className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={position}
          disabled={duration === 0}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label={`${labels.position} — ${example.title}`}
          aria-valuetext={formatTime(position)}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#f5a524] disabled:cursor-default disabled:opacity-40"
        />
        <span className="w-[5.5rem] shrink-0 text-right font-mono text-xs tabular-nums text-white/50">
          {formatTime(position)}{duration > 0 && ` / ${formatTime(duration)}`}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div role="group" aria-label={labels.sideGroup} className="flex overflow-hidden rounded-md border border-white/10">
          {(["before", "after"] as const).map((each) => (
            <button key={each} type="button" aria-pressed={side === each} onClick={() => choose(layer, each)} className={switchClass(side === each)}>
              {labels[each]}
            </button>
          ))}
        </div>
        <div role="group" aria-label={labels.layerGroup} className="flex overflow-hidden rounded-md border border-white/10">
          {(["mix", "vocal"] as const).map((each) => (
            <button key={each} type="button" aria-pressed={layer === each} onClick={() => choose(each, side)} className={switchClass(layer === each)}>
              {labels[each]}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className={`text-sm text-white/55 ${message ? "mt-3" : ""}`}>{message}</p>
    </div>
  );
}
