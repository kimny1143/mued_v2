/**
 * R3c-b — "taking longer than usual" reassurance threshold (PREVIEW-10).
 *
 * Asserts the threshold is calibrated to the prod p90 distribution and, critically, that it is a
 * UX-feedback gate (reassure), NOT a fail gate: real previews run 8–22 min, so the threshold must
 * be generous and unknown types must stay silent (the #434 false-fail regression we must not repeat).
 */
import { describe, it, expect } from 'vitest';
import { DIAL_LONG_WAIT_MS, isDialLongWait } from '@/lib/dial/processing-long-wait';

describe('isDialLongWait — long-wait reassurance threshold', () => {
  it('is false before the type threshold and true after it', () => {
    // preview threshold = 18 min.
    expect(isDialLongWait('preview', 17 * 60)).toBe(false);
    expect(isDialLongWait('preview', 18 * 60)).toBe(false); // exactly at threshold = not yet over
    expect(isDialLongWait('preview', 18 * 60 + 1)).toBe(true);
  });

  it('uses a per-type threshold (mastering is short, preview is long)', () => {
    // 6 minutes: past mastering (5 min) but well under preview (18 min).
    expect(isDialLongWait('mastering', 6 * 60)).toBe(true);
    expect(isDialLongWait('preview', 6 * 60)).toBe(false);
  });

  it('stays silent for unknown / absent render types (no guessing a threshold)', () => {
    expect(isDialLongWait(null, 60 * 60)).toBe(false);
    expect(isDialLongWait(undefined, 60 * 60)).toBe(false);
    expect(isDialLongWait('some_unknown_type', 60 * 60)).toBe(false);
  });

  it('thresholds stay well below the fail backstop (reassure, never fail-fast)', () => {
    // Every long-wait threshold must be far under the corresponding DIAL_BACKSTOP_MS so the
    // message only ever reassures during a healthy long tail — it must NEVER coincide with a
    // wall-clock fail. (preview backstop = 60min; long-wait = 18min.)
    expect(DIAL_LONG_WAIT_MS.preview).toBeLessThan(60 * 60_000);
    expect(DIAL_LONG_WAIT_MS.final_advanced).toBeLessThan(120 * 60_000);
    expect(DIAL_LONG_WAIT_MS.mastering_preview).toBeLessThan(45 * 60_000);
  });
});
