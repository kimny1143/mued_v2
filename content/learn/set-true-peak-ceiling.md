---
slug: set-true-peak-ceiling
title: "How to set a true-peak ceiling (and why −1 dBTP)"
seoTitle: "How to Set a True-Peak Ceiling (and Why −1 dBTP) | MUED"
description: "A practical guide to setting a true-peak ceiling: why −1 dBTP is the common default, when to use −2 dBTP, and how to avoid the usual limiter mistakes."
tags: [true peak, dBTP, limiter, mastering]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "A ceiling you can just dial in"
  body: "MUEDlim is a free true-peak limiter with exactly two knobs — INPUT for loudness, CEILING for the true-peak ceiling (−3 to 0 dBTP, default −1). Set the ceiling, drive the input, done."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/en/muedlim?utm_source=learn&utm_medium=internal&utm_campaign=muedlim-from-learn&utm_content=set-true-peak-ceiling"
  cta2Label: "Or the whole chain: MUEDsp masterchain ($69) — <demo>try the demo</demo>."
  cta2Href: "/en/muedsp?utm_source=learn&utm_medium=internal&utm_campaign=masterchain-from-learn&utm_content=set-true-peak-ceiling#demo"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "practical — what ceiling to set on a limiter and why -1 dBTP"
  pillar: loudness-and-true-peak
  siblings: [what-is-lufs, lufs-targets-streaming, true-peak-vs-sample-peak]
  sources: ["Spotify for Artists — Loudness normalization", "Apple Digital Masters white paper", "AES AESTD1008.1.21-9 (2021-09-24)"]
---

Once you know true peak can exceed sample peak (see [True peak vs sample peak](/learn/true-peak-vs-sample-peak)), the practical question is simple: **what ceiling do I set on my limiter?** For most masters, the answer is **−1 dBTP**. Here's why, and how.

## Why not 0 dBFS

Setting a ceiling at 0 dBFS — or −0.1 dBFS on a sample meter — leaves no room for two things that happen *after* your limiter:

- **Inter-sample overshoot** on playback: the reconstructed waveform can rise above your last sample.
- **Lossy encoding** (MP3, AAC): the encoder reshapes the waveform and can push peaks higher still.

A little headroom absorbs both. That headroom is what a true-peak ceiling buys you.

## Why −1 dBTP

**−1 dBTP** is the widely-used default, and it's not arbitrary:

- It reserves 1 dB for inter-sample peaks and encoder overshoot — enough for typical program material.
- It matches common streaming guidance: **AES TD1008** recommends a maximum true peak no higher than **−1 dBTP** at the lossy codec input; **Spotify** asks for true peak below **−1 dBTP**. **Apple** asks for at least **1 dB of headroom**, without specifying dBTP or true peak.

Two situations to nudge lower:

- **Heavily-limited, dense masters** push more energy into inter-sample peaks — **−2 dBTP** is a safer bet before aggressive lossy encoding. **Spotify explicitly asks for true peak below −2 dBTP when your master is louder than −14 LUFS integrated.**
- **Spoken-word / podcast** delivery specs sometimes ask for −2 dBTP outright.

If you're unsure, −1 dBTP is the safe default; −2 dBTP is the conservative one. There's rarely a reason to go above −1.

## How to set it

1. Put a **true-peak** limiter last in your master chain (a plain sample-peak limiter won't protect you — it can't see inter-sample peaks).
2. Set the output **ceiling to −1.0 dBTP** as a starting point. For Spotify, keep measured true peak below −1 dBTP, or below −2 dBTP if your master is louder than −14 LUFS integrated.
3. Confirm the limiter is in **true-peak mode**, not sample-peak mode (on some plugins this is a switch; on a dedicated true-peak limiter it's the default).
4. Drive loudness with input gain into the limiter until it reads right on your LUFS check (see [LUFS targets for streaming](/learn/lufs-targets-streaming)) — the ceiling holds the peaks while you set level.

## Common mistakes

- Ceiling set at **−0.1 dBFS sample** and assuming you're safe — that's not a true-peak ceiling.
- **True-peak metering off**, so overs never show.
- Chasing loudness by lowering the ceiling — the ceiling controls peaks, **input/drive** controls loudness. They're different knobs.

## Takeaways

- Set a **true-peak** ceiling, last in the chain, at **−1 dBTP** for most work; **−2 dBTP** for dense masters or podcast specs. Spotify asks for measured true peak below −2 dBTP when the master is louder than −14 LUFS integrated.
- The ceiling protects against inter-sample and encoder overshoot; **input/drive** sets loudness.
- Verify true-peak mode is actually on.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **Spotify: −14 LUFS integrated; true peak below −1 dBTP, or below −2 dBTP for masters louder than −14 LUFS.** [Spotify for Artists — Loudness normalization](https://support.spotify.com/us/artists/article/loudness-normalization/). Checked 2026-09-16.
- **Apple: at least 1 dB of headroom, with no numerical LUFS reference or dBTP / true-peak recommendation in the reviewed guidance.** [Apple Digital Masters white paper](https://www.apple.com/itunes/docs/apple-digital-masters.pdf) / [Apple Digital Masters](https://www.apple.com/apple-music/apple-digital-masters/). Checked 2026-09-16.
- **−16 LUFS for track normalization comes from AES TD1008, not Apple.** AESTD1008.1.21-9 (2021-09-24, supersedes TD1004), Table 1; maximum true peak ≤ −1 dBTP at the lossy codec input. These are recommendations for streaming-service normalization, not artist mastering targets. [AES TD1008 PDF](https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf) / [AES document page](https://aes.org/technical-council/technical-document-aestd1008/). Checked 2026-09-16.
- **YouTube / Amazon Music / Tidal: no official public numerical reference found in the reviewed sources.** Treat levels reported for these services as measured / reported values only, not published platform specifications. Official-source search: [YouTube / Google support](https://support.google.com/), [Amazon Music](https://amazonmusic.com/) / [Amazon Music for Artists](https://artists.amazonmusic.com/), [Tidal support](https://support.tidal.com/) / [Tidal for Artists](https://artists.tidal.com/). Checked 2026-09-16.
