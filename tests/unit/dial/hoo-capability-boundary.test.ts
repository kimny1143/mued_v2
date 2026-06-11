/**
 * Merge gate for the Hoo capability-boundary prompt fix (Yuu incident issue ②).
 *
 * Yuu asked Hoo to "fix the timing offset" — Hoo verbally accepted all 4 requests but silently
 * dropped timing (the tool has no timing param). This asserts the dialogue system prompt now:
 *  (A) names what MUEDial can/can't do, (B) declines out-of-scope orders in kimny's confirmed tone,
 *  (C) tells Hoo to only report changes it actually applied.
 *
 * @see docs/drafts/hoo-capability-boundary-prompt-fix (kimny voice-checked decline phrasing)
 */
import { describe, it, expect } from 'vitest';
import { buildDialSystemPrompt, type DialPromptInput } from '@/lib/ai/prompts/dial';

const base: DialPromptInput = {
  mode: 'dialogue',
  previewCount: 0,
  previewLimit: 0,
  musicalStyle: 'pop',
  tracks: [
    { filename: 'v.wav', instrumentGroup: 'VOCAL', presenceSetting: 'NORMAL', panPreference: 'NO_PREFERENCE', reverbPreference: 'NONE' },
  ],
  hasPreview: true,
  phase: 1,
  mixCheckCount: 0,
  paidCycleCount: 0,
  baseCycleLimit: 1,
  additionalCyclesPurchased: 0,
  additionalCycleLimit: 0,
  masteringMode: 'omakase',
  isMasteringPhase: false,
  masteringPreviewCount: 0,
  hasMasteringPreview: false,
};

describe('Hoo capability boundary — dialogue system prompt', () => {
  it('JA: declares the boundary, names out-of-scope edits, uses the confirmed decline tone, and APPLIED honesty', () => {
    const p = buildDialSystemPrompt({ ...base, locale: 'ja' });
    expect(p).toContain('MUEDialの守備範囲');
    // out-of-scope items named (A)
    expect(p).toMatch(/タイミング/);
    expect(p).toMatch(/ピッチ補正/);
    expect(p).toMatch(/テンポ・BPM変更/);
    // kimny voice-checked decline phrasing (B) — short, human, "まだ" + "ごめんね" + 一人称「僕」
    expect(p).toContain('僕はまだピッチやタイミングは直せないんだ。ごめんね');
    expect(p).toContain('長い手順説明はしない'); // not a tutorial
    // APPLIED honesty (C)
    expect(p).toContain('実際に適用した変更だけを伝える');
  });

  it('EN: declares the boundary, names out-of-scope edits, uses the confirmed decline tone, and APPLIED honesty', () => {
    const p = buildDialSystemPrompt({ ...base, locale: 'en' });
    expect(p).toContain('What MUEDial can do');
    expect(p).toMatch(/timing\/rhythm correction/);
    expect(p).toMatch(/pitch correction/);
    expect(p).toMatch(/tempo\/BPM changes/);
    expect(p).toContain("I can't fix pitch or timing yet — sorry about that.");
    expect(p).toContain('No tutorial-style instructions');
    expect(p).toContain('Only report changes you actually applied');
  });
});
