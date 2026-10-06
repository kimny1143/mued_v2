---
slug: headroom-before-mastering
title: "Headroom before mastering: how much does your mix need?"
seoTitle: "Headroom Before Mastering: How Much Does Your Mix Need? | MUED"
description: "How to leave useful headroom for mastering without chasing a magic peak number — what to remove, what to keep, and how to export a clean premaster."
tags: [headroom, mastering, gain staging, premaster]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "Check the peaks you are handing over"
  body: "MUEDlim is a free true-peak limiter that keeps loudness and true peak visible while you compare your mix and master — useful for checking, not for forcing a premaster to a magic level."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/en/muedlim?from=learn-headroom-before-mastering"
  cta2Label: "Or the whole chain: MUEDsp masterchain ($69) — <demo>try the demo</demo>."
  cta2Href: "/en/muedsp?from=learn-headroom-before-mastering#demo"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "how much headroom to leave on a mix before mastering"
  pillar: loudness-and-true-peak
  siblings: [limiter-release-and-lookahead, mono-compatibility-phase-check, dither-when-it-matters, streaming-loudness-normalization]
  sources: ["AES AESTD1008.1.21-9", "ITU-R BS.1770-5", "Apple Digital Masters white paper"]
  verifyBeforePublish: "reconfirmed 2026-09-17 (see Sources); re-verify before each republish"
---

The mastering engineer needs room to work, but that does **not** mean every mix must peak at one magic number. Useful headroom is simpler: no accidental clipping, no processor pinned against its ceiling, and enough room for the next stage to make deliberate choices.

## What headroom actually means

In a digital mix, **headroom is the distance between the signal's highest peak and full scale**. If the mix bus clips, information has already been flattened before mastering begins. Turning that clipped file down creates a quieter clipped file; it does not restore the lost transient.

Headroom is not the same as dynamics. A mix can have low peaks and still be heavily compressed, or high peaks and plenty of musical movement. The goal is not an impressively empty meter. It is a clean, intentional mix that is not running out of level.

## The fixed-number myth

You will often hear that a premaster must peak at **−6 dBFS**. That can be a convenient house rule, but it is not a universal delivery standard. The reviewed ITU, AES and Apple documents do not require a −6 dBFS premaster.

If an unclipped floating-point mix is simply too hot, lowering its output can create room without changing the balance. But check the whole path: a master fader cannot undo clipping inside a plugin, on a bus, or at an earlier fixed-point stage. Level-sensitive processors such as compressors and saturation also react differently if you change the gain feeding them.

The practical rule is: **follow the mastering engineer's requested format and level if they gave you one. Otherwise, send a clean file with comfortable peak margin and no accidental limiting.**

## What to do with your mix-bus chain

Do not automatically strip every processor from the mix bus. If compression, EQ or saturation is part of the sound you approved, removing it hands over a different mix.

Treat a loudness-only brickwall limiter differently. If it exists only to make the reference loud, bypass it for the premaster unless the engineer asks otherwise. Export the limited reference as a second file so the intended density is clear. If the limiter is inseparable from the aesthetic, say so and include both versions when possible.

Before export:

1. Play the entire song and inspect the mix bus, subgroups and clip indicators — not only the loudest-looking chorus.
2. Confirm that bypassing a loudness limiter does not reveal hidden overloads elsewhere.
3. Leave fades, edits and the intended start and end intact.
4. Export at the session's native sample rate and a lossless word length agreed with the engineer; do not normalize the file on export.
5. Re-import the bounce, line it up, and listen through the transitions and final decay.

## Premaster headroom is not a streaming ceiling

A mastering handoff and a streaming master are different stages. The **−1 dBTP** guidance in AES TD1008 concerns peak management around distribution and encoding. It is not an instruction to limit a mix to −1 dBTP before mastering.

Likewise, Apple asks providers to avoid clipping and supply the highest-quality source available, but it does not publish a LUFS target for Apple Music. Give mastering a healthy source; make platform checks on the finished master.

## Takeaways

- Headroom means an unclipped, workable signal — not compliance with one magic premaster peak.
- **−6 dBFS is a workflow convention, not a universal standard.** Follow the receiving engineer's specification when one exists.
- Keep mix-bus processing that defines the sound; remove loudness-only limiting when requested and include a reference.
- Check the whole signal path, export without normalization, and audition the bounced file.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **No reviewed standard requires a −6 dBFS premaster.** ITU-R BS.1770-5 defines loudness and true-peak measurement; AES TD1008 addresses streaming distribution, including a maximum true peak of **−1 dBTP** at the lossy-codec input. Neither sets a premaster handoff peak. [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770) / [AES TD1008 PDF](https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf). Checked 2026-09-17.
- **Apple requests the highest-resolution source available, accepts 24-bit masters, and asks providers to avoid clipping; it publishes no LUFS target.** [Apple Digital Masters white paper](https://www.apple.com/itunes/docs/apple-digital-masters.pdf). Checked 2026-09-17.
