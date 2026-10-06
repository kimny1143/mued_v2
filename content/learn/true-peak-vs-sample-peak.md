---
slug: true-peak-vs-sample-peak
title: "True peak vs sample peak: why your −0.1 dB master still clips"
seoTitle: "True Peak vs Sample Peak: Why Masters Under 0 dB Still Clip | MUED"
description: "Sample peak vs true peak: how inter-sample peaks push a −0.1 dBFS master over 0 dB in converters and MP3/AAC encoding — and how to catch them."
tags: [true peak, inter-sample peak, mastering, limiting]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "Catch what a sample meter misses"
  body: "MUEDlim is a free true-peak limiter — it measures inter-sample peaks and holds your true peak to a ceiling you set (−1 dBTP by default), so what leaves your session survives the encoder."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/en/muedlim?from=learn-true-peak-vs-sample-peak"
  cta2Label: "Or the whole chain: MUEDsp masterchain ($69) — <demo>try the demo</demo>."
  cta2Href: "/en/muedsp?from=learn-true-peak-vs-sample-peak#demo"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "understand inter-sample/true peak; why a master under 0 dBFS still clips"
  pillar: loudness-and-true-peak
  siblings: [what-is-lufs, lufs-targets-streaming, set-true-peak-ceiling]
  sources: ["ITU-R BS.1770 (true-peak measurement)", "AES streaming loudness recommendations"]
---

Your limiter reads −0.1 dBFS. No red lights, no clipping. Then you export an MP3, play it back, and it distorts. The culprit is the gap between **sample peak** and **true peak**.

## Two different "peaks"

- **Sample peak** is the highest value among the actual digital samples in your file. It's what a normal peak meter shows. Keep it under 0 dBFS and no *sample* clips.
- **True peak** is the highest point of the **continuous analog waveform that gets reconstructed** from those samples on playback. And that waveform can rise **higher than any single sample**.

Digital audio stores discrete points. To play them, a converter draws a smooth curve *through* the points — and between two samples that curve can overshoot both of them. That overshoot is an **inter-sample peak**. Your file can read −0.1 dBFS at the sample level while its reconstructed waveform actually crosses 0 dBFS.

## Where it bites

Two places turn an inter-sample peak into audible distortion:

- **D/A converters.** When the converter reconstructs the waveform, an inter-sample peak above 0 dBFS clips at the output stage — even though no stored sample was over.
- **Lossy codecs (MP3, AAC).** Encoding to a lossy format *changes* the waveform slightly, and that can **raise** peaks further. A master sitting right at 0 dBFS sample peak routinely gains inter-sample overs after encoding — exactly the format your streaming listeners hear.

So "−0.1 dBFS, no clip" on your sample meter is not a guarantee. The thing that clips is the true peak, and a sample meter never showed it to you.

## How true peak is measured

**ITU-R BS.1770** defines true-peak measurement by **oversampling** — reconstructing the between-sample curve (typically at 4× or higher) and reading its real maximum. The result is reported in **dBTP** (decibels true peak). A true-peak meter is doing this oversampling for you; a plain sample-peak meter is not.

## The fix, in one line

Measure and limit **true peak**, not just sample peak, and leave headroom below 0 — commonly **−1 dBTP** — so inter-sample overshoot and lossy encoding have room to breathe. (The how-to is in [How to set a true-peak ceiling](/learn/set-true-peak-ceiling).)

## Takeaways

- Sample peak = tallest stored sample; true peak = the reconstructed waveform's real maximum (inter-sample peaks).
- A master under 0 dBFS *sample* peak can still exceed 0 dBFS *true* peak — and clip in a converter or after MP3/AAC encoding.
- True peak is measured by oversampling per ITU-R BS.1770, reported in dBTP.
- Limit true peak and leave headroom (−1 dBTP is the common target).

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*
