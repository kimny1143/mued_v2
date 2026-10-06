---
slug: mono-compatibility-phase-check
title: "Mono compatibility and phase: the pre-release check"
seoTitle: "Mono Compatibility and Phase: A Pre-Release Mix Check | MUED"
description: "How to check a stereo master in mono, find phase cancellation, and fix width problems without collapsing the mix or trusting one correlation meter."
tags: [mono compatibility, phase, stereo, mastering]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "Check translation, then check the peaks"
  body: "MUEDlim is a free true-peak limiter for the final loudness and peak check after your stereo and mono balances are working as intended."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/en/muedlim?utm_source=learn&utm_medium=internal&utm_campaign=muedlim-from-learn&utm_content=mono-compatibility-phase-check"
  cta2Label: "Or the whole chain: MUEDsp masterchain ($69) — <demo>try the demo</demo>."
  cta2Href: "/en/muedsp?utm_source=learn&utm_medium=internal&utm_campaign=masterchain-from-learn&utm_content=mono-compatibility-phase-check#demo"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "check mono compatibility and phase before releasing a mix"
  pillar: loudness-and-true-peak
  siblings: [headroom-before-mastering, limiter-release-and-lookahead, dither-when-it-matters, streaming-loudness-normalization]
  sources: ["ITU-R BS.775-4", "AES AESTD1008.1.21-9"]
  verifyBeforePublish: "reconfirmed 2026-09-17 (see Sources); re-verify before each republish"
---

Your release may be delivered as stereo, but it will not always be heard as a perfect stereo pair. Speakers sit close together, phones and smart devices may reproduce channels differently, and some playback paths downmix. A quick mono check catches the parts of a wide mix that disappear when left and right meet.

## What mono reveals

Collapsing stereo to mono combines the left and right channels electrically. Signals that agree reinforce one another. Signals with opposing polarity or different timing can partially cancel, changing level and tone.

The warning signs are practical:

- a lead vocal, snare or bass loses weight;
- a wide synth becomes hollow or nearly vanishes;
- cymbals turn phasey and move behind the mix;
- reverbs or delays jump forward while the dry source recedes;
- the low end changes dramatically.

Mono is not supposed to sound as spacious as stereo. The test is whether the song's **essential balance, pitch information and impact survive**, not whether width survives an operation designed to remove it.

## Phase and polarity are related, not identical

A polarity inversion flips the sign of the whole waveform. A phase relationship can vary with frequency and can come from time offsets, filtering, microphone spacing or modulation. Both can create cancellation when channels are summed, but the fix is not always a polarity switch.

Common causes include stereo wideners, micro-delays, doubled takes, multi-mic recordings, layered samples that start at slightly different times, and aggressive mid/side processing. Low frequencies deserve special attention because kick and bass often carry the track on small or single-speaker systems.

## The pre-release check

1. Put a reliable mono fold-down on the monitoring path, not inside the file you will export.
2. Match the monitoring level closely enough that a simple loudness jump does not decide the comparison.
3. Listen first for priorities: lead, groove, bass line and hooks. Then check ambience and decorative width.
4. Toggle suspect stereo processors one at a time. If the problem disappears, reduce their width, shorten the offset, change the modulation, or keep the essential signal nearer the centre.
5. For multi-mic or layered sources, zoom in and audition alignment changes. Do not align everything blindly; natural differences can be the sound, and moving a track can create a new problem elsewhere.
6. Recheck stereo after every fix. Mono compatibility is a constraint, not the artistic destination.

Test quiet passages as well as choruses. A wide pad hidden under a dense section may become an obvious hole when it is exposed in the intro.

## Use meters as clues

A correlation or vectorscope can point you toward unstable width, but it cannot tell you whether the cancellation is musically important. A brief wide effect may be fine; a disappearing lead is not. The meter also cannot replace checking the actual downmix because frequency-dependent problems can hide inside one summary value.

ITU-R BS.775 treats downward compatibility as a real system requirement and documents downmixing to fewer channels, including mono. AES TD1008 makes a related distinction for streaming: acoustic summation in a room and electrical summation to mono are not the same operation. That is why listening to the fold-down matters.

## Fix the source, not the master meter

If mono exposes a problem, return to the element causing it. Narrowing the entire master can rescue compatibility, but it also gives up width everywhere. A targeted change to a widener, delay, microphone pair or side channel usually preserves more of the mix.

Do not use limiting to solve cancellation. A limiter may raise the surviving material after summing, but it cannot reconstruct content that opposite channels removed. Resolve stereo relationships first; then perform loudness and true-peak checks on the finished master.

## Takeaways

- Mono summing exposes cancellation that a stereo listen can disguise.
- Listen for the survival of essential musical information, not for stereo spaciousness in mono.
- A correlation meter is a clue, not a pass/fail certificate.
- Fix the offending source or stereo process, then recheck both mono and stereo before release.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **ITU-R BS.775-4 documents compatibility and downmixing to formats with fewer channels, including mono, and notes that results depend on factors such as panning and microphone characteristics.** [ITU-R BS.775](https://www.itu.int/rec/R-REC-BS.775/en). Checked 2026-09-17.
- **AES TD1008 distinguishes acoustic power summation from electrical mono summation and discusses how the latter changes in-phase and out-of-phase elements.** [AES TD1008 PDF](https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf). Checked 2026-09-17.
