---
slug: dither-when-it-matters
title: "Dither: when it matters, when it doesn't, and where it goes"
seoTitle: "Audio Dither: When It Matters and When It Doesn't | MUED"
description: "A practical guide to audio dither: why it belongs at a final word-length reduction, when not to add it, and how to avoid repeated or premature dithering."
tags: [dither, bit depth, mastering, quantization]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "Finish the master in the right order"
  body: "MUEDlim is a free true-peak limiter for setting final loudness and peak safety before any required last-stage word-length reduction and dither."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/muedsp"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "when to use dither in mixing and mastering exports"
  pillar: loudness-and-true-peak
  siblings: [headroom-before-mastering, limiter-release-and-lookahead, mono-compatibility-phase-check, streaming-loudness-normalization]
  sources: ["AES — Quantization and Dither: A Theoretical Survey", "AES — The Gentle Art of Dithering", "Apple Digital Masters white paper"]
  verifyBeforePublish: "reconfirmed 2026-09-17 (see Sources); re-verify before each republish"
---

Dither is not a mastering sweetener and it is not a repair tool. It is **very low-level noise added before quantization** so that word-length reduction produces noise-like error instead of signal-correlated distortion. It matters at one specific boundary: when a higher-precision signal becomes a lower-resolution fixed-point file.

## What dither fixes

Digital samples must land on available amplitude steps. Reduce the word length and those steps become coarser. Without dither, the rounding error can follow the signal, especially in quiet fades and reverberation tails, producing distortion that changes with the music.

Dither randomizes that relationship. The trade is deliberate: correlated quantization error becomes a steady, low-level noise floor. Dither does **not** restore detail already lost, increase headroom, stop clipping, or make a loud master more dynamic.

## When to use it

Use dither when you create a final fixed-point deliverable at a lower word length than the signal feeding the export. The familiar example is reducing a **24-bit** master to a **16-bit** delivery file. A floating-point processing path rendered to a fixed-point master is also a quantization boundary that the export system must handle correctly.

The important word is **final**. Put dither after limiting, fades, level changes and sample-rate conversion — at the last stage before the lower-word-length file is written. Any later processing changes the samples again and creates another quantization decision.

If a distributor accepts the higher-resolution master, send that requested master rather than reducing it because an old delivery recipe says so. Apple Digital Masters asks for the highest-resolution source available and accepts **24-bit** files; it does not require creators to make a **16-bit** file first.

## When not to add it

Do not add dither merely because you are exporting a file. If the destination preserves the relevant word length or stays in floating point for more processing, premature dither only adds noise before the work is finished.

You also do not need another dither stage when:

- you are making a level-matched listening copy without reducing fixed-point word length;
- you are exporting stems that will be mixed again at the same or greater precision;
- you are changing sample rate but not reducing word length — sample-rate conversion and dither solve different problems;
- a mastering engineer or export process will perform the final reduction later.

Lossy encoding is not a substitute for proper word-length handling. Give an encoder the clean, high-resolution master requested by the platform or distributor; do not dither simply because the listener may receive AAC, MP3 or another coded format.

## Once, at the last reduction

Repeated dither is not catastrophic, but every pass adds more noise and provides no benefit unless another reduction is actually happening. Keep one high-resolution master as the source of truth, then create each required deliverable from that master with the appropriate final conversion.

If your limiter has built-in dither, enable it only when that limiter is truly the final stage and its output word length matches the file being written. Otherwise leave it off and let the export stage perform the reduction. Never place metering or level-changing processing after the dither if you intend it to be final.

## Which type?

**TPDF dither** is the robust, general-purpose choice: it decorrelates quantization error without depending on the programme. Noise-shaped dither redistributes more of the noise toward less sensitive frequency regions, which can make it less noticeable, but it is still noise and should not be stacked through repeated generations.

The choice matters less than getting the order right: correct output format, one deliberate word-length reduction, then no further sample changes.

## Takeaways

- Dither turns signal-related quantization error into low-level noise; it does not recover detail or prevent clipping.
- Use it when reducing to a lower fixed-point word length, at the **last** processing stage.
- Do not dither every export, sample-rate change or intermediate stem automatically.
- Keep a high-resolution master and derive lower-resolution deliverables from it once.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **AES's foundational survey explains how dither changes quantization-error behaviour and compares dither schemes.** [AES E-Library — Quantization and Dither: A Theoretical Survey](https://aes2.org/publications/elibrary-page/?id=7047). Checked 2026-09-17.
- **AES's “The Gentle Art of Dithering” covers fixed- and floating-point paths and the need for dither when quantizing from 32-bit float to 24-bit fixed point.** [AES Journal, volume 67, issue 5](https://aes2.org/publications/journal-online/?num=5&vol=67). Checked 2026-09-17.
- **Apple requests the highest-resolution source available and accepts 24-bit masters; its document treats 16-bit delivery as a lower-resolution case, not a mandatory creator target.** [Apple Digital Masters white paper](https://www.apple.com/itunes/docs/apple-digital-masters.pdf). Checked 2026-09-17.
