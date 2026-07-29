/**
 * Unit — every analytics environment variable the app reads is one that actually exists.
 *
 * Why this exists: on 2026-07-29 all server-side GA4 (Measurement Protocol) sending was found to be
 * silently dead, in two separate modules, for different lengths of time:
 *
 *   lib/analytics/dial-events.ts   read GA4_MEASUREMENT_ID / GA4_API_SECRET        → 103 days dead
 *   lib/analytics/ga4-server.ts    read NEXT_PUBLIC_GA4_MEASUREMENT_ID             →  81 days dead
 *
 * Production only ever had NEXT_PUBLIC_GA_MEASUREMENT_ID (no "4") and the MP API secret. Both
 * modules guard with `if (!measurementId || !apiSecret) return;` — fail-open — so a name nobody
 * sets produces no error, no log anybody reads, and no data. Three names existed for two concepts,
 * and nothing compared them.
 *
 * ★The population is derived from the CODE, not from a directory. An earlier draft scanned only
 * lib/analytics/, which reproduced the very defect under repair: the same measurement-id name is
 * also read in app/layout.tsx, so a divergent spelling there would have passed. Scoping a check to
 * the place you already suspect is how the original bug survived 103 days. (product, 2026-07-29)
 *
 * ★Why an allow-list rather than a diff against .env.local.example: a blanket "every process.env
 * must appear in the example file" was measured first and would flag 49 variables today — a check
 * that is red on day one gets deleted rather than obeyed. And the example file is not
 * authoritative; the MP API secret exists in production yet is absent from it, so a diff would
 * report a false positive on a name that works.
 *
 * (Phrasing note: an earlier draft put an env name immediately after a colon in this comment, which
 * GitGuardian read as a key/value pair and reported as a Generic High Entropy Secret — a genuine
 * check failure caused by prose, with no secret in the commit. Keep names out of `foo: NAME` shape.)
 *
 * ★What this does NOT do, stated plainly rather than implied: it cannot compare code against
 * production. Reading Vercel's environment needs credentials CI does not have. It catches "a new
 * analytics env name was introduced without justification" — which is how all three wrong names got
 * in — but a name can be in this list and still be absent from production. That check is a human
 * step; last performed by hand on 2026-07-29.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SEARCH_ROOTS = ["lib", "app"];

/** Names that identify the analytics destination. Deliberately excludes NEXT_PUBLIC_GAME_DEBUG. */
const ANALYTICS_NAME =
  /(MEASUREMENT_ID|API_SECRET)$|^GA4_|^NEXT_PUBLIC_GA_|^NEXT_PUBLIC_GA4/;

/**
 * Each entry must say what makes us think the name is set somewhere. Adding one without being able
 * to write that sentence is the bug this test exists for.
 */
const ALLOWED: Record<string, string> = {
  NEXT_PUBLIC_GA_MEASUREMENT_ID:
    "proved from this repo, not from a note: app/layout.tsx renders the gtag <Script> only when this is truthy, and GA4 received 300 client dial_playback_issue events in the 60 days to 2026-07-29 — so it is set in production",
  GA4_MP_API_SECRET:
    "verified by hand in Vercel production on 2026-07-29. NOTE: weaker evidence than the line above — the wrong measurement-id name short-circuited every call, so this value was never actually exercised. Confirm by observing a server-side event arrive, not by reading code",
  GA4_DEBUG_MODE:
    "optional local switch; its absence is a deliberate no-op, not a silent failure",
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) return [];
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });

const envNamesIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);

/** Files anywhere under lib/ or app/ that read at least one analytics-identifying name. */
const analyticsFiles: string[] = SEARCH_ROOTS.flatMap((r) => walk(join(ROOT, r)))
  .filter((f) => envNamesIn(f).some((n) => ANALYTICS_NAME.test(n)))
  .sort();

describe("analytics environment variable names", () => {
  it("finds files to check (guards against the check silently covering nothing)", () => {
    // If this ever hits 0 the walk or the regex broke — it does NOT mean "no analytics env vars".
    expect(analyticsFiles.length).toBeGreaterThan(0);
    expect(analyticsFiles.flatMap(envNamesIn).length).toBeGreaterThan(0);
  });

  it.each(analyticsFiles.map((f) => [relative(ROOT, f), f] as const))(
    "%s reads only analytics env names we can account for",
    (_label, file) => {
      const unknown = envNamesIn(file)
        .filter((n) => ANALYTICS_NAME.test(n))
        .filter((n) => !(n in ALLOWED));
      expect(
        unknown,
        `unaccounted-for analytics env name(s). If intentional, add it to ALLOWED with the reason it is set somewhere — that sentence is the point of this test.`
      ).toEqual([]);
    }
  );

  it("keeps one name per concept — the same thing must not be read under two spellings", () => {
    const all = new Set(
      analyticsFiles.flatMap(envNamesIn).filter((n) => ANALYTICS_NAME.test(n))
    );
    // Suffix-anchored so a divergent spelling like GA4_SECRET is caught rather than slipping past
    // an `includes()` test, which is how three names coexisted in the first place.
    expect([...all].filter((n) => n.endsWith("MEASUREMENT_ID"))).toHaveLength(1); // was 2
    expect([...all].filter((n) => n.endsWith("SECRET"))).toHaveLength(1); // was 2
  });
});
