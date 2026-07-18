---
slug: loudness-and-true-peak
title: "Loudness and true peak: a practical guide for mixing and mastering"
seoTitle: "Loudness and True Peak: A Practical Guide (LUFS & dBTP) | MUED"
description: "How loudness (LUFS) and true peak (dBTP) decide whether your master translates on streaming — the whole picture, with deep-dives on each part."
tags: [loudness, true peak, LUFS, dBTP, mastering]
publishDate: null   # set at go-live (kimny LEARN_LIVE flip) — pillar + cluster publish together
lastUpdated: null
gate:
  heading: "One free tool for both"
  body: "MUEDlim is a free true-peak limiter with your loudness in LUFS front and centre and a true-peak ceiling (−1 dBTP by default) — the two things this guide is about, in one plugin."
  note: "Your email becomes your portal, so the latest build is always one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/muedsp"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  role: pillar
  searchIntent: "understand the whole loudness + true-peak picture for mastering"
  cluster: [what-is-lufs, lufs-targets-streaming, true-peak-vs-sample-peak, set-true-peak-ceiling]
  sources: ["ITU-R BS.1770", "EBU R128", "ATSC A/85", "AES streaming loudness recommendations"]
---

Two numbers decide whether a master translates: **how loud it sounds** and **how high it actually peaks**. Get loudness wrong and your track is turned down (or up) on streaming until it sits like everything else. Get true peak wrong and it clips after encoding — on the exact files your listeners hear. This guide is the whole picture; each section links to a deeper dive.

## Loudness: measured in LUFS

Loudness isn't peak level and it isn't RMS — it's *perceived* loudness, measured in **LUFS** (Loudness Units relative to Full Scale) under **ITU-R BS.1770**, using K-weighting and gating so the number tracks how loud a track actually sounds. If that's new, start with [What is LUFS?](/learn/what-is-lufs).

The reason it matters for release: **streaming platforms normalize playback by integrated LUFS.** Most music services reference around **−14 LUFS** (Apple Music sits a little lower). Master louder than that and you don't get louder — you get *turned down*, minus the dynamics you spent getting there. So the move is to **master for the song and use LUFS as a check, not a target to beat.** The platform-by-platform numbers are in [LUFS targets for Spotify, Apple Music & YouTube](/learn/lufs-targets-streaming).

## True peak: measured in dBTP

Your peak meter shows **sample peak** — the tallest stored sample. But playback reconstructs a continuous waveform *between* the samples, and that waveform can rise higher than any sample. That overshoot is an **inter-sample (true) peak**, and it's why a master reading −0.1 dBFS can still clip in a converter or after MP3/AAC encoding. The full explanation is in [True peak vs sample peak](/learn/true-peak-vs-sample-peak).

The fix is to measure and limit **true peak** (in **dBTP**), leaving headroom below 0. The common default is **−1 dBTP**, for reasons and step-by-step settings covered in [How to set a true-peak ceiling](/learn/set-true-peak-ceiling).

## Putting it together

On the master bus, loudness and true peak are two different jobs handled by two different controls:

- **Loudness** — drive level (input gain into your limiter) until the **integrated LUFS** reads where you want it for the material. Check it; don't chase a number past the point the mix suffers.
- **True peak** — set a **true-peak ceiling at −1 dBTP** (−2 dBTP for very dense masters or podcast specs) so nothing clips downstream.

That's the whole checklist: master for the music, verify loudness in LUFS, and hold true peak to −1 dBTP. Loudness decides how you sit next to other tracks; true peak decides whether you survive the encoder.

## Takeaways

- **Loudness** = perceived level in LUFS (ITU-R BS.1770); streaming references ≈ −14 LUFS, so master for the song and use LUFS as a check.
- **True peak** = the reconstructed waveform's real maximum in dBTP; a master under 0 dBFS sample peak can still clip — hold true peak to **−1 dBTP**.
- They're separate controls: input/drive sets loudness, the ceiling protects peaks.

## Read next

- [What is LUFS? Loudness units explained](/learn/what-is-lufs)
- [LUFS targets for Spotify, Apple Music & YouTube](/learn/lufs-targets-streaming)
- [True peak vs sample peak: why your −0.1 dB master still clips](/learn/true-peak-vs-sample-peak)
- [How to set a true-peak ceiling (and why −1 dBTP)](/learn/set-true-peak-ceiling)
