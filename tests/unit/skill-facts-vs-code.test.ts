/**
 * Unit — skills must not carry copies of values that live in code.
 *
 * ★WHY. `muedial-api/SKILL.md` prescribed prices that were four-for-four wrong (Omakase $8 vs the
 * code's $7.49, and three more), listed four subscription tiers that are all `deprecated: true` with
 * no purchase surface, and taught `DRUMS`→`DRUM_GROUP` where the implementation says `DRUMS_GROUP`.
 * A skill is a prescription: someone reads it and writes code from it. ★None of tsc / unit / lint /
 * build reads a SKILL.md, so those values sat wrong through two price revisions and a tier retirement.
 *
 * ★WHAT THIS CHECKS, and what it deliberately does not. Pinning the numbers here would just move the
 * copy — the next revision would leave this file wrong instead. So the assertions are:
 *   1. it DOES point at the file that owns each value
 *   2. prices are not restated at all — the pointer IS the fix there, and nothing pins a number
 *   3. an enum arrow MAY appear, but only if PINNED_ARROWS lists it AND this file asserts it against
 *      mappings.ts (so the skill's warning breaks when the code changes, instead of going stale)
 *   4. the two physical copies of the skill stay identical
 *
 * ★(3) was written as "no arrows at all" first, and it failed on the fix itself. That rule was a
 * proxy: the defect is not a copy, it is ★a copy with nothing tying it to the code. The two irregular
 * values are exactly what a reader gets wrong, so naming them earns its keep — provided the naming
 * breaks when the code moves. ★Loosened to match the property, not because it went red; prices, where
 * nothing is pinned, stay under the strict rule.
 * ★A negative mention ("`DRUM_GROUP` ではない") is not a prescription and never was in scope — the
 * arrow regex only matches the `X`→`Y` form. use vs mention, by construction rather than by exception.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const COPIES = [".claude/skills/muedial-api/SKILL.md", ".agents/skills/muedial-api/SKILL.md"];

/**
 * The only enum arrows the skill may state — the irregular ones a reader would otherwise get wrong.
 * ★Each must also appear in the mappings.ts assertions at the bottom of this file; that pairing is
 * what makes stating them safe. Adding an entry here without its assertion re-opens the hole.
 */
const PINNED_ARROWS = ["`DRUMS`→`DRUMS_GROUP`", "`GUITAR`→`E_GUITAR_GROUP`", "`OTHER`→`OTHER_GROUP1`"];
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("muedial-api skill — values stay in code, not in prose", () => {
  it("★both copies exist and are being read (a missing file would make the rest vacuous)", () => {
    for (const p of COPIES) expect(existsSync(join(process.cwd(), p)), `${p} missing`).toBe(true);
    // ★Positive control: the section this file is about is actually in the text we loaded.
    expect(read(COPIES[0])).toContain("Instrument Group");
  });

  it("★the two physical copies are identical (they are separate inodes, not a symlink)", () => {
    // Fixing one and not the other is how the drift returns; there is no link making it automatic.
    expect(read(COPIES[0])).toBe(read(COPIES[1]));
  });

  for (const p of COPIES) {
    describe(p, () => {
      it("★states no dollar prices — pricing.ts owns them", () => {
        // The 2026-05/06 revisions changed 3 of 4 single prices; the skill kept the old ones because
        // nothing tied the two together. The fix is a pointer, so there is nothing left to go stale.
        const prescriptive = read(p)
          .split("\n")
          .filter((l) => /\$\d/.test(l))
          .filter((l) => !l.includes("実測")); // a dated measurement, explicitly marked as of a date
        expect(prescriptive, `${p} still quotes prices: ${prescriptive.join(" | ")}`).toEqual([]);
      });

      it("★points at lib/dial/pricing.ts instead", () => {
        expect(read(p)).toContain("lib/dial/pricing.ts");
      });

      it("★every enum arrow it states is one this file pins against mappings.ts", () => {
        // A prescription looks like `X`→`Y`. Allowed only for the irregular values in PINNED_ARROWS,
        // each of which is asserted against the code at the end of this file — so if the code ever
        // regularises them, the skill's warning fails here instead of quietly becoming the stale thing.
        const arrows = read(p).match(/`[A-Z_]+`\s*→\s*`[A-Z_]+_GROUP\d?`/g) ?? [];
        const unpinned = arrows.filter((a) => !PINNED_ARROWS.includes(a));
        expect(unpinned, `${p} states enum values nothing pins: ${unpinned.join(" ")}`).toEqual([]);
      });

      it("★points at lib/roex/mappings.ts instead", () => {
        expect(read(p)).toContain("lib/roex/mappings.ts");
      });

      it("★says the subscription tiers are retired (all four are deprecated in code)", () => {
        const src = read(p);
        expect(src).toMatch(/退役|deprecated/);
        // ★Negative control on the same line of reasoning: the skill must not present them as live
        //   monthly products, which is exactly how it read before.
        expect(src).not.toMatch(/Basic \$19\.99\/月/);
      });
    });
  }

  it("★the code really is the source of truth these point at (else the pointers are decoration)", () => {
    const pricing = readFileSync(join(process.cwd(), "lib/dial/pricing.ts"), "utf8");
    const mappings = readFileSync(join(process.cwd(), "lib/roex/mappings.ts"), "utf8");
    expect(pricing).toContain("DIAL_SINGLE_PRICES");
    expect(mappings).toContain("INSTRUMENT_GROUP_MAP");
    // ★And the two irregular values the skill now warns about are real — if the code ever regularises
    //   them, the warning becomes the stale thing and this fails, which is the intent.
    // ★One assertion per PINNED_ARROWS entry — derived from the list, so a new pin without a real
    //   mapping fails here rather than silently widening what the skill is allowed to state.
    for (const arrow of PINNED_ARROWS) {
      const m = arrow.match(/`([A-Z_]+)`→`([A-Z_0-9]+)`/);
      expect(m, `unparseable pin: ${arrow}`).toBeTruthy();
      expect(mappings, `${m![1]} is pinned but mappings.ts does not map it to ${m![2]}`).toContain(
        `${m![1]}: '${m![2]}'`,
      );
    }
  });
});
