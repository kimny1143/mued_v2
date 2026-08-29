/**
 * Unit — each plugin landing page shows ITS OWN wordmark, not the one it was copied from.
 *
 * Regression guard for a live bug (2026-08-29, found by kimny): `/en|ja/muedrive` rendered
 * **"MUEDlim"** in the header wordmark and the hero H1 — from launch on 2026-08-28 until this fix.
 * Both spans were left over from `muedlim-landing`, which the file says outright it mirrors. The page
 * was otherwise correct (21–22 other "MUEDrive" occurrences), which is why it survived review: the
 * error is two three-letter strings inside a page that is right everywhere else.
 *
 * ★No STATIC check could have caught it. The wordmark is split into two spans so the tail can be
 * tinted, so it is not copy in an i18n file — `muedrive.hero.title` exists and equals "MUEDrive", but
 * the H1 does not use it. tsc sees two valid strings; the page renders.
 * ★But "nothing could have caught it" would be too strong, and this file said that until product課
 * corrected it: ★`curl -s https://mued.jp/en/muedrive | grep -c '>lim<'` finds it in one line, and
 * that is how both this review and this fix confirmed it. The honest form is "★invisible to static
 * analysis; visible the moment anyone reads the rendered output". This test is an approximation of
 * reading it. ★And it landed on the page that receives the rekkerd / KVR referral traffic.
 *
 * ★The population is the FILESYSTEM (`components/features/*-landing/*-landing-content.tsx`), not a
 * list kept here — a fourth module gets covered on the day its directory appears, which is the same
 * day the copy-paste that causes this happens.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const FEATURES = join(process.cwd(), "components", "features");

/** Wordmark tail per plugin: the coloured half of `MUED` + tail. */
const TAILS: Record<string, string> = { muedsat: "sat", muedlim: "lim", muedrive: "rive" };

/**
 * Landings exempt from the "no foreign tail" rule, each with the reason. ★An allowlist rather than a
 * narrowed population: excluding something silently is the same as not checking it, and the reason is
 * what a future reader needs in order to decide whether the exemption still holds.
 */
const EXEMPT: Record<string, string> = {
  muedsp: "catalogue page — it lists every module, so every tail appears there legitimately",
  advisory: "not a plugin; no MUED+tail wordmark",
  muedear: "not part of the MUEDsp plugin family; its own wordmark",
};

function landingFiles(): { name: string; path: string }[] {
  return readdirSync(FEATURES)
    .filter((d) => d.endsWith("-landing"))
    .map((d) => ({ name: d.replace(/-landing$/, ""), path: join(FEATURES, d, `${d}-content.tsx`) }))
    .filter((f) => existsSync(f.path));
}

describe("landing wordmarks", () => {
  it("★finds the landing pages at all (an empty population would pass every check below)", () => {
    const files = landingFiles();
    expect(files.length).toBeGreaterThanOrEqual(3);
    // ★Positive control: the three plugin landings must be among them, or the glob has drifted and the
    //   per-plugin assertions would silently cover nothing.
    for (const key of Object.keys(TAILS)) {
      expect(files.map((f) => f.name)).toContain(key);
    }
  });

  it("★every landing is either checked or exempt — none is silently skipped", () => {
    for (const { name } of landingFiles()) {
      expect(
        name in TAILS || name in EXEMPT,
        `${name}: neither has a wordmark tail nor an exemption reason — add one`,
      ).toBe(true);
    }
  });

  for (const [plugin, tail] of Object.entries(TAILS)) {
    describe(plugin, () => {
      const src = () =>
        readFileSync(join(FEATURES, `${plugin}-landing`, `${plugin}-landing-content.tsx`), "utf8");

      it(`shows its own tail >${tail}<`, () => {
        // ★Positive control for the negative assertion below: if the file stopped containing any
        //   wordmark at all, "no foreign tail" would pass while the page rendered a bare "MUED".
        expect(src().includes(`>${tail}<`)).toBe(true);
      });

      it("★shows no OTHER plugin's tail (this is the bug that shipped)", () => {
        const foreign = Object.values(TAILS).filter((t) => t !== tail);
        for (const t of foreign) {
          expect(src().includes(`>${t}<`), `${plugin} renders >${t}< — a wordmark from another module`).toBe(
            false,
          );
        }
      });
    });
  }

  it("★the exemptions are real, not a way to drop an inconvenient file", () => {
    // Each exempt landing must actually exist; a stale entry would quietly shrink the population.
    for (const name of Object.keys(EXEMPT)) {
      expect(landingFiles().map((f) => f.name), `${name} is exempt but has no landing`).toContain(name);
    }
  });
});
