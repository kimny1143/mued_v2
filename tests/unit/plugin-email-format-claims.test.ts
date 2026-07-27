import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Unit — the free plugins ship VST3 + AU + AAX, and the emails must not say otherwise.
 *
 * ## Why this reads the source file instead of rendering an email
 *
 * The format list appears up to four times per plugin (HTML caption, HTML prose, plain-text body,
 * × JA/EN), and `sendPluginDownloadEmail` needs Resend to run. What drifted was one of those
 * variants, not the send path — so the thing worth pinning is the copy itself, wherever it appears.
 *
 * ## What went wrong (2026-07-27, caught by conductor from a screenshot)
 *
 * The MUEDlim download email said "VST3 · AU · AAX (Pro Tools)" in its caption and plain-text body
 * but "macOS (Universal), VST3 and AU" in its HTML prose — ★the same email contradicted itself, and
 * the wrong half is the half a Pro Tools user reads as "there is no AAX build for me". The AAX
 * binary exists and is signed; only the sentence was stale (PR #658 set the three-format fact and
 * this line was missed).
 *
 * kimny's standing rule: every MUEDsp plugin ships VST3/AU/AAX and ★the copy says all three, free
 * ones included. Dropping AAX from a sentence is not a wording choice — Pro Tools is the DAW the
 * rule exists for.
 */
/**
 * ## Scope: user-facing copy only
 *
 * The emails and the site strings. ★Deliberately NOT the `lib/muedsat|muedlim/config.ts` comments:
 * those legitimately describe past builds ("replaced the 2-format GR build, VST3/AU-only"), and a
 * line rule there would flag an accurate sentence about history. A guard that fights true statements
 * gets deleted by the next person, so it stops at the copy a buyer actually reads.
 */
const FILES = [
  'lib/services/email.service.ts',
  'messages/ja.json',
  'messages/en.json',
];

// A line that enumerates plugin formats. `VST3` appears for no other reason in these files.
const FORMAT_LINES = FILES.flatMap((file) =>
  readFileSync(path.resolve(__dirname, '../..', file), 'utf8')
    .split('\n')
    .map((text, i) => ({ file, line: i + 1, text }))
    .filter((l) => l.text.includes('VST3')),
);

describe('free-plugin emails — format claims', () => {
  it('every place that names VST3 also names AAX (Pro Tools)', () => {
    const missing = FORMAT_LINES.filter((l) => !l.text.includes('AAX'));
    expect(
      missing.map((l) => `${l.file}:${l.line}`),
      'a format list dropped AAX — Pro Tools users read that as "no build for me", and the AAX binary does ship (verified in the .pkg: vst3 / au / aax)',
    ).toEqual([]);
  });

  it('the enumerations exist at all (guards against this suite passing vacuously)', () => {
    // If the copy is refactored so `VST3` no longer appears literally, the assertion above becomes
    // trivially true. Fail loudly instead: whoever moved it should point this test at the new home.
    // Floor is per-file so deleting one surface's copy cannot be masked by another's.
    for (const file of FILES) {
      expect(
        FORMAT_LINES.filter((l) => l.file === file).length,
        `${file}: no format enumeration found — if the copy moved, move this test with it`,
      ).toBeGreaterThanOrEqual(4);
    }
  });
});
