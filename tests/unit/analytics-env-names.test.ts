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
 * ★What this does NOT do, stated plainly rather than implied:
 *
 * 1. It cannot compare code against production. Reading Vercel's environment needs credentials CI
 *    does not have. It catches "a new analytics env name was introduced without justification" —
 *    which is how all three wrong names got in — but a name can be in this list and still be absent
 *    from production. That check is a human step; last performed by hand on 2026-07-29.
 *
 * 2. ★It walks the FILESYSTEM at process.cwd(), not the git tree — so the set of files it checks is
 *    not the same in CI as on a developer's machine. CI sees only tracked files; a working tree can
 *    hold untracked ones. Concretely: `apps/` is gitignored (.gitignore:51) and has 0 files in this
 *    repo, so the `apps` exclusion below is a no-op in CI and only bites locally. The consequence
 *    runs both ways — a green CI run says nothing about untracked analytics code on someone's disk,
 *    and someone can fail locally on a file no reviewer can see. (product, 2026-07-29)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * ★An EXCLUSION list, deliberately not an inclusion list. An earlier draft searched ["lib","app"] —
 * the places we happened to remember — which left root-level files out. `instrumentation.ts` is
 * literally documented as "initialize monitoring and observability tools" and is the natural home
 * for the next piece of server-side analytics; a wrong name written there would have passed.
 * An inclusion list leaks whenever someone forgets a directory; an exclusion list only leaks when
 * someone deliberately adds an entry, and each entry below has to justify itself. (product, 2026-07-29)
 *
 * `tests` is excluded because test files legitimately assign these names themselves — which is
 * precisely what made tests/unit/ga4-server.test.ts blind to an 81-day outage.
 */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  // Test files legitimately assign these names themselves — which is precisely what made
  // tests/unit/ga4-server.test.ts blind to an 81-day outage.
  "tests",
  // apps/ holds separate applications with their own environments.
  // ★This entry is a no-op in CI: apps/ is gitignored (.gitignore:51) and has 0 files in the repo.
  // It only takes effect in a local working tree that happens to contain one — do not delete it as
  // dead just because `ls apps/` is empty for you.
  // Checked before excluding, not waved past — but note the evidence below came from a local
  // working tree and CANNOT be reproduced from this repo: apps/muedear is an Expo app reading
  // EXPO_PUBLIC_GA4_FIREBASE_APP_ID and EXPO_PUBLIC_GA4_API_SECRET from its own .env.local, and
  // both names were present in its own .env.example. It measures via a Firebase App ID, not a web
  // Measurement ID, and its environment is not this project's Vercel environment — so "does this
  // name exist in production" is a different question there. The tracked copy of that code lives in
  // kimny1143/mued_nativeapps, which product課 owns; they are following up there separately.
  "apps",
]);

/** Names that identify the analytics destination. Deliberately excludes NEXT_PUBLIC_GAME_DEBUG. */
const ANALYTICS_NAME =
  /(MEASUREMENT_ID|API_SECRET)$|^GA4_|^NEXT_PUBLIC_GA_|^NEXT_PUBLIC_GA4/;

/**
 * Each entry must say what makes us think the name is set somewhere. Adding one without being able
 * to write that sentence is the bug this test exists for.
 */
const ALLOWED: Record<string, string> = {
  NEXT_PUBLIC_GA_MEASUREMENT_ID:
    "proved from this repo, not from a note: app/layout.tsx passes this to components/features/cookie-consent, which renders the gtag <Script> only when it is truthy (and, since the consent banner, only after the visitor accepts), and GA4 received 300 client dial_playback_issue events in the 60 days to 2026-07-29 — so it is set in production",
  GA4_MP_API_SECRET:
    "verified by hand in Vercel production on 2026-07-29. NOTE: weaker evidence than the line above — the wrong measurement-id name short-circuited every call, so this value was never actually exercised. Confirm by observing a server-side event arrive, not by reading code",
  GA4_DEBUG_MODE:
    "optional local switch; its absence is a deliberate no-op, not a silent failure",
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    if (EXCLUDED_DIRS.has(entry) || entry.startsWith(".")) return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });

const envNamesIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);

/** Every source file in the repo that reads at least one analytics-identifying name. */
const allSourceFiles: string[] = walk(ROOT);
const analyticsFiles: string[] = allSourceFiles
  .filter((f) => envNamesIn(f).some((n) => ANALYTICS_NAME.test(n)))
  .sort();

describe("analytics environment variable names", () => {
  it("finds files to check (guards against the check silently covering nothing)", () => {
    // If this ever hits 0 the walk or the regex broke — it does NOT mean "no analytics env vars".
    expect(allSourceFiles.length).toBeGreaterThan(100); // the walk reaches the whole repo, not one corner
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
