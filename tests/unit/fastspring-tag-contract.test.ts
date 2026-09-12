/**
 * ★The tags the checkout SENDS must be exactly the tags the webhook READS.
 *
 * ## What changed on 2026-09-13
 *
 * This file used to compare a PROSE list at the inert Buy slot against the parser, and carried a
 * second guard asserting the send side did not exist. ★That guard's own comment said what to do the
 * day it fired: "the day a popup is wired … the contract should move into code (where it can be
 * typed and tested) rather than staying prose."
 *
 * ★That day is today. The contract is now `CHECKOUT_TAG_NAMES` in lib/masterchain/fastspring-checkout.ts
 * and this file pins it to the parser. ★The prose is gone, so it can no longer go stale in silence.
 *
 * ## ★Why the old premise guard is REPLACED and not merely widened
 *
 * Its population was two named files. ★Measured before removing it: put a wrapper anywhere else —
 * `lib/`, a new component, the natural places — and all four of its markers went undetected. ★So the
 * guard written to announce "the send side now exists" would have stayed green on precisely the day
 * it existed, as long as the code landed outside those two files. ★An inclusion list of filenames is
 * a population you can walk around by accident.
 *
 * ★What replaces it has no filename list: it walks the source tree and asserts the integration has
 * exactly ONE origin. That is the property actually worth holding now — not "no checkout exists"
 * (false), but "there is no SECOND, unattributed checkout path", which is how tags get dropped.
 *
 * ## Why this matters more than a usual drift
 *
 * ★FastSpring carries only what the popup session was given. A tag not set at purchase time is gone
 * by the time the webhook runs, and that order is unattributable ★permanently — you cannot re-buy an
 * order with better instrumentation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CHECKOUT_TAG_NAMES } from "@/lib/masterchain/fastspring-checkout";

const PARSER = join(".", "lib", "masterchain", "fastspring-webhook.ts");
const CHECKOUT = join(".", "lib", "masterchain", "fastspring-checkout.ts");

/** Every `tags.<name>` the file mentions. */
function tagNames(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...new Set([...src.matchAll(/\btags\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();
}

/** ★Every source file under the given roots — an EXCLUSION-based population, not a list of names. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("FastSpring custom-tag contract", () => {
  it("★★the tags the checkout sends are exactly the tags the parser reads", () => {
    const parser = tagNames(PARSER);

    // ★Both populations non-empty first. Without this the comparison would pass with [] === [] the
    //   day a rename stops the regex matching, and guard nothing.
    expect(parser.length).toBeGreaterThanOrEqual(7);
    expect(CHECKOUT_TAG_NAMES.length).toBeGreaterThanOrEqual(7);

    // ★Set equality, not subset: a tag SENT but never read is wasted payload, and a tag READ but
    //   never sent makes every order unattributable on that dimension, forever.
    expect([...CHECKOUT_TAG_NAMES].sort()).toEqual(parser);
  });

  it("★the checkout actually writes every tag it declares — the list is not decoration", () => {
    // ★`CHECKOUT_TAG_NAMES` is a const array; nothing forces `buildCheckoutTags` to populate it.
    //   Without this, the contract could be satisfied by a list that the builder ignores.
    const src = readFileSync(CHECKOUT, "utf8");
    for (const name of CHECKOUT_TAG_NAMES) {
      expect(src.includes(`"${name}"`) || src.includes(`tags.${name}`), `${name} declared but never written`).toBe(
        true,
      );
    }
  });

  it("★★the integration has exactly one origin — no second, unattributed checkout path", () => {
    // ★Replaces the old "the send side does not exist" guard, whose population was two filenames and
    //   which this PR would otherwise have silenced rather than tripped.
    const files = [...walk("lib"), ...walk("components"), ...walk("app")];
    // ★Positive control: the walk found a real tree, not an empty one.
    expect(files.length).toBeGreaterThan(100);

    const owners = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return ["fsc-api", "data-storefront", "fastspring-builder"].some((m) => src.includes(m));
    });

    expect(owners, `expected exactly one checkout origin, found: ${owners.join(", ")}`).toEqual([CHECKOUT]);
  });
});
