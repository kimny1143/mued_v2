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
  sources: ["platform loudness docs (Spotify/Apple/YouTube)", "AES streaming loudness recommendations"]
  verifyBeforePublish: "streaming reference levels change — reconfirm each platform's current spec and update the 'as of' year"
---

*Reference levels below are current as of 2026 — platforms change them, so reconfirm before you rely on a number.*

What integrated LUFS should you master to? The honest answer surprises people: the target isn't yours to win. It's set by where listeners play your track — and mastering louder than it just gets you turned back down.

## How loudness normalization works

Every major streaming service plays all tracks toward one reference loudness, measured in **integrated LUFS** (see *[What is LUFS?]*). If your master is louder than the reference, it's **turned down** on playback. Some services also turn quiet masters **up**. Either way, the listener hears everything at roughly the same level.

So two masters at the same LUFS sound equally loud on Spotify — regardless of how hard either was limited.

## Reference levels (as of 2026)

| Platform | Integrated LUFS (reference) |
|---|---|
| Spotify | −14 LUFS |
| Apple Music (Sound Check) | −16 LUFS |
| YouTube | ≈ −14 LUFS |
| Amazon Music | ≈ −14 LUFS |
| Tidal | ≈ −14 LUFS |
| *Broadcast, for context (EBU R128)* | −23 LUFS |

Most music streaming clusters around **−14 LUFS**; Apple's Sound Check sits a little lower. These are *reference* levels, not hard limits — nothing rejects a master for being louder, it just gets attenuated.

## The part that changes how you master

Push a master to −8 LUFS and it does **not** play louder on Spotify. It gets turned down to −14 like everything else — and you've spent real dynamic range for zero loudness gain. The loudness war doesn't pay out on normalized platforms.

The practical move: **master for the music, then use integrated LUFS as a check, not a score to beat.** If a dense, modern production lands around −9 to −12 LUFS on its own, that's fine — it'll be normalized. If a dynamic acoustic piece sits at −18, that's fine too. Chasing a specific number at the cost of the mix is the mistake.

Two honest caveats:
- **Genres differ.** A club-focused master and a jazz trio don't share a target; the platform reference is the same, but how close you sit to it is a musical choice.
- **Loudness isn't the only spec.** Whatever your LUFS, keep your **true peak at or below −1 dBTP** so the master survives lossy encoding — that's a separate control (see *[How to set a true-peak ceiling]*).

## Takeaways

- Streaming normalizes to integrated LUFS; most music platforms reference **≈ −14 LUFS**, Apple ≈ −16.
- Mastering louder than the reference gains you nothing — it's turned back down.
- Use LUFS as a check; master for the song, and keep true peak ≤ −1 dBTP.
- Reference levels drift — verify each platform's current figure.
