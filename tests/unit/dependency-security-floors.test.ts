/**
 * ★Declared floors for dependencies that were once vulnerable — the part `npm audit` cannot say.
 *
 * ★WHY THIS EXISTS. On 2026-09-10, PR #986 closed a production critical (next 16.2.11 → 16.3.4,
 * sharp → 0.35.4, js-yaml@3 → 3.15.2) by changing ★only package-lock.json. That was correct and
 * minimal — the declared ranges already ADMITTED the fixed versions, so nothing in package.json had
 * to move. But the reviewer (CCO) named what it left open, and it is measured, not asserted:
 *
 *     range          a version the range still ADMITTED   (npx semver -r <range> <version>)
 *     ^16.2.11   →   16.2.11   ★admitted  (unauthenticated RCE in the Image Optimization API)
 *     ^0.35.0    →   0.35.3    ★admitted  (GHSA-g89c-p67h-r497 / GHSA-2jg2-4ch7-h545 via libheif)
 *     ^3.15.1    →   3.15.1    ★admitted  (★the vulnerable range's top edge, exactly)
 *
 * ∴ after #986 the ONLY thing holding the fix was the lockfile. ★`scripts/verify/audit-prod-deps.ts`
 * would catch a regression — but the reviewer's sentence is the point of this file:
 * ★"the gate tells you it came back; it does not tell you why it must not."
 *
 * ★WHAT THIS FILE ADDS THAT THE AUDIT GATE DOES NOT.
 *   · The audit gate asks the network. ★This one is pure arithmetic on files in the repo — it still
 *     answers when the registry is down, which this repo has already been bitten by (issue #961).
 *   · The audit gate reports the RESOLVED version. ★This one constrains what is ADMISSIBLE, so a
 *     downgrade is refused at resolution time rather than caught one CI run later.
 *   · ★A failure here names the advisory. That is the whole reason the table is written out by hand
 *     instead of derived: a derived list would be current, and would teach nobody anything.
 *
 * ★THIS TABLE DOES NOT ROT — every row pins a version that is vulnerable as a matter of history and
 * will never stop being so. It can be INCOMPLETE (a new advisory is not covered until someone adds a
 * row), but it can never go falsely green on a row it does contain.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface Floor {
  /** package.json key. `name@major` is npm's override syntax for pinning one major line. */
  key: string;
  where: "dependencies" | "overrides";
  /** ★A version that is vulnerable as a matter of history. The floor must NOT admit it. */
  lastVulnerable: string;
  /** First version carrying the fix — the floor must be at least this. */
  firstFixed: string;
  advisory: string;
}

const FLOORS: Floor[] = [
  {
    key: "next",
    where: "dependencies",
    lastVulnerable: "16.2.11",
    firstFixed: "16.3.3",
    advisory: "Image Optimization API (AVIF): unauthenticated RCE — fixed in >=16.3.3 (PR #986)",
  },
  {
    key: "sharp",
    where: "overrides",
    lastVulnerable: "0.35.3",
    firstFixed: "0.35.4",
    advisory: "GHSA-g89c-p67h-r497 / GHSA-2jg2-4ch7-h545 (bundled libheif) — fixed in >=0.35.4",
  },
  {
    key: "js-yaml@3",
    where: "overrides",
    lastVulnerable: "3.15.1",
    firstFixed: "3.15.2",
    advisory: "maxTotalMergeKeys does not bound CPU on an empty merge source — fixed in >=3.15.2",
  },
];

/**
 * ★Lowest version a caret range admits. Deliberately NOT the `semver` package: the only copy in this
 * tree is a TRANSITIVE dependency, and a guard that silently stops running when an unrelated package
 * drops its dep is worse than no guard. Every range here is `^x.y.z`, whose minimum IS `x.y.z`, so
 * the arithmetic is a tuple compare — and the parser REFUSES anything it was not built for rather
 * than guessing, because a range shape it cannot read must not read as "fine".
 */
const minOf = (range: string): number[] => {
  const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range.trim());
  if (!m) throw new Error(`unsupported range shape: ${range} — extend minOf() rather than skipping`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const parse = (v: string): number[] => v.split(".").map(Number);

/** a >= b, lexicographic on [major, minor, patch]. */
const atLeast = (a: number[], b: number[]): boolean => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
};

const pkg = JSON.parse(readFileSync(join(".", "package.json"), "utf8")) as Record<
  string,
  Record<string, string>
>;

describe("dependency security floors", () => {
  it("★self-RED: the comparator rejects a floor that is too low", () => {
    // ★Without this, every assertion below would also pass if atLeast() always returned true. The
    //   values are the REAL pre-#986 floors, so this doubles as the record of what was wrong.
    expect(atLeast(minOf("^0.35.0"), parse("0.35.4"))).toBe(false);
    expect(atLeast(minOf("^16.2.11"), parse("16.3.3"))).toBe(false);
    expect(atLeast(minOf("^3.15.1"), parse("3.15.2"))).toBe(false);
    // ★…and accepts one that is high enough, so it is not simply always-false either.
    expect(atLeast(minOf("^0.35.4"), parse("0.35.4"))).toBe(true);
    expect(atLeast(minOf("^16.3.4"), parse("16.3.3"))).toBe(true);
  });

  it("★minOf() refuses a range shape it was not built for", () => {
    // ★A silent fallback here is how a guard goes quietly useless: someone writes ">=1.2.3" and the
    //   floor stops being checked while the suite stays green.
    expect(() => minOf(">=1.2.3")).toThrow(/unsupported range shape/);
    expect(() => minOf("~1.2.3")).toThrow(/unsupported range shape/);
    expect(() => minOf("16.3.4")).toThrow(/unsupported range shape/);
  });

  it.each(FLOORS)("★$key is floored above its advisory ($where)", (floor) => {
    const declared = pkg[floor.where]?.[floor.key];
    // ★Absence must not read as success: a removed key would otherwise skip the check.
    expect(declared, `${floor.key} is missing from ${floor.where} in package.json`).toBeTruthy();

    const min = minOf(declared);
    expect(
      atLeast(min, parse(floor.firstFixed)),
      `${floor.key} floor "${declared}" is below the fix.\n  ${floor.advisory}\n` +
        `  ★Raise it to at least ^${floor.firstFixed}. The lockfile alone is not the constraint — ` +
        `a resolve is free to pick ${floor.lastVulnerable} while this range admits it.`,
    ).toBe(true);

    // ★And state the consequence directly: the known-bad version must be inadmissible.
    expect(
      atLeast(parse(floor.lastVulnerable), min),
      `${floor.key} range "${declared}" still admits ${floor.lastVulnerable}`,
    ).toBe(false);
  });
});
