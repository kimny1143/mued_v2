# MUEDvox User Manual (1.1.0)

MUEDvox makes vocal harmonies, each sung in its own way, from a single lead vocal. For every part you choose the interval it sings and the kind of voice it sings with.

## 1. Installing and licensing

### Mac (AU, VST3, AAX)
1. Quit your DAW.
2. Open `MUEDvox-1.1.0-installer.pkg` and follow the steps (an administrator password is required).
3. Open your DAW and rescan plug-ins.

To uninstall, open `/Applications/MUEDvox/Uninstall MUEDvox.command`. Your license key is kept.

To update from 1.0.0, 1.0.1 or 1.0.2, install the new version over it (Mac: open the new pkg; Windows: replace the `MUEDvox.vst3` folder). Your license key, your presets and your sessions stay as they are.

### Windows (VST3, 64-bit)
1. Quit your DAW.
2. Extract the ZIP and copy the `MUEDvox.vst3` folder inside it to `C:\Program Files\Common Files\VST3\` (only `MUEDvox.vst3`, not the outer folder the extraction makes).
3. Open your DAW and rescan VST3 plug-ins.

### The size of the screen
Drag the bottom-right corner of the plug-in's screen to scale the whole of it (50 to 400 %). On Windows it opens at a size that fits your display (100, 75, 60 or 50 %). The size you set stays while the plug-in is in place (closing and opening its window keeps it). It is not saved: a newly inserted plug-in, or a session opened again, starts at the first size.

### License key
Without a key MUEDvox runs as a demo, with no time limit. **Every 45 seconds of sound the harmonies drop out for about 3 seconds, then come back; the lead goes on.** Exports have the gaps too. Settings made in the demo are saved with the session and open unchanged once you enter a key. Saving presets from MUEDvox's own preset menu (Save preset…) and saving the harmony as a MIDI file (Save MIDI…, chapter 9) need a key; presets saved with your DAW's own preset feature work in the demo too (chapter 7). The badge at the bottom right reads **DEMO · ENTER LICENSE**.

To enter a key, click the DEMO badge at the bottom right of the window and do one of these:
- drop your license file on the panel
- choose it with **Load license file…**
- copy the key text and click **Paste from clipboard**

The badge changes to **LICENSED** and the harmonies return. A key entered once works for every MUEDvox opened by the same user.

A trial license (a key with an end date) makes MUEDvox work fully until that date; after it, MUEDvox is the demo again. Sessions keep their settings either way.

## 2. Getting started

1. Insert MUEDvox on a vocal track. A single voice, with no chords in it, works best.
2. Choose the song's key and scale under **SCALE** on the right.
3. Play. By default you hear a third above (V1, falsetto) and a third below (V2, mix).
4. Set the levels of the lead and of all harmonies with **Lead** and **Harmony** at the upper right.

## 3. Mode — sound quality against latency

Choose it with **MODE** in the top bar. The figure is the plug-in's latency, which is reported to the DAW.

- **Render (0.94 s)** — The cleanest sound. It reads ahead before it sings, so it is 0.94 s late. In Pro Tools that is more than delay compensation can cover (the track's delay value turns red), so the track plays late against the others as it is. **Commit the track.** The committed audio lines up with the lead. In other DAWs, freeze or bounce the track if it plays late.
- **Track (0.34 s)** — Close to Render with a third of the latency. It stays within Pro Tools' delay compensation, so you can mix with the plug-in on the insert. At 48 kHz it takes nearly all of the limit: do not put another plug-in with latency on the same track.
- **Live (3 ms)** — For singing or playing along. Almost no latency. The sound is not as clean as Render or Track.

In Render a line about the latency appears above the keyboard. Click **Details >** for a description of the three modes.

With **ACTIVE** (upper right) off, the plug-in passes the audio untouched and its latency is 0.

## 4. The parts (V1–V4 and Bass)

The five columns on the left are the parts.

- **ON** — the part sings.
- **S, M, W** — solo, mute, and W: the part as breath only (a whisper).
- **Interval (◀ ▶)** — steps from the lead. +2 is a third above, −2 a third below, +4 a fifth above. It moves along the scale (with the Chromatic scale it counts semitones).
- **REGISTER** — the register lever. From the top: CHEST, MIX, HEAD, FALSETTO, WHISPER. The same interval, sung another way.
  - While **SAFE** is lit the lever does not reach the WHISPER end, where the sound easily turns unnatural. Click it off to use the whole range.
- **LEVEL** — the part's level.
- **PAN** — its place between left and right.
- **DOUBLE** — how much the part is doubled, as if two people sang it.
- **Detail ▸** — finer settings of the part (Formant, Low cut, High cut, Mud).

**Bass** is the low part. **Octave** sings the lead an octave below; **Chord** sings the bass note of the chord (it needs MIDI chords).

### MASTER · STEREO FIELD
The half circle at the upper right shows every part's place and level. Drag a part's dot: the direction is its Pan, the distance from the centre its Level.

### CHORUS and CLEAN
- **CHORUS** — a widening on all harmonies (I, II, I+II, DEPTH, MIX).
- **CLEAN** — when on, the doubling, the chorus and the parts' EQ are left out: the harmonies and their registers as they are. Try it when the top end sounds rough.

## 5. Scale and chords

- **SCALE** — choose the key and a scale by name. Click any of the 12 notes to make your own scale (its name becomes Custom). The key and the scale are saved with the session; presets do not change them.
- **Follow MIDI chords** — when on, the harmonies follow the MIDI chords sent to MUEDvox. A chord means the same in any octave (it is read by note name). While no MIDI arrives, the harmonies follow the scale.
  - How MIDI is sent depends on the DAW. In Pro Tools, choose MUEDvox as the output of a MIDI or instrument track (send on **MIDI channel 1**).
  - In Logic Pro, make a software instrument track and put MUEDvox in its instrument slot, under **AU MIDI-controlled Effects**. In **Side Chain** at the top of the plug-in window, pick the vocal track, and put the chord MIDI on the software instrument track. **Mute the vocal track**: Side Chain still receives it, and the original vocal plays through MUEDvox's Lead.
- **Avoid parallel 5ths** — keeps the parts from moving in parallel fifths with the lead.
- The **KEYBOARD** at the bottom is a display only: the MIDI that arrives, and the notes the parts sing. Its top left has **Save MIDI…** (chapter 9).

## 6. The FX page

Switch with **HARMONY | FX** in the top bar. The effects work on the whole sound, the lead included.

Nine effects: Program EQ, Comp, Sat, Delay, Reverb, Chorus, Flanger, Phaser, Imager. Put the ones you use in the rack and drag them into the order you want. The Delay has tempo sync (dotted and triplet), Ping Pong, separate left and right times, Diffuse (smears the repeats) and HPF / LPF.

## 7. Presets

Choose them under **PRESET** in the top bar (◀ ▶ step through them). One preset holds both the harmony settings (the parts, the chorus and so on) and the settings of the FX page. The list is the same on the HARMONY page and on the FX page.

- Seven come with the plug-in: Natural, Clean, Wide Stack, Stack + Bass, Vintage Chorus, Plate Duo, Wide Duo.
- **Save preset…** saves the settings as they are now under a name. **Delete** removes one of your own (without asking).
- In the demo, **Save preset…** is greyed out and reads "(needs a license)". Choosing and deleting presets still works.
- Your DAW's own presets (for example a VST3 or AU preset, or a Pro Tools plug-in setting) work with or without a key. They store the whole plug-in, the key and scale included.
- The FX are on the lead vocal too: a preset with reverb or delay puts them on the lead as well.

**What presets do not change**: the key and the scale (they belong to the song), the Mode, ACTIVE, and what is under SETTINGS. Those are saved with the session.

## 8. SETTINGS

The **gear** at the top right, just left of ACTIVE, opens **SETTINGS**: two settings for the Live mode. Click outside the box, or the gear again, to close it. They are saved with the session; presets do not change them.
- **Note start** — how soon a harmony note begins (Soft, Fast, Fast+). Sooner starts come with more misread pitches.
- **Chord change under a held note** — when the chord changes under a held sung note: follow it at once (Follow), or hold until the next sung note (Hold).

## 9. Saving the harmony as MIDI

MUEDvox can write the notes its harmony parts sang as a MIDI file, one track per part, to edit, print or play with other sounds.

1. Set the Mode to **Render** or **Track** and play the song (or the part of it you want). While the DAW plays, MUEDvox keeps the notes of the parts you hear. The count at the top left of the keyboard ("N notes · N passes") goes up.
2. Click **Save MIDI…** and choose a name and a place. The file is a Standard MIDI File (type 1): one track for each part (MUEDvox V1–V4, MUEDvox Bass), with the song's tempo and time signature.
3. Bring it into the DAW at the very start of the song (bar 1): drag the file onto the arrangement, or import it (in Pro Tools: File > Import > MIDI). The notes land on the bars where they were sung.

What is kept:
- The notes each part sings, at the pitch MUEDvox gave it (the scale, or the chord when Follow MIDI chords is on), from the start to the end of each sung note. The singer's slides and vibrato are not in the file.
- Only the parts you hear: a part that is off, muted (M) or left out of a solo is not kept, and nothing is kept while the Harmony is off. Nothing is kept in the Live mode or while the DAW is stopped.
- Playing the same bars again replaces them: the newest pass is kept, whether it has notes there or not. A loop keeps its last time round.
- Short slides into a note and short drops at its end (under a tenth of a second) are made part of that note. Quick runs and short syllables stay as they are.
- **Clear** forgets everything kept so far.

In the demo, **Save MIDI…** is greyed out and reads "(needs a license)".

## 10. Troubleshooting

| What happens | Where to look |
|---|---|
| The harmonies drop out for a few seconds every 45 seconds | That is the demo. Enter your license key (chapter 1). |
| Save preset… is grey | That is the demo. Enter your license key, or save with your DAW's preset feature (chapter 7). |
| The track plays late against the others | In Render, commit, freeze or bounce the track, or switch to Track (chapter 3). |
| The track's delay is red in Pro Tools | Render's latency is beyond delay compensation. Once committed, the audio lines up. |
| The harmonies do not follow the chords | Is Follow MIDI chords on? Does MIDI reach MUEDvox (the keyboard shows it)? In Pro Tools, is it on channel 1? |
| The top end sounds rough | Turn CLEAN on, or lower DOUBLE. Move REGISTER away from the WHISPER end. |
| Pitches jump in Live | Set Note start to Soft under SETTINGS (the gear). Live suits a single voice with no backing in it. |
| Save MIDI… keeps no notes | Is the Mode Render or Track, and is the DAW playing? Is the Harmony on, and are the parts on and not muted? If the keyboard reads "No song position from the host", the DAW does not send its position to plug-ins. |
| The MIDI file's notes are off the bars | Bring the file in at the very start of the song (bar 1), not at the playhead. |
| In Logic, MUEDvox is not in the inserts, or chords cannot be sent | Put it in a software instrument track's instrument slot under AU MIDI-controlled Effects, and pick the vocal track in Side Chain (chapter 5). |
| In Logic, the original vocal sounds doubled | Mute the vocal track. Side Chain still receives it (chapter 5). |
| MUEDvox is not in Pro Tools' AudioSuite menu | AudioSuite is not supported. Use it as an insert, and commit the track in Render. |

---

VST and VST3 are trademarks of Steinberg Media Technologies GmbH, registered in Europe and other countries. Audio Units (AU) is a trademark of Apple Inc. AAX is a trademark of Avid Technology, Inc. Pro Tools and AudioSuite are trademarks of Avid Technology, Inc. Mac and Logic Pro are trademarks of Apple Inc. Windows is a trademark of Microsoft Corporation.
