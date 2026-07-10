"use client";

// Before/After 3-state player for the /muedial LP Listen step. Reuses the existing, live-proven
// Liberation demo audio (public/audio/demo/Liberation_*.mp3 — the same 3 files powering the /dial
// LP player), so no new RoEx export. Seamless track-switching (keeps playback position) is the same
// pattern as app/dial/page.tsx's BeforeAfterDemo, restyled to glasswerks dark/amber.
//
// product-truth (content課 canonical): the states are Raw Stems → AI Mix → Mastered, i.e. the same
// stems mixed then mastered through conversation — NOT a one-click "song in, mix out". The caption
// (listen.sub) says so plainly.
import { useCallback, useEffect, useRef, useState } from "react";

const TRACKS = [
  { key: "raw", src: "/audio/demo/Liberation_Before.mp3" },
  { key: "mix", src: "/audio/demo/Liberation_After.mp3" },
  { key: "mastered", src: "/audio/demo/Liberation_RoEx_Final_Master.mp3" },
] as const;

export function BeforeAfterPlayer({
  labels,
}: {
  labels: { raw: string; mix: string; mastered: string };
}) {
  const [active, setActive] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const label = (i: number) => labels[TRACKS[i].key];

  const switchTrack = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlaying = !audio.paused;
    const t = audio.currentTime;
    setActive(idx);
    audio.src = TRACKS[idx].src;
    audio.currentTime = t;
    if (wasPlaying) void audio.play();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* State selector */}
      <div className="mb-6 flex overflow-hidden rounded-xl border border-white/10">
        {TRACKS.map((track, i) => (
          <button
            key={track.key}
            type="button"
            onClick={() => switchTrack(i)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              active === i
                ? "bg-[#f5a524] text-black"
                : "bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {label(i)}
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="flex-1">
            <div className="mb-2 text-sm font-medium text-white">
              Liberation — <span className="text-[#f5a524]">{label(active)}</span>
            </div>
            <div className="h-1.5 cursor-pointer rounded-full bg-white/10" onClick={handleSeek}>
              <div
                className="h-full rounded-full bg-[#f5a524] transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <audio ref={audioRef} src={TRACKS[0].src} preload="metadata" />
      </div>
    </div>
  );
}
