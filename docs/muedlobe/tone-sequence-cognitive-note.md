# ToneSequence vs WAIS Digit Span: Cognitive Process Differences

**Document Type**: Research Note
**Date**: 2026-02-12
**Status**: Internal POC Documentation

---

## Executive Summary

MUEDlobe's ToneSequence game is structurally inspired by WAIS Digit Span but measures **tonal working memory** rather than **verbal working memory**. This is a deliberate design choice optimized for music creators, not a limitation.

---

## Cognitive Pathway Comparison

### WAIS Digit Span (Verbal-Numeric Stimuli)

```
Spoken Numbers → Phonological Loop → Verbal Working Memory → Response
```

- **Encoding**: Linguistic/phonological (言語的符号化)
- **Storage**: Articulatory rehearsal in phonological loop
- **Neural substrate**: Left hemisphere language areas (Broca's, Wernicke's)
- **Measured capacity**: Verbal short-term memory span

### MUEDlobe ToneSequence (Tonal Stimuli)

```
Musical Pitches (C4-C5) → Tonal/Acoustic Encoding → Tonal Working Memory → Response
```

- **Encoding**: Tonal/acoustic (音高的符号化)
- **Storage**: Pitch contour representation in auditory working memory
- **Neural substrate**: Right hemisphere auditory cortex + bilateral superior temporal gyrus
- **Measured capacity**: Tonal short-term memory span

---

## Key Differences

### 1. Stimulus Domain

| Aspect | WAIS | ToneSequence |
|--------|------|--------------|
| Stimulus type | Verbal-numeric | Musical pitches |
| Frequency range | Speech (80-250 Hz) | C4-C5 (261.63-523.25 Hz) |
| Semantic content | Numbers (0-9) | Pure tones (no semantic meaning) |

### 2. Working Memory System Engaged

- **WAIS**: Phonological loop (Baddeley's model)
- **ToneSequence**: Tonal loop / auditory-spatial sketchpad for pitch

### 3. Neural Pathways

- **WAIS**: Left-lateralized language network
- **ToneSequence**: Right-lateralized auditory network + bilateral pitch processing

---

## Implications for MUEDlobe

### This is a Feature, Not a Bug

For MUEDlobe's target audience (music creators), **tonal working memory** is more relevant than verbal working memory:

1. **Domain-specific calibration**: Music production requires tracking multiple pitches, harmonies, and melodic patterns simultaneously
2. **Ecological validity**: Tonal WM directly reflects real-world music cognition tasks
3. **Hoo AI optimization**: The AI assistant can adapt to the user's tonal memory capacity, not just verbal capacity

### Expected Score Divergence from WAIS Norms

- Musicians may score **higher** on ToneSequence than WAIS Digit Span (due to trained tonal WM)
- Non-musicians may score **lower** (tonal encoding is less automatic than verbal)
- Scores are **not directly comparable** to WAIS standardized norms

### Empirical Validation (2026-02-12)

Pilot comparison against WAIS-III clinical data confirmed: individual with WAIS WM=128 (Superior) scored significantly lower on ToneSequence-based WM estimation (105-115). This empirically validates the tonal vs verbal WM distinction. See `wais-correlation-analysis.md` for full analysis.

---

## Three-Mode Structure (Parallels WAIS)

| Mode | WAIS Equivalent | ToneSequence Implementation |
|------|----------------|----------------------------|
| Forward | Digit Span Forward | Play sequence in original order |
| Backward | Digit Span Backward | Play sequence in reverse order |
| Sequencing | Digit Span Sequencing | Reorder by ascending pitch |

While the structure parallels WAIS, the **cognitive load** differs due to tonal vs. verbal encoding.

---

## Clinical Note

**MUEDlobe is explicitly NOT a WAIS-compliant diagnostic tool.**

- **Purpose**: Music-focused cognitive calibration for Hoo AI assistant
- **Scope**: Intra-individual profiling for personalized AI interaction
- **Not for**: Clinical diagnosis, IQ assessment, or normative comparison

---

## References

- Baddeley, A. D. (2000). The episodic buffer: A new component of working memory? *Trends in Cognitive Sciences*, 4(11), 417-423.
- Williamson, V. J., et al. (2010). Comparing short-term memory for sequences of verbal and tonal materials. *Memory & Cognition*, 38(6), 762-773.
- Zatorre, R. J., & Belin, P. (2001). Spectral and temporal processing in human auditory cortex. *Cerebral Cortex*, 11(10), 946-953.

---

*Last updated: 2026-02-12*
