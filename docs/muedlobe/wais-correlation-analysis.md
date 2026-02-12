# MUEDlobe vs WAIS-III: Correlation Analysis & Future Roadmap

**Document Type**: POC Validation Note
**Date**: 2026-02-12
**Status**: Internal — anonymized pilot data

---

## Background

MUEDlobe pilot data was compared against an actual WAIS-III clinical assessment (conducted ~10 years prior) for the same individual. This provides the first empirical data point for evaluating MUEDlobe's measurement characteristics.

---

## Results Comparison

### Index-Level Comparison

| Index | MUEDlobe Estimate | WAIS-III Actual | Delta | Direction |
|-------|-------------------|-----------------|-------|-----------|
| WM (Working Memory) | 105-115 | **128** | -13 to -23 | Significant underestimate |
| PS (Processing Speed) | 115-125 | **97** | +18 to +28 | Significant overestimate |
| VC (Verbal Comprehension) | 110-120 | 104 | +6 to +16 | Moderate overestimate |
| PO/PR (Perceptual Reasoning) | 120-130 | 116 | +4 to +14 | Closest match |

### WAIS-III Profile (Actual)

```
WM(128) >> PO(116) > VC(104) >= PS(97)
```

Notable WAIS-III subtest peaks: Arithmetic=18, Digit Span=15 (WM pair)

### MUEDlobe Raw Scores

| Game | Raw Score | Theoretical Max | Achievement |
|------|-----------|-----------------|-------------|
| Tone Sequence (WM) | 24.6 | ~39.6 | 62% |
| Mental Math (WM) | 30.1 | ~45.8 | 66% |
| Symbol Match (PS) | 52 | ~50 practical | >100% |
| Code Fill (PS) | 57 | ~50 practical | >100% |
| Word Bridge (VC) | 21 | 24 | 88% |
| Pattern Complete (PR) | 27 | 28.5 | 95% |
| Focus Flow (ATT) | 4.08 | ~4.5 | 91% |

---

## Analysis of Discrepancies

### 1. WM: Tonal WM vs Verbal WM (Major Finding)

**WAIS WM=128 vs MUEDlobe WM estimate 105-115**

This is the most significant finding. The individual's verbal WM is in the Superior range (Arithmetic=18, Digit Span=15), but tonal WM (ToneSequence=24.6/39.6) did not reach the same level.

**Root cause**: ToneSequence measures tonal working memory (pitch-based encoding), not verbal working memory (phonological loop). These are distinct cognitive systems engaging different neural pathways. See `tone-sequence-cognitive-note.md` for detailed analysis.

**Future direction**: Consider adding a verbal/numeric digit span task (closer to WAIS format) alongside ToneSequence, so that WM composite better captures verbal WM capacity. ToneSequence remains valuable as a music-specific measure, but should not be the sole WM indicator if WAIS-like correlation is desired.

### 2. PS: Motor Component Removal (Structural Difference)

**WAIS PS=97 vs MUEDlobe PS estimate 115-125**

MUEDlobe PS tasks (Symbol Match, Code Fill) are screen-tap based, removing the handwriting motor demands of WAIS PS subtests (Coding, Symbol Search). The individual's cognitive processing speed is fast, but paper-and-pencil output speed is average.

**Interpretation**: MUEDlobe measures "pure cognitive processing speed" while WAIS measures "processing speed + motor output." For digital music creators, the MUEDlobe approach may be more ecologically valid.

**Future direction**: Overall score scaling may need adjustment downward. PS scores tend to run high compared to WAIS norms. Consider recalibrating the normalization parameters (mean/SD) after collecting more pilot data. No need to add motor component — the tap-based design is correct for the target audience.

### 3. VC: Missing Vocabulary Subtest (Coverage Gap)

**WAIS VC=104 vs MUEDlobe VC estimate 110-120**

WAIS VC is composed of: Information(10), Similarities(11), Vocabulary(7), Comprehension(11). The low Vocabulary score (scaled=7) significantly pulled down the composite. MUEDlobe only has Word Bridge (similar to Similarities), missing the vocabulary dimension entirely.

**Future direction**: Add a vocabulary-type task to improve VC coverage. Options:
- **Word definition game**: Given a word, select the best definition from options (closest to WAIS Vocabulary)
- **Comprehension task**: Social/practical reasoning questions adapted for music context
- Adding even one more VC subtest would substantially improve VC estimation accuracy

### 4. PO/PR: Best Match (Validation Point)

**WAIS PO=116 vs MUEDlobe PR estimate 120-130**

Pattern Complete closely mirrors WAIS Matrix Reasoning (actual scaled score=15, which aligns with 95% achievement rate). This is the strongest validation point — when task structure is similar, MUEDlobe and WAIS correlate well.

---

## Summary of Action Items

| Priority | Area | Issue | Proposed Action |
|----------|------|-------|----------------|
| **Medium** | WM | Tonal WM ≠ Verbal WM, low WAIS correlation | Consider adding verbal digit span task |
| **Low** | PS | Scores run high vs WAIS norms | Recalibrate normalization params after more data |
| **Medium** | VC | Missing vocabulary coverage | Add vocabulary-type game to improve VC accuracy |
| **None** | PR | Good WAIS correlation | No change needed |
| **None** | ATT | No WAIS equivalent (CPT domain) | No change needed |

---

## General Assessment

The overall game design direction and gamification approach is strong. The discrepancies found are not flaws in the game design but rather expected consequences of:
1. Measuring different cognitive constructs (tonal vs verbal WM)
2. Using different modalities (screen tap vs handwriting)
3. Incomplete coverage of certain domains (VC lacking vocabulary)

UI polish opportunities remain, but the core measurement architecture is sound.

---

## Caveats

- N=1 pilot data — patterns may not generalize
- ~10-year gap between WAIS-III and MUEDlobe assessment
- WAIS-III (not WAIS-IV/V) — index structure differs slightly
- MUEDlobe normalization uses provisional norms, not population-based

---

*Last updated: 2026-02-12*
