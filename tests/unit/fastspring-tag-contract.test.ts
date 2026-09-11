/**
 * ★The tag list written at the Buy slot must be the tag list the webhook actually reads.
 *
 * ## Why this guard exists
 *
 * The masterchain purchase flow is split across a half that exists and a half that does not:
 *
 *   · RECEIVING (exists) — `parseFastspringOrderCompleted` reads the order's custom tags and stores
 *     them on `masterchain_purchases.firstTouch`.
 *   · SENDING (does not exist) — the Buy button is `disabled`; there is no storefront id, no product
 *     path, no popup script. Measured 2026-09-10 (insight, via conductor; re-measured here):
 *     `fsc-api` 0, `createSession` 0, `data-storefront` 0 across app/ and components/.
 *
 * ★So the contract between the halves currently lives in a COMMENT at the inert Buy slot — the place
 * whoever wires the popup will already be looking. ★A comment is the right home for it (there is no
 * code to attach a test to), but a comment is also exactly the thing that goes stale in silence:
 * add a tag to the parser, and the note keeps telling the next person the old list.
 *
 * ★This is the only part of the gap that IS testable today, so it is the part that gets a test.
 *
 * ## Why it matters more than a usual drift
 *
 * ★FastSpring carries only what the popup session was given. A tag not set at purchase time is gone
 * by the time the webhook runs, and that order is unattributable ★permanently — you cannot re-buy an
 * order with better instrumentation. ★If the note is wrong on launch day, the launch is unmeasurable
 * and nobody finds out until the numbers are asked for.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PARSER = join(".", "lib", "masterchain", "fastspring-webhook.ts");
const BUY_SLOT = join(".", "components", "features", "muedsp-landing", "muedsp-landing-content.tsx");

/** Every `tags.<name>` the file mentions. Same extraction on both sides, so neither can drift alone. */
function tagNames(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...new Set([...src.matchAll(/\btags\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();
}

describe("FastSpring custom-tag contract", () => {
  it("★the Buy-slot note lists exactly the tags the parser reads", () => {
    const parser = tagNames(PARSER);
    const note = tagNames(BUY_SLOT);

    // ★Assert both populations are non-empty first. If the regex ever stops matching — a rename, a
    //   reformat — this comparison would pass with [] === [] and guard nothing.
    expect(parser.length).toBeGreaterThanOrEqual(7);
    expect(note.length).toBeGreaterThanOrEqual(7);

    // ★Set equality, not "the note is a subset": a tag documented but NOT read is just as wrong —
    //   whoever wires the popup would spend effort passing something nothing consumes.
    expect(note).toEqual(parser);
  });

  it("★the send side is still absent — when this fails, the note is no longer the only contract", () => {
    // ★A guard on the PREMISE. The note says "the send side does not exist"; the day a popup is wired,
    //   that sentence becomes false and the contract should move into code (where it can be typed and
    //   tested) rather than staying prose. ★This test is how that day announces itself instead of the
    //   note quietly becoming a lie.
    const ui = [
      readFileSync(BUY_SLOT, "utf8"),
      readFileSync(join(".", "components", "features", "landing", "integrated-landing-content-v2.tsx"), "utf8"),
    ].join("\n");
    // ★Real integration markers only — not the word "fastspring", which appears in policy comments.
    for (const marker of ["fsc-api", "createSession(", "data-storefront", "onFSPopupClosed"]) {
      expect(ui.includes(marker), `${marker} appeared — a checkout now exists; move the tag contract into code`).toBe(false);
    }
    // ★Positive control: the extraction is reading a real file, not an empty string.
    expect(ui).toContain("buyLabel");
  });
});
