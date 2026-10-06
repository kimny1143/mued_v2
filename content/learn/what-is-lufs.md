---
slug: what-is-lufs
title: "What is LUFS? Loudness units explained"
seoTitle: "What Is LUFS? Loudness Units Explained | MUED"
description: "LUFS explained: what the loudness unit on your meter measures, how it differs from peak and RMS, and why streaming normalizes by integrated LUFS."
tags: [loudness, LUFS, mastering, metering]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "See it on a real meter"
  body: "MUEDlim is a free true-peak limiter that puts your loudness in LUFS front and centre — so you can watch this number move on your own mix."
  note: "Your email becomes your portal, so the latest build is always one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/en/muedlim?from=learn-what-is-lufs"
  cta2Label: "Or the whole chain: MUEDsp masterchain ($69) — <demo>try the demo</demo>."
  cta2Href: "/en/muedsp?from=learn-what-is-lufs#demo"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "beginner wants to understand the LUFS unit on their meter"
  pillar: loudness-and-true-peak
  siblings: [lufs-targets-streaming, true-peak-vs-sample-peak, set-true-peak-ceiling]
  sources: ["ITU-R BS.1770", "EBU R128", "ATSC A/85"]
  note: "tone-setter — conductor voice-check PASS 2026-07-18"
---

You've seen it in mastering advice and glowing on your meter: **−14 LUFS**. It's the number streaming services care about, and it matters more than your peak reading. Here's what it actually measures.

## LUFS measures loudness, not level

**LUFS** stands for **Loudness Units relative to Full Scale** — a measurement of *perceived* loudness standardized in **ITU-R BS.1770**.

That "perceived" is the whole point. A peak meter shows the tallest single sample. An RMS meter shows raw average energy. Neither matches how loud a track actually *sounds* to a listener. LUFS does two things to close that gap:

- **K-weighting** — a frequency curve that de-emphasizes low end and gently lifts the highs, approximating the ear's sensitivity. A bass-heavy track and a bright track at the same RMS don't sound equally loud; K-weighting accounts for that.
- **Gating** — silent gaps and very quiet passages are excluded, so a track with a long fade-out isn't measured as quieter than it feels.

The result is a single number that tracks loudness the way people experience it.

## LUFS vs LU

- **LUFS** is *absolute*, measured against digital full scale. A master might read −14 LUFS.
- **LU** (Loudness Units) is *relative* — a difference. "This chorus is 3 LU louder than the verse." 1 LU = 1 dB.

## Three time windows

Your meter usually shows three LUFS readings:

- **Momentary** — a 400 ms window. Catches transients and short-term jumps.
- **Short-term** — a 3 s window. Good for judging section-to-section balance.
- **Integrated** — the whole track, start to finish. **This is the number streaming platforms use** to set playback level.

When someone says "master to −14 LUFS," they mean *integrated*.

## Why it decides your loudness on streaming

Spotify, Apple Music, YouTube and the rest normalize playback by **integrated LUFS**. Two tracks at the same LUFS play back equally loud — no matter how hard one of them was limited. That flips the old loudness-war logic: past a point, crushing your master doesn't make it louder to the listener, it just costs you dynamics. (More on the exact targets in [LUFS targets for streaming](/learn/lufs-targets-streaming).)

For reference, broadcast has used LUFS targets for years: **EBU R128** specifies −23 LUFS, and the US **ATSC A/85** standard uses −24 **LKFS** (LKFS and LUFS are the same scale under a different name).

## Takeaways

- LUFS = perceived loudness, K-weighted and gated per ITU-R BS.1770.
- **Integrated** LUFS is the one streaming uses; momentary and short-term are for mixing decisions.
- On streaming, LUFS — not peak — sets how loud you actually sound.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*
