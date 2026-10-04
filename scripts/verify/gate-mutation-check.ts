/**
 * Mutation check for the PR merge gate — ★turns "I saw it go RED" into something you can re-run.
 *
 * ★WHY THIS EXISTS. When PR #971 was reviewed, the author's evidence for "these assertions actually
 * bite" was a list of four mutations applied by hand and reverted. product課 named the problem
 * exactly: ★those mutations are not verifiable from the artifact — grep the repo and you find zero of
 * them, because a mutation is applied and then undone. ★The RED was real; the EVIDENCE was testimony.
 * The in-repo SELF_RED cases were checkable as objects; the mutations were not.
 *
 * ★So the mutations live here now. Each one names a safety property, the edit that would break it,
 * and the observable that must flip. Running this file re-derives the claim from scratch.
 *
 * ★HOW IT AVOIDS THE OBVIOUS TRAP. It never edits the real gate. It writes a mutated COPY to a temp
 * directory and imports that, so a crash mid-run cannot leave the repo holding a sabotaged gate —
 * which is precisely the file you least want to leave broken.
 *
 * ★WHAT A FAILURE HERE MEANS. Not "the gate is wrong" — it means ★THE TEST SUITE IS NOT PINNING WHAT
 * IT CLAIMS TO. If a mutation does not flip its observable, that assertion is decorative: you could
 * ship the broken behaviour and the suite would stay green. That is the same class as a check that
 * reports 0 because its filter is broken.
 *
 *   npx tsx scripts/verify/gate-mutation-check.ts
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GATE = resolve("scripts/verify/pr-merge-gate.ts");

interface Mutation {
  name: string;
  /** The safety property this mutation destroys — in words, for whoever reads a failure. */
  property: string;
  find: string;
  replace: string;
  /**
   * Read the observable from a loaded module. The check asserts `good !== mutated`: the real gate
   * must give the safe answer, and the sabotaged one must not. Equality means nothing is pinned.
   */
  observe: (m: Record<string, any>) => string;
  expectGood: string;
}

const done = (name: string, conclusion: string | null) => ({ name, status: "completed", conclusion });
const ok = (name: string) => done(name, "success");

const MUTATIONS: Mutation[] = [
  {
    name: "null-is-ready",
    property: "a check that completed with NO conclusion must not read as pass",
    find: "const noAnswer = (c: string | null | undefined) => c == null || c === \"\" || NO_VERDICT.has(c);",
    replace: "const noAnswer = (c: string | null | undefined) => c != null && c !== \"\" && NO_VERDICT.has(c);",
    observe: (m) => m.classify([done("Validate", null), ok("Test"), ok("Build")]).kind,
    expectGood: "void",
  },
  {
    name: "skip-any-nonrequired",
    property: "a skipped check that is not on the allowlist must not be excused (the scanner did not run)",
    find: 'r.conclusion === "skipped" && SKIPPABLE.has(r.name)',
    replace: 'r.conclusion === "skipped" && !(REQUIRED as readonly string[]).includes(r.name)',
    observe: (m) =>
      m.classify([ok("Validate"), ok("Test"), ok("Build"), done("GitGuardian Security Checks", "skipped")]).kind,
    expectGood: "void",
  },
  {
    name: "void-merges",
    property: "a verdict of void must never authorise a merge, whatever the caller asked for",
    find: 'if (v.kind === "void") return { exit: 2, merge: false };',
    replace: 'if (v.kind === "void") return { exit: 2, merge: doMerge };',
    observe: (m) => String(m.actionFor({ kind: "void", reason: "x" }, true).merge),
    expectGood: "false",
  },
  {
    name: "no-status-context",
    property: "commit statuses (Vercel) must enter the population — they are invisible to check-runs",
    find: 'if (e.__typename === "StatusContext") {',
    replace: "if (false) {",
    observe: (m) => m.fromRollup({ __typename: "StatusContext", context: "Vercel", state: "SUCCESS" }).name,
    expectGood: "Vercel",
  },
  {
    name: "duplicate-names-ignored",
    property: "two runs sharing a name must void the cross-check — a Map would keep only the last",
    find: "return [...new Set(runs.map((r) => r.name).filter((n, i, a) => a.indexOf(n) !== i))];",
    replace: "return [];",
    observe: (m) =>
      JSON.stringify(m.duplicateNames([ok("Build"), done("Build", "failure"), ok("Validate")])),
    expectGood: '["Build"]',
  },
  {
    name: "required-skipped-is-ready",
    property: "a REQUIRED check reporting skipped did not run — it must not read as pass",
    find: "const undecided = runs.filter((r) => r.status === \"completed\" && !excused(r) && noAnswer(r.conclusion));",
    replace: "const undecided: CheckRun[] = [];",
    observe: (m) => m.classify([ok("Validate"), done("Test", "skipped"), ok("Build")]).kind,
    expectGood: "void",
  },
  {
    // ⑥ G1 of the sales-path guard (CCO #1224): without the sales-impact check, a customer-path PR with no line
    //   would reach "ready". The observable is the reason string's presence for such a PR.
    name: "sales-impact-unchecked",
    property: "a PR on the customer path without a sales-impact line must not be mergeable",
    find: "  if (!touchesSalesPath([...paths]) && !truncated) return null;",
    replace: "  return null;",
    observe: (m) =>
      m.salesImpactVoidReason(["components/features/muedsp-landing/masterchain-try.tsx"], "## no line") === null ? "ready" : "void",
    expectGood: "void",
  },
  {
    // ⑥ guard-change (CCO #1227): without it, a PR could loosen a sales-path guard in the same PR as the change the
    //   guard would have stopped. Observed on a guard file that is NOT on the customer path (the unit tests).
    name: "guard-change-unchecked",
    property: "a PR that edits a sales-path guard without a guard-change line must not be mergeable",
    find: "  if (touchesGuard(paths) || truncated) {",
    replace: "  if (false) {",
    observe: (m) => (m.salesImpactVoidReason(["tests/unit/sales-impact-line.test.ts"], "## no line") === null ? "ready" : "void"),
    expectGood: "void",
  },
];

async function main(): Promise<void> {
  // ★The copies live in a temp dir, so the gate's relative imports of its sibling helpers (scripts/ci/*.mjs —
  //   the sales-path guard ⑥) are pointed at the real files. Only the import specifiers change; the code under
  //   mutation is the gate's own.
  const src = readFileSync(GATE, "utf8").replace(/from "\.\.\/ci\//g, `from "${resolve("scripts/ci")}/`);
  const dir = mkdtempSync(join(tmpdir(), "gate-mutation-"));
  const problems: string[] = [];

  try {
    // ★Baseline first. If the unmutated gate does not already give the safe answer, every comparison
    // below is meaningless — we would be measuring a gate that is already wrong.
    const good = await import(pathToFileURL(GATE).href);
    for (const m of MUTATIONS) {
      const got = m.observe(good);
      if (got !== m.expectGood) {
        problems.push(`★BASELINE WRONG — ${m.name}: the real gate gives ${got}, expected ${m.expectGood}`);
      }
    }
    if (problems.length > 0) {
      for (const p of problems) console.error(p);
      console.error("\n★以降の比較は無意味（土台が既に想定と違う）。ここで止める。");
      process.exitCode = 2;
      return;
    }
    console.log(`✓ baseline: ${MUTATIONS.length} 件すべてで、実物の gate が安全側の答えを返している。\n`);

    for (const [i, m] of MUTATIONS.entries()) {
      // ★Count, don't test membership. `String.replace(string, …)` substitutes only the FIRST match,
      // so an anchor occurring twice mutates one site and leaves the other intact — the observable may
      // not flip, and this harness would then print "この性質は固定されていない", ★accusing the test
      // suite of a fault that is really in this file. A false accusation sends the reader to the wrong
      // place, which is worse than a missing check.
      // ★This is the SAME SHAPE as the bug this PR closes: `new Map()` silently keeps the LAST of
      // duplicate keys; `src.replace` silently takes the FIRST of duplicate anchors. Both resolve an
      // ambiguity by picking one and saying nothing. ★product課 found it here, in the tool written to
      // close it there. Measured 2026-09-04: all 6 anchors occur exactly once, so this is latent.
      const hits = src.split(m.find).length - 1;
      if (hits !== 1) {
        problems.push(
          hits === 0
            ? `${m.name}: ★ANCHOR MISSING — コードが変わって変異を当てられない（この検査は無効）`
            : `${m.name}: ★ANCHOR AMBIGUOUS（${hits}箇所）— 変異が1箇所にしか当たらず、判定が信用できない`
        );
        console.error(`✗ ${m.name}: anchor ${hits === 0 ? "not found" : `ambiguous (${hits} occurrences)`}`);
        continue;
      }
      const file = join(dir, `gate-${i}-${m.name}.ts`);
      writeFileSync(file, src.replace(m.find, m.replace));
      const mutated = await import(pathToFileURL(file).href);
      const got = m.observe(mutated);
      if (got === m.expectGood) {
        problems.push(
          `${m.name}: ★変異を当てても観測値が ${got} のまま ＝ ★この性質は固定されていない\n     性質: ${m.property}`
        );
        console.error(`✗ ${m.name}: ${m.expectGood} → ${got} (変わらず)`);
      } else {
        console.log(`✓ ${m.name}: ${m.expectGood} → ${got}  ★固定されている`);
        console.log(`    性質: ${m.property}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  console.log("");
  if (problems.length > 0) {
    console.error(`★FAIL: ${problems.length}/${MUTATIONS.length} 件の性質が固定されていない。`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("★これは「gate が壊れている」ではなく「★テストが主張どおりに効いていない」。");
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${MUTATIONS.length}/${MUTATIONS.length}: すべての変異が観測値を反転させた ＝ ★assertion は実際に効いている。`);
  process.exitCode = 0;
}

// ★A crash must not borrow the code that means "an assertion is not pinning what it claims". Node
// exits 1 on an unhandled rejection, which is exactly this harness's "not pinned" verdict — so a typo
// in here would read as a finding about the test suite. Not a safety hole (execFileSync throws on any
// non-zero, so the unit test goes red either way) but a diagnosis cost, and this whole file exists to
// make failures point at the right place. 64 = EX_USAGE, distinct from every verdict above.
main().catch((e) => {
  console.error("★CRASH: このハーネス自身が落ちた（テストの判定ではない）");
  console.error(e);
  process.exit(64);
});
