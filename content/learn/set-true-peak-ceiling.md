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
  ctaHref: "/muedsp"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "practical — what ceiling to set on a limiter and why -1 dBTP"
  pillar: loudness-and-true-peak
  siblings: [what-is-lufs, lufs-targets-streaming, true-peak-vs-sample-peak]
  sources: ["ITU-R BS.1770", "AES streaming loudness recommendations", "Apple Music mastering guidance"]
---

Once you know true peak can exceed sample peak (see *[True peak vs sample peak]*), the practical question is simple: **what ceiling do I set on my limiter?** For most masters, the answer is **−1 dBTP**. Here's why, and how.

## Why not 0 dBFS

Setting a ceiling at 0 dBFS — or −0.1 dBFS on a sample meter — leaves no room for two things that happen *after* your limiter:

- **Inter-sample overshoot** on playback: the reconstructed waveform can rise above your last sample.
- **Lossy encoding** (MP3, AAC): the encoder reshapes the waveform and can push peaks higher still.

A little headroom absorbs both. That headroom is what a true-peak ceiling buys you.

## Why −1 dBTP

**−1 dBTP** is the widely-used default, and it's not arbitrary:

- It reserves 1 dB for inter-sample peaks and encoder overshoot — enough for typical program material.
- It matches common streaming guidance: **Apple Music** recommends delivering with true peak no higher than **−1 dBTP**, and AES streaming-loudness recommendations point the same way for lossy delivery.

Two situations to nudge lower:

- **Heavily-limited, dense masters** push more energy into inter-sample peaks — **−2 dBTP** is a safer bet before aggressive lossy encoding.
- **Spoken-word / podcast** delivery specs sometimes ask for −2 dBTP outright.

If you're unsure, −1 dBTP is the safe default; −2 dBTP is the conservative one. There's rarely a reason to go above −1.

## How to set it

1. Put a **true-peak** limiter last in your master chain (a plain sample-peak limiter won't protect you — it can't see inter-sample peaks).
2. Set the output **ceiling to −1.0 dBTP**.
3. Confirm the limiter is in **true-peak mode**, not sample-peak mode (on some plugins this is a switch; on a dedicated true-peak limiter it's the default).
4. Drive loudness with input gain into the limiter until it reads right on your LUFS check (see *[LUFS targets for streaming]*) — the ceiling holds the peaks while you set level.

## Common mistakes

- Ceiling set at **−0.1 dBFS sample** and assuming you're safe — that's not a true-peak ceiling.
- **True-peak metering off**, so overs never show.
- Chasing loudness by lowering the ceiling — the ceiling controls peaks, **input/drive** controls loudness. They're different knobs.

## Takeaways

- Set a **true-peak** ceiling, last in the chain, at **−1 dBTP** for most work; **−2 dBTP** for dense masters or podcast specs.
- The ceiling protects against inter-sample and encoder overshoot; **input/drive** sets loudness.
- Verify true-peak mode is actually on.
