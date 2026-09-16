---
slug: lufs-targets-streaming
title: "LUFS targets for Spotify, Apple Music & YouTube"
seoTitle: "LUFS Targets for Spotify, Apple Music & YouTube (2026) | MUED"
description: "The integrated LUFS reference levels for Spotify, Apple Music and YouTube — why mastering louder than the target just gets turned down, and what to aim for."
tags: [LUFS, streaming, loudness normalization, mastering]
publishDate: null   # set at publish — this is the "as of" anchor
lastUpdated: null
gate:
  heading: "Check your level while you master"
  body: "MUEDlim is a free true-peak limiter with your loudness in LUFS front and centre, and a true-peak ceiling (−1 dBTP by default) so your master holds up after encoding."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/muedsp"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "what integrated LUFS to master to for Spotify/Apple Music/YouTube"
  pillar: loudness-and-true-peak
  siblings: [what-is-lufs, true-peak-vs-sample-peak, set-true-peak-ceiling]
  sources: ["Spotify for Artists — Loudness normalization", "Apple Digital Masters white paper", "AES AESTD1008.1.21-9 (2021-09-24)", "EBU R128 v5.0 (2023-11)"]
  verifyBeforePublish: "reconfirmed 2026-09-16 (see Sources); re-verify before each republish"
---

*Reference levels and their sources below were reviewed as of 2026-09 — platforms change them, so reconfirm before you rely on a number.*

What integrated LUFS should you master to? The honest answer surprises people: the target isn't yours to win. It's set by where listeners play your track — and mastering louder than it just gets you turned back down.

## How loudness normalization works

Every major streaming service plays all tracks toward one reference loudness, measured in **integrated LUFS** (see [What is LUFS?](/learn/what-is-lufs)). If your master is louder than the reference, it's **turned down** on playback. Some services also turn quiet masters **up**. Either way, the listener hears everything at roughly the same level.

So two masters at the same LUFS sound equally loud on Spotify — regardless of how hard either was limited.

## Reference levels (as of 2026-09)

| Platform / standard | Integrated LUFS (reference) | Source of the figure |
|---|---|---|
| Spotify | −14 LUFS | Published by Spotify |
| Apple Music (Sound Check) | Widely reported ≈ −16 LUFS | Not published by the platform; Apple publishes no LUFS figure |
| YouTube | Widely reported ≈ −14 LUFS | Not published by the platform; measured / reported value only |
| Amazon Music | Widely reported ≈ −14 LUFS | Not published by the platform; measured / reported value only |
| Tidal | Widely reported ≈ −14 LUFS | Not published by the platform; measured / reported value only |
| AES TD1008 (track normalization) | −16 LUFS | Standards-body recommendation for streaming services |
| *Broadcast, for context (EBU R128)* | −23 LUFS | Standards-body recommendation for programme loudness |

Most reported music-streaming levels cluster around **−14 LUFS**; Sound Check is widely reported a little lower, not specified numerically by Apple. These are *reference* levels, not hard limits — nothing rejects a master for being louder, it just gets attenuated. **AES TD1008 tells streaming services how to normalize playback, not artists what level to master to.** Its −16 LUFS track reference is not an Apple specification.

## The part that changes how you master

Push a master to −8 LUFS and it does **not** play louder on Spotify. It gets turned down to −14 like everything else — and you've spent real dynamic range for zero loudness gain. The loudness war doesn't pay out on normalized platforms.

The practical move: **master for the music, then use integrated LUFS as a check, not a score to beat.** If a dense, modern production lands around −9 to −12 LUFS on its own, that's fine — it'll be normalized. If a dynamic acoustic piece sits at −18, that's fine too. Chasing a specific number at the cost of the mix is the mistake.

Two honest caveats:
- **Genres differ.** A club-focused master and a jazz trio don't share a target; the platform reference is the same, but how close you sit to it is a musical choice.
- **Loudness isn't the only spec.** AES TD1008 recommends **true peak at or below −1 dBTP** at the lossy codec input. Spotify asks for **below −1 dBTP**, or **below −2 dBTP if your master is louder than −14 LUFS integrated**, to reduce encoding distortion — that's a separate control (see [How to set a true-peak ceiling](/learn/set-true-peak-ceiling)).

## Takeaways

- Spotify publishes **−14 LUFS**; Apple ≈ −16 and YouTube / Amazon Music / Tidal ≈ −14 are reported values, not published platform specifications.
- Mastering louder than the reference gains you nothing — it's turned back down.
- Use LUFS as a check; master for the song. Keep true peak ≤ −1 dBTP for lossy delivery; Spotify asks for below −2 dBTP when your master is louder than −14 LUFS.
- Reference levels drift — verify each platform's current figure.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **Spotify: −14 LUFS integrated; true peak below −1 dBTP, or below −2 dBTP for masters louder than −14 LUFS.** [Spotify for Artists — Loudness normalization](https://support.spotify.com/us/artists/article/loudness-normalization/). Checked 2026-09-16.
- **Apple: no numerical LUFS reference or dBTP recommendation in the reviewed guidance.** The white paper recommends at least 1 dB of headroom and describes Sound Check qualitatively. The reported ≈ −16 LUFS is not an Apple specification. [Apple Digital Masters white paper](https://www.apple.com/itunes/docs/apple-digital-masters.pdf) / [Apple Digital Masters](https://www.apple.com/apple-music/apple-digital-masters/). Checked 2026-09-16.
- **YouTube / Amazon Music / Tidal: no official public numerical reference found in the reviewed sources.** Their ≈ −14 LUFS entries above are measured / reported values only, not figures supplied by these pages. Official-source search: [YouTube / Google support](https://support.google.com/), [Amazon Music](https://amazonmusic.com/) / [Amazon Music for Artists](https://artists.amazonmusic.com/), [Tidal support](https://support.tidal.com/) / [Tidal for Artists](https://artists.tidal.com/). Checked 2026-09-16.
- **−16 LUFS for track normalization comes from AES TD1008, not Apple.** AESTD1008.1.21-9 (2021-09-24, supersedes TD1004), Table 1; maximum true peak ≤ −1 dBTP at the lossy codec input. These are recommendations for streaming-service normalization, not artist mastering targets. [AES TD1008 PDF](https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf) / [AES document page](https://aes.org/technical-council/technical-document-aestd1008/). Checked 2026-09-16.
- **EBU R128: −23 LUFS average programme loudness, for broadcast context.** Version 5.0 (2023-11). [EBU R128](https://tech.ebu.ch/publications/r128). Checked 2026-09-16.
