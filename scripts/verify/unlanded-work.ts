/**
 * ★Work that was pushed and then never asked to land.
 *
 * ★WHY. On 2026-09-05 this peer committed a status.md update, pushed it, ★reported it as complete —
 * and never ran `gh pr create`. An incoming message landed between the push and the PR, and the
 * branch simply sat there. It surfaced 26 hours later from conductor's staleness alarm, i.e. from
 * OUTSIDE. ★Nothing on this side was watching, because "did I open the PR?" is a step you either
 * remember or don't, and this repo already knows how that ends (→ [[feedback-notify-at-merge-not-after]],
 * [[feedback-retirement-is-fail-silent]]).
 *
 * ★THE FIRST PREDICATE WAS WRONG, AND MEASURING SAVED IT. "Branch is ahead of main and has no OPEN
 * PR" reports ★489 branches here. That is not 489 problems — after a squash merge the branch's
 * original commits stay distinct from main's single squashed commit, so almost every merged branch
 * looks "ahead" forever. ★A check that cries 489 times is a check nobody reads, which is the exact
 * failure mode this file exists to avoid. Measured 2026-09-05:
 *
 *     ahead of main            490
 *       has a MERGED PR        ★474   ← landed; the commits differ only because of squash
 *       has an OPEN PR           1
 *       CLOSED PR only           7
 *       ★★never had ANY PR      ★8   ← the real signal
 *
 * ★So the predicate is "no pull request has EVER existed for this head", not "no open one".
 *
 * Exit: 0 = nothing unlanded · 1 = unlanded work found · 2 = the check could not run (never "clean").
 *
 * ★DIFFERENT DIALECT FROM THE ORG'S (CCO review, 2026-09-10). The shared block-22 convention is
 * 0/2/3 with ★2 = "violation found"; here 2 = ★"could not measure". Docstring and implementation
 * agree inside this file, so nothing is broken today — but ★a caller consuming both reads this
 * file's 2 as "violation" (safe direction), while ★its 1 is absent from the org table and can fall
 * to a default branch (★unsafe direction). ★Translate at the boundary rather than renumbering
 * either side.
 */
import { execFileSync } from "node:child_process";

/**
 * ★Branches that are deliberately never PR'd. Each needs a REASON, because an allowlist without one
 * becomes the place findings go to die — and this list is the only way a real orphan can hide.
 *
 * ★AND EACH TRIAGED ENTRY NEEDS A `tip`. This file already learned that branch NAMES get reused
 * (see the (name, sha) pairing below, product課 #982) — ★the allowlist had the same hole one level
 * up: a name-only entry excuses the name FOREVER, so recreating that branch with real work would be
 * silently waved through by a decision made about different commits. ★An entry with `tip` applies
 * only while the branch still points at the commit that was actually triaged; push to it and it
 * alarms again, as it should.
 *
 * ★The three data branches stay name-only ON PURPOSE: a collector pushes to them daily, so their
 * tip is SUPPOSED to move and pinning it would alarm every morning. ★That is the exception, and it
 * is stated rather than assumed — which is the whole difference between a reason and a waiver.
 */
const INTENTIONALLY_NO_PR: Array<{ branch: string; why: string; tip?: string }> = [
  {
    branch: "data/plugin-funnel-reports",
    why: "orphan data branch — the daily collector pushes report JSON here directly (docs/ops); it carries no app code and is never merged into main",
  },
  { branch: "data-funnel", why: "orphan data branch (predecessor of data/plugin-funnel-reports)" },
  { branch: "data-pf", why: "orphan data branch (predecessor of data/plugin-funnel-reports)" },

  // ★Triaged 2026-09-10 (mued). Every one of these was compared against main FILE BY FILE, not by
  //   commit count: a branch hundreds of commits behind shows most files as "different" simply
  //   because main moved on, so only ABSENT-ON-MAIN paths were treated as unlanded work. The
  //   artifacts that were genuinely missing landed in #987; the two that were NOT landed are named
  //   below with the reason, because "we chose not to" is the part a future reader needs.
  {
    branch: "feat/dial-iteration-correctness",
    tip: "1a5372986618d985798c260cea83ffe7781c3d11",
    why: "triaged 2026-09-10: 11/15 files identical to main; docs/dial/yuu-owed-mastering-working-session.md landed in #987. ★scripts/rescue-dial-yuu-final.ts deliberately NOT landed — its r2-first approach was adopted and then REVERTED in the product (lib/dial/resolve-track-url.ts states why: changing the submitted-URL identity silently breaks fxSettings/stem/ZIP lookups). ★docs/dial-u2-hoo-batch-nudge-draft.md not landed — already shipped at lib/ai/prompts/dial.ts",
  },
  {
    branch: "docs/status-defer-decided",
    tip: "cb8627ac3dbc9825a97a6f7fcd9f4ec7d8b8a58e",
    why: "triaged 2026-09-10: all 9 absent-on-main artifacts (cert-*.ts ×5, cryo-phase-{a,b}.ts, 2 docs) landed in #987. Remainder is status.md, superseded by the current file",
  },
  {
    branch: "feat/user-portal-p3-backfill",
    tip: "a7d204176c04d3e67e90e5d06816a00d78200f63",
    why: "triaged 2026-09-10: lib/plugins/backfill.ts + scripts/backfill-plugin-entitlements.ts + its test landed in #987 (provenance recovery — that code already ran against production on 2026-07-17). Its two sibling scripts from #697 were already on main",
  },
  {
    branch: "feat/marketing-consent-onboarding",
    tip: "3af794c933159d1913cb0de092f9a273c98d53fa",
    why: "triaged 2026-09-10: content already on main — app/api/marketing/consent/route.ts and its test are byte-identical; the rest is an older messages/*.json and status.md",
  },
  {
    branch: "docs/claude-md-block22-guard-overdetection",
    tip: "2b366728fecd5994473cf470905caebbe64fa983",
    why: "triaged 2026-09-10: content already on main — the 過検出 block is in CLAUDE.md (4 occurrences)",
  },
  {
    branch: "docs/status-mued-20260611",
    tip: "a84b0e59e74e4e30c9bb3404e0bec43dea13c2f5",
    why: "triaged 2026-09-10: status.md only, superseded by the current file. Kept rather than deleted — the branch is the only record of that day's status text, and deleting an unmerged branch is not reversible",
  },
  {
    branch: "docs/status-checkout-audit-freeze",
    tip: "020130bbacabf8aaeac512a9ec5e73800b5dc230",
    why: "triaged 2026-09-10: status.md only, superseded (the npm audit freeze it records was closed by #979)",
  },
  {
    branch: "feat/next-phase-investigation",
    tip: "97636f369432bb03580aac0187039ceba3e8e3f0",
    why: "triaged 2026-09-10: status.md only (a 2026-05-28 heartbeat), superseded",
  },
];

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();
}

interface Pr {
  headRefName: string;
  state: string;
  number: number;
  headRefOid: string;
}

/** ★Fetch window. Saturation is treated as "cannot tell", not as "nothing found" — see below. */
const PR_LIMIT = 1000;

function main(): void {
  // ★One call for every PR, not one per branch: this repo has 527 remote branches and 968 PRs, so
  // per-branch queries would be 527 round trips and would rate-limit before finishing.
  let prs: Pr[];
  try {
    prs = JSON.parse(
      sh("gh", ["pr", "list", "--state", "all", "--limit", String(PR_LIMIT), "--json", "headRefName,state,number,headRefOid"])
    );
  } catch (e) {
    console.error("★VOID: could not list PRs — this check did NOT run.");
    console.error(String((e as { stderr?: Buffer }).stderr ?? e));
    console.error("  → 次の一歩: gh auth status で認証を確認する。★これは「未着地なし」ではない。");
    process.exitCode = 2;
    return;
  }

  // ★★Keyed by name AND head sha, not by name alone. Branch names get REUSED — measured 2026-09-08:
  // ★14 names in this repo carry more than one PR. The sequence that hides an orphan is ordinary:
  //   ① PR opens, merges, branch is deleted
  //   ② someone recreates the SAME name later and pushes
  //   ③ no PR is opened
  // ★Name-only lookup then answers "yes, this name had a PR" — from step ①'s PR — and the new work
  // is skipped. ★Not "unlikely": simply invisible when it happens. Pairing with the tip sha means a
  // recreated branch only counts as landed if the PR actually covered THIS commit. (product課, #982.)
  const prHeads = new Map<string, Set<string>>();
  for (const p of prs) {
    if (!prHeads.has(p.headRefName)) prHeads.set(p.headRefName, new Set());
    prHeads.get(p.headRefName)!.add(p.headRefOid);
  }
  const openBy = new Map(prs.filter((p) => p.state === "OPEN").map((p) => [p.headRefName, p.number]));

  const branches = sh("git", ["branch", "-r", "--format=%(refname:short)"])
    .split("\n")
    .filter((b) => b.startsWith("origin/") && !b.endsWith("/HEAD") && b !== "origin/main")
    .map((b) => b.slice("origin/".length));

  // ★Positive control: the instrument must be able to see SOMETHING before its zero means anything.
  if (branches.length === 0 || prs.length === 0) {
    console.error(`★VOID: branches=${branches.length} prs=${prs.length} — nothing to compare.`);
    console.error("  → ★0 件ではなく「測れていない」。fetch 済か、gh が repo を見ているかを確認する。");
    process.exitCode = 2;
    return;
  }

  // ★★A window has TWO ends and the check above guards only one. An empty list means "measured
  // nothing"; a FULL list means "there is more beyond what I can see" — and a branch whose PR sits
  // past the cut looks exactly like a branch that never had one. ★That is this file's own failure
  // mode: it would start reporting landed work as orphaned, i.e. return to crying wolf.
  // ★Measured 2026-09-08: --limit 1000 → 970, --limit 1500 → 970 ∴ true count 970, ★30 short of the
  // window. This repo produced #971–#983 in a single day, so the margin is not comfortable.
  // (product課, #982.)
  if (prs.length >= PR_LIMIT) {
    console.error(`★VOID: PR を ${prs.length} 件 取得 ＝ 上限(${PR_LIMIT})に達している。`);
    console.error("  ★窓の外の PR は見えない ∴ ★『PR が一度も無い』を主張できない（★偽の orphan が出る）。");
    console.error(`  → 次の一歩: PR_LIMIT を上げて再実行する（★現在の真値はおよそ ${prs.length} 件）。`);
    process.exitCode = 2;
    return;
  }

  const allow = new Map(INTENTIONALLY_NO_PR.map((a) => [a.branch, a]));
  const orphans: Array<{ branch: string; commits: number; last: string }> = [];
  const staleAllow: string[] = [];
  let ahead = 0;

  for (const b of branches) {
    const n = Number(sh("git", ["rev-list", "--count", `origin/main..origin/${b}`]) || "0");
    if (n === 0) continue;
    ahead++;
    const tip = sh("git", ["rev-parse", `origin/${b}`]);
    const waiver = allow.get(b);
    if (waiver) {
      // ★A waiver with no `tip` is a standing one (the data branches, whose tip moves by design).
      //   A waiver WITH a `tip` was a decision about specific commits: if the branch has moved on,
      //   the decision no longer covers what is there, so it stops applying and the branch alarms.
      if (!waiver.tip) continue;
      if (waiver.tip === tip) continue;
      staleAllow.push(`${b}: waiver pinned to ${waiver.tip.slice(0, 8)}, branch is now at ${tip.slice(0, 8)}`);
    }
    if (prHeads.get(b)?.has(tip)) continue; // ★a PR covered THIS commit, not merely this name
    orphans.push({ branch: b, commits: n, last: sh("git", ["log", "-1", "--format=%cs", `origin/${b}`]) });
  }

  console.log(`branches=${branches.length}  ahead of main=${ahead}  PRs(all states)=${prs.length}`);
  console.log(`allowlisted (deliberately never PR'd)=${allow.size}`);
  // ★Printed even when empty: an allowlist that is never shown is an allowlist nobody audits.
  for (const [b, a] of allow) {
    console.log(`  · ${b} ${a.tip ? `@${a.tip.slice(0, 8)}` : "(standing — tip moves by design)"} — ${a.why}`);
  }
  // ★A waiver that no longer matches is reported as a finding, not skipped in silence: it means a
  //   branch someone decided about has since been pushed to, and nobody re-decided.
  for (const s of staleAllow) console.error(`  ★waiver no longer applies — ${s}`);
  if (openBy.size > 0) console.log(`open PRs: ${[...openBy.values()].map((n) => `#${n}`).join(", ")}`);

  if (orphans.length === 0) {
    console.log("\n✓ 未着地の作業なし — push したまま PR を作っていない branch は 0 件。");
    process.exitCode = 0;
    return;
  }

  console.error(`\n★${orphans.length} 件: push 済だが ★PR が一度も作られていない`);
  for (const o of orphans.sort((a, b) => b.commits - a.commits)) {
    console.error(`  ★${String(o.commits).padStart(3)} commit  最終 ${o.last}  ${o.branch}`);
  }
  console.error("\n  → 次の一歩: 各 branch について ★gh pr create するか、★不要なら branch を消すか、");
  console.error("     ★意図的に PR を作らないものなら ★このファイルの INTENTIONALLY_NO_PR に★理由つきで足す。");
  console.error("  ★放置は選択肢に入れない —— ★未着地の作業は、作業した本人にしか見えない。");
  process.exitCode = 1;
}

main();
