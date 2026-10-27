"use client";

import { useState } from "react";
import { muedvoxVideo } from "@/lib/muedvox/config";

/**
 * The how-to video, as a facade: a still and a play button, and nothing from YouTube but that still until the
 * visitor presses play (conductor 2026-10-27: no heavy load before play). Pressing play swaps in the
 * youtube-nocookie player. ★Before hydration — or with no JS — the still is a plain link to the video on YouTube,
 * so it never becomes a dead button.
 */
export function MuedvoxVideo({ title, playLabel, videoId }: { title: string; playLabel: string; videoId?: string }) {
  const [playing, setPlaying] = useState(false);
  const video = muedvoxVideo(videoId);
  return (
    <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-lg bg-black" data-testid="muedvox-video">
      {playing ? (
        <iframe
          src={video.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <a
          href={video.watchUrl}
          onClick={(event) => {
            event.preventDefault();
            setPlaying(true);
          }}
          aria-label={`${playLabel}: ${title}`}
          className="group absolute inset-0 block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a remote still; next/image would need a remotePatterns entry for one picture */}
          <img src={video.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5a524] text-black shadow-lg transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </a>
      )}
    </div>
  );
}
