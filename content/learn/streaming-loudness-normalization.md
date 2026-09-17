---
slug: streaming-loudness-normalization
title: "How streaming loudness normalization treats your master"
seoTitle: "How Streaming Loudness Normalization Treats Your Master | MUED"
description: "Playback normalization versus mastering: what streaming services measure, when they turn tracks down or up, and why your uploaded master is not rewritten."
tags: [streaming, loudness normalization, LUFS, mastering]
publishDate: null   # set at publish
lastUpdated: null
gate:
  heading: "Measure the master, not the myth"
  body: "MUEDlim is a free true-peak limiter with integrated loudness and true peak in view, so you can judge the master before a platform applies playback gain."
  note: "Your email becomes your portal — latest build one click away."
  ctaLabel: "Get MUEDlim — free"
  ctaHref: "/muedsp"
_ops:
  status: draft
  track: "mued.jp/learn (EN reference / TDR-manual)"
  searchIntent: "understand playback loudness normalization versus mastering for streaming"
  pillar: loudness-and-true-peak
  siblings: [headroom-before-mastering, limiter-release-and-lookahead, mono-compatibility-phase-check, dither-when-it-matters]
  sources: ["Spotify for Artists — Loudness normalization", "Apple Support — Sound Check", "AES AESTD1008.1.21-9", "ITU-R BS.1770-5"]
  verifyBeforePublish: "reconfirmed 2026-09-17 (see Sources); re-verify before each republish"
---

Streaming normalization does not secretly remaster your song. A service measures loudness, stores or associates that measurement with the track, then changes **playback gain** when normalization is active. Your delivered master remains the source; the listener hears it at an adjusted level.

## Measurement first, gain at playback

Platforms need a consistent way to compare a sparse acoustic track with a dense electronic master. The common measurement family is **ITU-R BS.1770**, which estimates programme loudness and true peak. Integrated loudness describes the track across its duration rather than judging one loud moment.

The service can then apply a fixed gain offset during playback:

- a master above the service's reference is turned down;
- a master below the reference may be turned up, if the platform's rules and available peak headroom allow it;
- the audio file is not automatically given new compression, EQ or limiting merely because negative gain is applied.

Spotify states this directly: it measures during upload but applies normalization during playback, without changing the track beforehand.

## What −14 LUFS means — and what it does not

Spotify publishes a normal playback reference of **−14 LUFS integrated**. If a master measures louder, Spotify applies negative gain toward that reference. That number describes Spotify's playback system; it is not a universal mastering law and it is not an Apple specification.

Apple explains that **Sound Check** adjusts loudness between songs so they play at a similar volume, but Apple publishes no numerical LUFS or dBTP target in the reviewed public guidance. Do not relabel a reported measurement as an official Apple target.

Other services, devices and user settings can behave differently. Normalization can be disabled, unsupported in a playback path, or applied differently to an album and a mixed playlist. One global “streaming LUFS target” cannot describe every listen.

## Track and album normalization

Context matters. In a playlist or shuffle, services can normalize tracks individually so unrelated releases sit together. In album playback, one gain offset can preserve the intended loudness differences between songs.

Spotify documents both behaviours: albums are normalized together so quieter tracks remain relatively quieter, while shuffled albums and playlists use track-level adjustment. Apple also describes Sound Check as reducing jumps between songs, but again supplies no public LUFS number.

This is why forcing every song on an album to the same integrated reading can damage sequencing. The service can preserve intentional contrast when it recognizes album playback; your master should preserve it too.

## Quiet masters and peak headroom

Turning a loud master down is straightforward gain. Turning a quiet, dynamic master up can run into the peak ceiling. Spotify says it considers headroom and may stop short rather than create clipping; some playback modes may use a limiter under their own documented conditions.

That does not mean you should flatten a dynamic song in advance. It means **loudness and true peak are separate constraints**. Measure both, keep peaks controlled for delivery, and accept that a very dynamic track may play below a service's nominal loudness when there is not enough safe gain available.

## What normalization cannot undo

If heavy limiting removed punch, playback attenuation will not bring it back. The normalized file may be quieter, but its clipped transients, distortion and reduced crest factor remain. Likewise, normalization cannot fix a harsh balance, phase cancellation or codec-sensitive peaks.

The useful workflow is:

1. Master for the song and the release around it.
2. Measure integrated loudness to predict playback gain — not to chase a scoreboard.
3. Verify true peak on the rendered master and follow the distributor's current delivery guidance.
4. Compare at matched loudness. If the louder master only wins before matching, extra limiting bought level that normalization can remove.
5. Recheck official platform pages before release because settings and supported playback paths change.

## Takeaways

- Normalization usually changes playback gain; it does not rewrite the uploaded master.
- **−14 LUFS is Spotify's published normal reference, not a universal target and not an Apple number.**
- Album and track contexts can use different gain logic, preserving intentional song-to-song contrast.
- Master for the music, use LUFS to anticipate gain, and treat true peak as a separate delivery check.

*Part of the [Loudness and true peak guide](/learn/loudness-and-true-peak).*

## Sources

- **Spotify publishes −14 LUFS integrated for normal playback and says normalization is applied during playback, while the uploaded track is measured but not changed beforehand.** It also documents album-level versus track-level handling and headroom-limited positive gain. [Spotify for Artists — Loudness normalization](https://support.spotify.com/us/artists/article/loudness-normalization/). Checked 2026-09-17.
- **Apple says Sound Check adjusts loudness between songs so they play at the same volume; the reviewed page publishes no LUFS or dBTP figure.** [Apple Support — If music in Apple Music sounds quiet](https://support.apple.com/en-us/109331). Checked 2026-09-17.
- **ITU-R BS.1770-5 defines the loudness and true-peak measurement algorithms used as the basis for normalization systems.** [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770). Checked 2026-09-17.
- **AES TD1008 describes loudness normalization, peak control and playback considerations for streaming distribution; its recommendations are for distribution systems, not a universal artist mastering target.** [AES TD1008 PDF](https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf). Checked 2026-09-17.
