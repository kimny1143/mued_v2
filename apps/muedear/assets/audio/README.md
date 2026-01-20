# MUEDear Audio Assets

This directory contains audio files for ear training games.

## Directory Structure

```
audio/
├── mufreq/           # MuFreQ game audio files
│   ├── track_01/     # First track set
│   │   ├── original.m4a
│   │   ├── 60hz.m4a
│   │   ├── 125hz.m4a
│   │   ├── 250hz.m4a
│   │   ├── 500hz.m4a
│   │   ├── 1khz.m4a
│   │   ├── 2khz.m4a
│   │   ├── 4khz.m4a
│   │   ├── 8khz.m4a
│   │   └── 12khz.m4a
│   ├── track_02/     # Second track set
│   └── ...
├── mucomp/           # MuComp game audio
├── muverb/           # MuVerb game audio
└── muwidth/          # MuWidth game audio
```

## Audio Specifications

| Property | Value |
|----------|-------|
| Format | M4A (AAC) |
| Bitrate | 128 kbps |
| Sample Rate | 44.1 kHz |
| Channels | Stereo |
| Duration | 10-30 seconds (seamless loop) |

## Creating MuFreQ Audio Files

### Step 1: Generate Base Track

Use Suno AI with this prompt:

```
Create a 20-second seamless loop. Ambient electronic music with soft
synthesizer pads, gentle arpeggios, and subtle bass. No drums, no vocals.
Warm and atmospheric. Perfect for audio ear training exercises.
Balanced frequency spectrum from 60Hz to 12kHz. Loopable.
```

### Step 2: Create EQ Variants

In your DAW (Logic, Ableton, Pro Tools):

1. Import the base track
2. For each frequency band, create a copy with +6dB boost:
   - 60 Hz: Low shelf or bell at 60 Hz
   - 125 Hz: Bell at 125 Hz
   - 250 Hz: Bell at 250 Hz
   - 500 Hz: Bell at 500 Hz
   - 1 kHz: Bell at 1 kHz
   - 2 kHz: Bell at 2 kHz
   - 4 kHz: Bell at 4 kHz
   - 8 kHz: Bell at 8 kHz
   - 12 kHz: High shelf or bell at 12 kHz

3. Export each variant as M4A 128kbps

### Step 3: File Naming

- `original.m4a` - Unprocessed base track
- `60hz.m4a` - +6dB at 60 Hz
- `125hz.m4a` - +6dB at 125 Hz
- etc.

## Adding New Tracks

After creating audio files:

1. Place them in `assets/audio/mufreq/track_XX/`
2. Update `src/services/audioService.ts` to register the new track
3. Test in the app

## Suno AI Prompts (5 Tracks)

### Track 1: Ambient Electronic
```
Create a 20-second seamless loop. Ambient electronic music with soft
synthesizer pads, gentle arpeggios, and subtle bass. No drums, no vocals.
Warm and atmospheric. Perfect for audio ear training exercises.
Balanced frequency spectrum from 60Hz to 12kHz. Loopable.
```

### Track 2: Acoustic Guitar
```
Create a 20-second seamless loop. Solo acoustic guitar fingerpicking
pattern. Warm, full-bodied tone. No effects, dry recording. Natural
harmonics and clear mid-range frequencies. Suitable for EQ training.
Loopable instrumental.
```

### Track 3: Lo-Fi Hip Hop
```
Create a 20-second seamless loop. Lo-fi hip hop instrumental beat.
Mellow piano chords, vinyl crackle texture, laid-back drums.
No vocals. Warm bass, smooth mids, soft highs.
Perfect for frequency identification practice. Loopable.
```

### Track 4: Jazz Piano
```
Create a 20-second seamless loop. Solo jazz piano improvisation.
Rich chords with walking bass notes in left hand. No other instruments.
Full dynamic range, natural room ambience. Clear attack and sustain.
Loopable instrumental piece.
```

### Track 5: Synth Pop
```
Create a 20-second seamless loop. Retro synth pop instrumental.
Punchy 808 kick, bright synth leads, analog bass. No vocals.
Wide stereo image, prominent low-end and crisp highs.
Modern production quality. Loopable.
```
