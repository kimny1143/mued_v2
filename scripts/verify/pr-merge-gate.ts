/**
 * PR merge gate — decide whether a PR is safe to merge, and (with --merge) press the button HERE.
 *
 * ★WHY THIS EXISTS. On 2026-09-04 this peer merged PR #969 with its CI not green. The mechanism was
 * not carelessness about the rule — the rule was known and had just been written down. It was the
 * SHAPE of the command:
 *
 *     for i in 1..6; do <poll CI>; done      # bounded wait, exits on timeout
 *     gh pr merge 969 --squash               # ★runs regardless of what the loop saw
 *
 * The loop's outcome never gated the merge. CLAUDE.md already carries this class ("状態を変える操作を
 * `&&` で繋いだら、途中の失敗がどこで止まるかを1回 声に出す") — this was its loop variant.
 *
 * ★THE FIRST VERSION OF THIS COMMENT WAS WRONG, AND THE ERROR FLATTERED US. It said the check was
 * "still in_progress" and that "the damage was zero — docs-only PR, main stayed green". Measured
 * afterwards (2026-09-04):
 *     PR #969  merged_at 2026-09-03T23:51:03Z
 *              Validate  completed/★failure  at 23:57:09   ← six minutes AFTER the merge
 *              Test/Build  completed/skipped              ← `needs: validate`, so they never ran
 *     main     scheduled CI ★failure on 09-01, 09-02, 09-03 (last green 08-31)
 *              open issue #961 "CI: main is red (scheduled run)" since 2026-09-01
 * ∴ the merge did not race a pending check — it landed on a head whose required check FAILED, into a
 * main that was ALREADY RED and had been for two days. ★An incident report written from memory
 * rounded toward "no harm". The gate's authority rests on this paragraph, so it is measured, not
 * recalled — and re-measurable: every number above is one `gh` call.
 *
 * ★WRITING THE RULE DOWN IS NOT THE FIX ([[feedback-make-it-show-up-not-remember-it]]): the
 * corrections that landed were the ones that showed up in output or were stepped on, never the ones
 * re-read. So the fix is structural — ★the gate itself presses merge, so the second command does not
 * exist. There is then no exit code to drop, and no way to write a wait-loop with a merge behind it.
 *
 * ★WHAT IT KNOWS THAT A GENERIC CHECK DOES NOT (every claim measured in this repo, 2026-09-04):
 *
 *   ①★THE POPULATION IS THE HARD PART, NOT THE PREDICATE. Three instruments answer "what are this
 *     PR's checks?" with three different sets. On PR #968 head 84052ac5:
 *         statusCheckRollup   7   ← PR-scoped; ★union of CheckRun AND StatusContext
 *         check-runs API      8   ← everything on the SHA, ★whatever put it there
 *         statuses API        1   ← `Vercel`, ★invisible to check-runs entirely
 *     The two extra in check-runs came from `run=33818705787 event=workflow_dispatch` — a collector
 *     run this peer dispatched by hand to verify that same PR. ★Our own verification polluted our own
 *     gate's population. The rollup excludes it because it keeps only the PR's own event.
 *     ∴ ★the population is the rollup. Reading check-runs directly produced BOTH a false positive
 *     (refusing a green PR over an unrelated `skipped`) and, worse, a ★false negative: `Vercel` lives
 *     in the statuses API, so the old gate would have said "ready" with Vercel red.
 *
 *   ②★FRESHNESS IS A DIFFERENT AXIS FROM POPULATION, and the older rule was right about it:
 *     `gh pr checks` can stay cached at pending after a close/reopen resync
 *     ([[gotcha-github-pr-head-stuck]], PR #731). ★Both instruments are correct about different
 *     things. So we take the population from the rollup and cross-check state against the check-runs
 *     API — ★on the names they share, since they legitimately differ elsewhere. Disagreement is not a
 *     tie to break; it is the definition of "cannot tell" → void.
 *
 *   ③★ABSENCE MUST NOT READ AS SUCCESS. A required check that has not appeared is indistinguishable
 *     from one that will never appear. Void, so a human looks. Never pass.
 *
 *   ④★"NO VERDICT" IS NOT "PASS", AND IT IS NOT "FAIL" EITHER. `skipped`, `neutral`, `cancelled`,
 *     `timed_out`, `stale`, and completed-with-null-conclusion all mean the job did not deliver an
 *     answer. Reporting them as failures is how the gate earns a reputation for crying wolf — which
 *     is precisely the pressure that gets a gate loosened. They are void.
 *     ★This is the repo's ROUTINE non-green shape, not an edge case: `Test`/`Build` declare
 *     `needs: validate`, so a failing Validate makes both report `completed/skipped` (measured on
 *     #969's head, and on all three red scheduled runs of main).
 *
 *   ⑤★A PR THAT EDITS .github/workflows/ CAN RENAME THE CHECKS THIS GATE LOOKS FOR. REQUIRED is a
 *     list of display names produced by files living in the PR's own head — so on such a PR the gate
 *     is measuring three strings, not three executions. It refuses to self-certify: void.
 *
 * ★SELF-RED. A gate that only ever says "ready" is indistinguishable from one whose matching is
 * broken — both are silent and green. Before touching the network this script runs its classifier
 * over synthetic sets and asserts it REFUSES each unsafe one. If any verdict is wrong it exits 2 and
 * refuses to judge a real PR with a classifier it just proved broken.
 *
 * Exit codes: 0 = ready (and merged, if --merge)
 *             1 = ★not ready — a check DECIDED against us (it told us)
 *             2 = ★the measurement is void — we could not tell. ★2 is NOT "no problem found".
 *             3 = ★the merge landed but something after it failed (the PR IS merged).
 *
 * Usage:
 *   npm run verify:pr-gate -- 968            # report only
 *   npm run verify:pr-gate -- 968 --merge    # merge only if the verdict is ready
 */
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Checks that must be PRESENT and successful. Absence of any of these is void, never pass. */
const REQUIRED = ["Validate", "Test", "Build"] as const;

/**
 * The only check allowed to report `skipped` and still count as green. `Notify main red` fires only
 * when main is red, so on a healthy main `skipped` is its correct output — see
 * .github/workflows/test.yml.
 *
 * ★This is an allowlist of ONE on purpose, and widening it is the standing temptation. The unsafe
 * generalisation is "excuse `skipped` on anything not REQUIRED" — that reads a skipped
 * `GitGuardian Security Checks` as green, i.e. it converts a detectable error into an undetectable
 * one. The out-of-band runs that motivated that idea are excluded by the POPULATION now (see ① in
 * the header), which is the right layer. The outside witness pins this.
 */
const SKIPPABLE = new Set(["Notify main red"]);

/** Conclusions that decided against us. The gate can say "it told you". */
const DECIDED_BAD = new Set(["failure", "action_required", "startup_failure"]);

/** Conclusions that delivered no answer at all. Neither pass nor fail — void. */
const NO_VERDICT = new Set(["skipped", "neutral", "cancelled", "timed_out", "stale"]);

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
}

export type Verdict =
  | { kind: "ready" }
  | { kind: "not_ready"; reason: string }
  | { kind: "void"; reason: string; next?: string };

/**
 * Pure decision: given this PR's checks, is it safe to merge?
 * Kept free of I/O so both the self-RED and the outside witness can exercise it without a network.
 */
export function classify(runs: CheckRun[]): Verdict {
  const excused = (r: CheckRun) => r.conclusion === "skipped" && SKIPPABLE.has(r.name);
  // ★All three spellings of "no answer" collapse here: null, undefined (absent key), and "" (GraphQL).
  const noAnswer = (c: string | null | undefined) => c == null || c === "" || NO_VERDICT.has(c);

  // ★Decided failures first: when something genuinely failed, that is the most actionable truth even
  // if other checks are also void. (#969's head: Validate=failure with Test/Build skipped behind it —
  // the useful sentence is "Validate failed", not "three things are unclear".)
  const failed = runs.filter(
    (r) => r.status === "completed" && r.conclusion !== null && DECIDED_BAD.has(r.conclusion)
  );
  if (failed.length > 0) {
    return {
      kind: "not_ready",
      reason: `failed: ${failed.map((r) => `${r.name}=${r.conclusion}`).join(", ")}`,
    };
  }

  const missing = REQUIRED.filter((name) => !runs.some((r) => r.name === name));
  if (missing.length > 0) {
    return {
      kind: "void",
      reason: `required check absent: ${missing.join(", ")}`,
      // ★"wait and re-run" is wrong advice for this sub-case: if the PR conflicts, the pull_request
      // workflows never run at all, so waiting is infinite. Caller checks mergeStateStatus first.
      next: "この PR で当該 workflow が発火しているか確認する（衝突していると pull_request の workflow は作られない）",
    };
  }

  // ★Completed but no answer — including `conclusion: null`, which the previous version let through
  // to "ready". `== null` so a missing key lands here too, not just an explicit null.
  const undecided = runs.filter((r) => r.status === "completed" && !excused(r) && noAnswer(r.conclusion));
  if (undecided.length > 0) {
    return {
      kind: "void",
      reason: `no verdict: ${undecided.map((r) => `${r.name}=${r.conclusion ?? "null"}`).join(", ")}`,
      next: "その job が実際に走ったかを確認する（`needs:` の上流が落ちると skipped になる）",
    };
  }

  const running = runs.filter((r) => r.status !== "completed");
  if (running.length > 0) {
    return {
      kind: "void",
      reason: `still running: ${running.map((r) => `${r.name}=${r.status}`).join(", ")}`,
      next: "時間を置いて再実行する",
    };
  }

  return { kind: "ready" };
}

/**
 * The verdict → action mapping, exported so the outside witness can reach it.
 * ★main() used to hold this inline, which meant the half of the gate that PRESSES MERGE was covered
 * by nothing: you could rebuild the #969 shape inside the gate itself with every assertion green.
 */
/**
 * Names appearing more than once in a check-run list.
 *
 * ★Exported because it gates a merge, and this file has already learned once that logic living
 * inside `main()` is logic no test can reach. Keying a Map by name silently keeps the LAST entry, so
 * without this the freshness cross-check would compare the rollup's `Build` against some other
 * event's `Build` and print "✓ 一致" whenever their states happened to coincide — a wrong comparison
 * reported as a success, which is the cross-check's purpose exactly inverted. (product課, #971)
 */
export function duplicateNames(runs: CheckRun[]): string[] {
  return [...new Set(runs.map((r) => r.name).filter((n, i, a) => a.indexOf(n) !== i))];
}

export function actionFor(v: Verdict, doMerge: boolean): { exit: 0 | 1 | 2; merge: boolean } {
  if (v.kind === "void") return { exit: 2, merge: false };
  if (v.kind === "not_ready") return { exit: 1, merge: false };
  return { exit: 0, merge: doMerge };
}

/**
 * Normalise a `statusCheckRollup` entry (CheckRun | StatusContext) into one shape.
 *
 * ★"no conclusion" has THREE spellings and they must all collapse to one. The check-runs API sends
 * `null`, an absent key sends `undefined`, and ★GraphQL sends the empty string for a run that has not
 * finished. Measured: the freshness cross-check reported `Validate: rollup=in_progress/
 * check-runs=in_progress/-` and called it a disagreement — the two instruments agreed perfectly and
 * only spelled "no answer" differently. ★A false VOID is the safe direction, but it is still wrong,
 * and it is exactly what teaches an operator to stop reading VOID.
 */
export function fromRollup(e: Record<string, unknown>): CheckRun {
  const lower = (v: unknown) => (typeof v === "string" && v !== "" ? v.toLowerCase() : null);
  if (e.__typename === "StatusContext") {
    // ★Commit statuses (this repo: `Vercel`) have no `status`, only a state. PENDING must land in the
    // "still running" branch, not be mistaken for a conclusion.
    const state = lower(e.state);
    return {
      name: String(e.context ?? "?"),
      status: state === "pending" ? "in_progress" : "completed",
      conclusion: state === "pending" ? null : state === "error" ? "failure" : state,
    };
  }
  return {
    name: String(e.name ?? "?"),
    status: lower(e.status) ?? "unknown",
    conclusion: lower(e.conclusion),
  };
}

/** The synthetic sets the classifier must get right before it is trusted with a real PR. */
const SELF_RED: Array<{ label: string; runs: CheckRun[]; expect: Verdict["kind"] }> = [
  {
    label: "a required check still in_progress must NOT be ready",
    runs: [
      { name: "Validate", status: "in_progress", conclusion: null },
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
    ],
    expect: "void",
  },
  {
    label: "a failed required check must NOT be ready",
    runs: [
      { name: "Validate", status: "completed", conclusion: "failure" },
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
    ],
    expect: "not_ready",
  },
  {
    label: "a missing required check must NOT read as pass",
    runs: [
      { name: "Validate", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
    ],
    expect: "void",
  },
  {
    label: "★the #969 shape: Validate failed, Test/Build skipped behind `needs:` — not_ready, naming Validate",
    runs: [
      { name: "Validate", status: "completed", conclusion: "failure" },
      { name: "Test", status: "completed", conclusion: "skipped" },
      { name: "Build", status: "completed", conclusion: "skipped" },
    ],
    expect: "not_ready",
  },
  {
    label: "★a REQUIRED check that was skipped did not run — void, not pass",
    runs: [
      { name: "Validate", status: "completed", conclusion: "success" },
      { name: "Test", status: "completed", conclusion: "skipped" },
      { name: "Build", status: "completed", conclusion: "success" },
    ],
    expect: "void",
  },
  {
    label: "★completed with conclusion null must NOT be ready (this used to merge)",
    runs: [
      { name: "Validate", status: "completed", conclusion: null },
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
    ],
    expect: "void",
  },
  {
    label: "★a NON-required check reporting skipped is not excused — the scanner did not run",
    runs: [
      { name: "Validate", status: "completed", conclusion: "success" },
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
      { name: "GitGuardian Security Checks", status: "completed", conclusion: "skipped" },
    ],
    expect: "void",
  },
  {
    label: "all green + Notify main red skipped IS ready (else every healthy PR is blocked)",
    runs: [
      { name: "Validate", status: "completed", conclusion: "success" },
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "success" },
      { name: "Notify main red", status: "completed", conclusion: "skipped" },
      { name: "Vercel", status: "completed", conclusion: "success" },
    ],
    expect: "ready",
  },
];

function runSelfRed(): string[] {
  const problems: string[] = [];
  for (const c of SELF_RED) {
    const got = classify(c.runs).kind;
    if (got !== c.expect) problems.push(`${c.label} — expected ${c.expect}, got ${got}`);
  }
  // ★The action mapping is part of the instrument: a void verdict that still merges would pass every
  // classifier assertion above.
  if (actionFor({ kind: "void", reason: "x" }, true).merge) problems.push("void must never merge");
  if (actionFor({ kind: "not_ready", reason: "x" }, true).merge) problems.push("not_ready must never merge");
  return problems;
}

class GhError extends Error {
  constructor(message: string, readonly stderr: string) {
    super(message);
  }
}

function gh(args: string[]): string {
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    // ★An uncaught throw here exits node with 1 — this gate's code for "a check decided against us".
    // A crash is by definition a void measurement, so it must never borrow that meaning.
    const err = e as { stderr?: Buffer | string; message?: string };
    throw new GhError(err.message ?? "gh failed", String(err.stderr ?? ""));
  }
}

interface PrMeta {
  headRefOid: string;
  headRefName: string;
  state: string;
  title: string;
  mergeable: string;
  mergeStateStatus: string;
  files: Array<{ path: string; additions: number; deletions: number }>;
  statusCheckRollup: Array<Record<string, unknown>>;
}

function main(): void {
  const argv = process.argv.slice(2);
  const doMerge = argv.includes("--merge");
  // ★Opt-in only: the repo says delete_branch_on_merge=false, so the gate must not decide otherwise.
  const deleteBranch = argv.includes("--delete-branch");
  const numbers = argv.filter((a) => /^\d+$/.test(a));
  const unknown = argv.filter((a) => !["--merge", "--delete-branch"].includes(a) && !/^\d+$/.test(a));

  if (numbers.length !== 1 || unknown.length > 0) {
    console.error("usage: npm run verify:pr-gate -- <pr-number> [--merge] [--delete-branch]");
    if (numbers.length > 1) console.error(`  ★PR 番号が ${numbers.length} 個 あります: ${numbers.join(", ")}`);
    if (unknown.length > 0) console.error(`  ★解釈できない引数: ${unknown.join(", ")}`);
    process.exitCode = 2;
    return;
  }
  const pr = numbers[0];

  const problems = runSelfRed();
  if (problems.length > 0) {
    console.error("★FAIL(self-RED): the gate's own classifier is wrong — refusing to judge a real PR.");
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 2;
    return;
  }
  console.log(`✓ self-RED: ${SELF_RED.length} synthetic sets classified correctly, and void/not_ready cannot merge.`);

  const meta = JSON.parse(
    gh([
      "pr", "view", pr, "--json",
      "headRefOid,headRefName,state,title,mergeable,mergeStateStatus,files,statusCheckRollup",
    ])
  ) as PrMeta;

  // ★Printed every run on purpose: Tier is decided by what is actually in the diff, not by what the
  // PR was meant to contain. (With --merge no human reads this before the press, so the one part that
  // MUST NOT depend on a reader is enforced below as ⑤.)
  console.log(`\nPR #${pr} — ${meta.title}`);
  console.log(`head ${meta.headRefOid}  state ${meta.state}  mergeable ${meta.mergeable}/${meta.mergeStateStatus}`);
  console.log(`changed files (${meta.files.length}${meta.files.length === 100 ? " ★=100: この API は 100 で切れる。全数ではない" : ""}):`);
  for (const f of meta.files) console.log(`  +${f.additions} -${f.deletions}  ${f.path}`);

  if (meta.state !== "OPEN") {
    console.error(`\n★FAIL: PR is ${meta.state}, not OPEN.`);
    process.exitCode = 1;
    return;
  }

  // ⑤ A PR that edits the workflows cannot be certified against check names those workflows define.
  const touchesCi = meta.files.filter((f) => f.path.startsWith(".github/workflows/"));
  if (touchesCi.length > 0) {
    console.error(`\n★VOID: この PR は .github/workflows/ を変更している（${touchesCi.map((f) => f.path).join(", ")}）。`);
    console.error("  ★REQUIRED の名前は、この PR 自身が定義している。∴ この gate は自分を certify できない。");
    console.error("  → 次の一歩: 変更後の job 名を目で確認し、人が判断して merge する。");
    process.exitCode = 2;
    return;
  }

  // ★Conflicts must be read BEFORE waiting on checks: GitHub runs pull_request workflows on a virtual
  // merge commit, so when it cannot be built the required checks are never created and waiting is
  // infinite ([[gotcha-github-pr-head-stuck]]: 25 empty polls learning this).
  if (meta.mergeable === "CONFLICTING" || meta.mergeStateStatus === "DIRTY") {
    console.error(`\n★VOID: mergeable=${meta.mergeable}/${meta.mergeStateStatus} — 衝突している。`);
    console.error("  ★待っても checks は来ない（衝突していると pull_request の workflow は発火しない）。");
    console.error(`  → 次の一歩: git fetch origin && git rebase origin/main && git push --force-with-lease`);
    process.exitCode = 2;
    return;
  }
  if (meta.mergeStateStatus === "BEHIND") {
    console.error(`\n★VOID: mergeStateStatus=BEHIND — base が進んでいる。`);
    console.error("  ★checks が緑でも、それは古い base の上の緑。合成後の main は測っていない。");
    console.error(`  → 次の一歩: gh pr update-branch ${pr}（または rebase）してから再実行する。`);
    process.exitCode = 2;
    return;
  }

  const rollup = (meta.statusCheckRollup ?? []).map(fromRollup);
  console.log(`\nchecks on ${meta.headRefOid.slice(0, 8)} — 母集団は statusCheckRollup（${rollup.length}件・この PR に紐づくものだけ）:`);
  for (const r of [...rollup].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${r.name}: ${r.status}/${r.conclusion ?? "-"}`);
  }

  // ② Freshness cross-check against the other instrument, on the names they share.
  const repo = (JSON.parse(gh(["repo", "view", "--json", "nameWithOwner"])) as { nameWithOwner: string }).nameWithOwner;
  const api = (
    JSON.parse(gh(["api", `repos/${repo}/commits/${meta.headRefOid}/check-runs`])) as { check_runs: CheckRun[] }
  ).check_runs;
  // ★The population we excluded from the VERDICT is still present in the CROSS-CHECK's input: `api`
  // is the raw check-runs list, which carries runs from other events on the same sha. `new Map()`
  // resolves a duplicate name by silently keeping the last one — so if a second workflow ever has a
  // job called `Build`, this would compare the rollup's `Build` against the OTHER `Build`, and print
  // `✓ 鮮度: … すべてで一致` whenever their states happened to coincide. ★A wrong comparison reported
  // as a success is worse than no comparison: it is the cross-check's whole purpose, inverted.
  // ★Latent, not live: measured 8/8 unique on #968 and 3/3 on #971 (product課, 2026-09-04). Closed
  // here rather than left as a note, because the precondition — two events on one sha — is already
  // real in this repo and is what produced the original false positive.
  const dupes = duplicateNames(api);
  if (dupes.length > 0) {
    console.error(`\n★VOID: check-runs に同名の run が複数ある: ${dupes.join(", ")}`);
    console.error("  ★どの実行が rollup のどれに対応するかを決められない（別 event の run が同じ SHA に載っている）。");
    console.error(`  → 次の一歩: gh api repos/${repo}/commits/${meta.headRefOid}/check-runs で同名の run の event を確認する。`);
    process.exitCode = 2;
    return;
  }
  const byName = new Map(api.map((r) => [r.name, r]));
  // ★Compare normalised values, not raw ones: the two instruments spell "no answer" differently
  // (GraphQL `""` vs REST `null`) and case differently. Comparing raw made every in-flight PR look
  // like a disagreement — a false VOID on both open PRs, measured.
  const norm = (v: string | null | undefined) => (typeof v === "string" && v !== "" ? v.toLowerCase() : null);
  const disagree = rollup.filter((r) => {
    const other = byName.get(r.name);
    return other && (norm(other.status) !== norm(r.status) || norm(other.conclusion) !== norm(r.conclusion));
  });
  if (disagree.length > 0) {
    console.error(`\n★VOID: 2つの計器が同じ check について違うことを言っている。`);
    for (const r of disagree) {
      const o = byName.get(r.name)!;
      console.error(`  ${r.name}: rollup=${r.status}/${r.conclusion ?? "-"}  check-runs=${o.status}/${o.conclusion ?? "-"}`);
    }
    console.error("  ★どちらが正しいかを、この gate は決められない（rollup は close/reopen 後にキャッシュが残ることがある）。");
    console.error("  → 次の一歩: 少し置いて再実行する。消えなければ PR を close→reopen して head を再同期する。");
    process.exitCode = 2;
    return;
  }
  console.log(`✓ 鮮度: rollup と check-runs API が、共通する ${rollup.filter((r) => byName.has(r.name)).length} 件すべてで一致。`);

  const verdict = classify(rollup);
  const action = actionFor(verdict, doMerge);
  console.log("");

  if (verdict.kind === "void") {
    console.error(`★VOID: ${verdict.reason}`);
    console.error("  ★これは「問題なし」ではない — 判定できていない。");
    if (verdict.next) console.error(`  → 次の一歩: ${verdict.next}`);
    process.exitCode = action.exit;
    return;
  }
  if (verdict.kind === "not_ready") {
    console.error(`★FAIL: ${verdict.reason}`);
    console.error(`  → 次の一歩: gh run list --branch <branch> で失敗 job を開き、直してから push する。`);
    process.exitCode = action.exit;
    return;
  }

  console.log("✓ ready: この PR の checks はすべて completed+success（skip は許可された1件のみ）。");
  if (!action.merge) {
    console.log("  (--merge を付けると、★この同じプロセスの中で merge する)");
    process.exitCode = 0;
    return;
  }

  // ★The whole point: the merge happens HERE, past the verdict, in the same process. There is no
  // second command whose exit code can be dropped.
  // ★--match-head-commit binds the merge to the sha we actually measured. Without it the gate reads
  // sha A, spends ~1.2s on further calls, and merges whatever the head is by then — reproducing the
  // very bug it exists to prevent, silently. With it, GitHub refuses server-side.
  // ★Branch deletion is the REPO's decision, not this script's. Measured: this repo has
  // `delete_branch_on_merge=false`, and the gate was passing --delete-branch unconditionally —
  // overriding the setting on every merge.
  //
  // ★That is not cosmetic. Deleting a branch that another open PR uses as its BASE makes GitHub
  // ★auto-close that PR, silently: no error, no notification, and it cannot be reopened once the base
  // is gone. It happened on 2026-09-05 — merging #971 deleted `feat/pr-merge-gate` and closed #974
  // (the PR that fixed a bug in THIS FILE), which had to be re-opened as #980 with its commits
  // rebased by hand. ★Nothing on either side reported it; a reviewer noticed hours later.
  //
  // ★So: default to the repo setting, and when deletion IS requested, refuse it while a dependent PR
  // exists rather than closing someone's work as a side effect.
  const dependents = (
    JSON.parse(gh(["pr", "list", "--state", "open", "--json", "number,baseRefName"])) as Array<{
      number: number;
      baseRefName: string;
    }>
  ).filter((p) => p.baseRefName === meta.headRefName);

  if (deleteBranch && dependents.length > 0) {
    console.error(`\n★VOID: この branch を base にしている open PR が ${dependents.length} 件 在る: ${dependents.map((d) => `#${d.number}`).join(", ")}`);
    console.error("  ★--delete-branch すると GitHub がそれらを★黙って close する（★reopen 不可）。");
    console.error(`  → 次の一歩: --delete-branch を外して merge し、★その後 依存 PR の base を main へ付け替える。`);
    process.exitCode = 2;
    return;
  }

  const mergeArgs = ["pr", "merge", pr, "--squash", "--match-head-commit", meta.headRefOid];
  if (deleteBranch) mergeArgs.splice(3, 0, "--delete-branch");
  console.log(
    `\nmerging (squash${deleteBranch ? ", delete branch" : ", branch kept — repo setting"}), pinned to ${meta.headRefOid.slice(0, 8)}…`
  );
  try {
    console.log(gh(mergeArgs).trim());
  } catch (e) {
    const err = e as GhError;
    // ★やった ≠ 届いた, applied to the gate itself: gh can fail AFTER the merge landed (branch
    // deletion, local checkout). Re-read the truth before naming what happened.
    const after = JSON.parse(gh(["pr", "view", pr, "--json", "state,mergedAt"])) as {
      state: string;
      mergedAt: string | null;
    };
    if (after.state === "MERGED") {
      console.error(`\n★MERGED — ただし merge 後の後始末が失敗した（★PR は merge 済み）。`);
      console.error(err.stderr.trim());
      console.error(`  → 次の一歩: git fetch origin && git checkout main && git pull --ff-only && git branch -D <branch>`);
      process.exitCode = 3;
      return;
    }
    console.error(`\n★VOID: merge は実行されなかった。`);
    console.error(err.stderr.trim());
    if (/Head branch was modified/i.test(err.stderr)) {
      console.error("  ★測った sha と現在の head が違う ＝ 測定中に push が入った（これは gate が正しく効いた形）。");
      console.error("  → 次の一歩: 同じコマンドをもう一度 実行する（新しい head で測り直す）。");
    } else {
      console.error("  → 次の一歩: gh auth status で認証を、gh api rate_limit で残量を確認する。");
    }
    process.exitCode = 2;
    return;
  }

  // ★gh exits 0 when it merges AND when it only enqueues into a merge queue. "✓ merged" printed off
  // an exit code is a claim about our own side; read the downstream fact instead.
  const after = JSON.parse(gh(["pr", "view", pr, "--json", "state,mergedAt"])) as {
    state: string;
    mergedAt: string | null;
  };
  if (after.state !== "MERGED") {
    console.error(`\n★VOID: gh は成功したが、PR は state=${after.state}（まだ MERGED ではない）。`);
    console.error("  ★merge queue に入っただけの可能性がある。");
    console.error(`  → 次の一歩: gh pr view ${pr} で着地を確認する。`);
    process.exitCode = 2;
    return;
  }
  console.log(`✓ merged — state=${after.state} mergedAt=${after.mergedAt}（★gh の終了コードではなく PR の状態で確認）`);
  process.exitCode = 0;
}

// ★Run only when this file IS the entry point. The old form compared `argv[1].endsWith(<filename>)`,
// which fails OPEN: rename the file or reach it through a symlink and main() never runs, so the
// process exits 0 — and 0 is this gate's word for "ready, merged". Resolved-identity comparison
// cannot be disarmed by a rename.
const entry = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (entry && entry === realpathSync(fileURLToPath(import.meta.url))) main();
