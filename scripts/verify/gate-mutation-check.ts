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
];

async function main(): Promise<void> {
  const src = readFileSync(GATE, "utf8");
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
      if (!src.includes(m.find)) {
        // ★An anchor that no longer matches is a silent pass otherwise: the mutation is never applied,
        // the copy behaves like the original, and "nothing flipped" would look like a failing pin.
        problems.push(`${m.name}: ★ANCHOR MISSING — コードが変わって変異を当てられない（この検査は無効）`);
        console.error(`✗ ${m.name}: anchor not found`);
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

main();
