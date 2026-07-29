/**
 * Unit — every environment variable read under `lib/analytics/` is one that actually exists.
 *
 * Why this exists: on 2026-07-29 all server-side GA4 (Measurement Protocol) sending was found to be
 * silently dead, in two separate modules, for different lengths of time:
 *
 *   lib/analytics/dial-events.ts   read GA4_MEASUREMENT_ID / GA4_API_SECRET        → 103 days dead
 *   lib/analytics/ga4-server.ts    read NEXT_PUBLIC_GA4_MEASUREMENT_ID             →  81 days dead
 *
 * Production only ever had NEXT_PUBLIC_GA_MEASUREMENT_ID (no "4") and GA4_MP_API_SECRET. Both
 * modules guard with `if (!measurementId || !apiSecret) return;` — fail-open — so a name that
 * nobody sets produces no error, no log anybody reads, and no data. Three different names existed
 * in the codebase for two concepts, and nothing compared them.
 *
 * ★Why the assertion is shaped THIS way (an allow-list, not a diff against .env.local.example):
 * a blanket "every process.env must appear in .env.local.example" was measured first and would
 * flag 49 variables today — a check that is red on day one gets deleted rather than obeyed. Worse,
 * the example file is not authoritative. The API-secret name below exists in production and is
 * absent from that file, so a diff against it would report a false positive on a name that works.
 *
 * (Phrasing note: an earlier draft of this paragraph put an env name directly after a colon, which
 * GitGuardian read as a key/value pair and flagged as a Generic High Entropy Secret — a real check
 * failure caused by prose, with no secret in the commit. Keep names out of `foo: NAME` position.)
 *
 * ★What this does NOT do, stated plainly rather than implied: it cannot compare code against
 * production. Reading Vercel's environment requires credentials CI does not have. This catches
 * "someone introduced a new analytics env name without justifying it" — which is exactly how all
 * three wrong names got in — but a name can still be in this list and absent from production.
 * Verifying that is a human step; it was last done by hand on 2026-07-29.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ANALYTICS_DIR = join(process.cwd(), "lib", "analytics");

/**
 * Each entry must say why the name is allowed — i.e. what makes us think it is set somewhere.
 * Adding a name here without being able to write that sentence is the bug this test exists for.
 */
const ALLOWED: Record<string, string> = {
  NEXT_PUBLIC_GA_MEASUREMENT_ID:
    "exists in Vercel production (verified by hand 2026-07-29); also the only GA name in .env.local.example",
  GA4_MP_API_SECRET:
    "exists in Vercel production (verified by hand 2026-07-29). NOT in .env.local.example — which is why this test does not diff against that file",
  GA4_DEBUG_MODE:
    "optional local switch; its absence is a deliberate no-op, not a silent failure",
};

const envNamesIn = (file: string): string[] => {
  const src = readFileSync(join(ANALYTICS_DIR, file), "utf8");
  return [...src.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
};

describe("lib/analytics environment variable names", () => {
  const files = readdirSync(ANALYTICS_DIR).filter((f) => f.endsWith(".ts"));

  it("scans a non-empty set of files (guards against the check silently covering nothing)", () => {
    expect(files.length).toBeGreaterThan(0);
    const total = files.flatMap(envNamesIn).length;
    expect(total).toBeGreaterThan(0); // if this ever hits 0, the regex broke — not "no env vars"
  });

  it.each(
    readdirSync(ANALYTICS_DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => [f] as const)
  )("%s reads only environment names we can account for", (file) => {
    const unknown = envNamesIn(file).filter((n) => !(n in ALLOWED));
    expect(unknown, `unaccounted-for env name(s) in lib/analytics/${file}. If this is intentional, add it to ALLOWED with the reason it is set somewhere — that sentence is the point of this test.`).toEqual([]);
  });

  it("keeps one name per concept — the same thing must not be read under two spellings", () => {
    const all = new Set(files.flatMap(envNamesIn));
    const measurementIds = [...all].filter((n) => n.includes("MEASUREMENT_ID"));
    const apiSecrets = [...all].filter((n) => n.includes("API_SECRET"));
    expect(measurementIds).toHaveLength(1); // was 2 before 2026-07-29 (GA_ and GA4_)
    expect(apiSecrets).toHaveLength(1); // was 2 before 2026-07-29 (GA4_MP_ and GA4_)
  });
});
