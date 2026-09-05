/**
 * The merge gate's decision logic.
 *
 * ★Why a test on top of the script's own self-RED: the self-RED protects the RUN (it refuses to judge
 * a real PR with a broken classifier), but it lives inside the same file it checks — edit both and it
 * stays green. This file is the outside witness, and it runs in CI where nobody has to remember it.
 *
 * ★The case that matters is `void` vs `not_ready`. Collapsing them is the tempting simplification and
 * it is wrong in a specific way: "still running", "absent" and "skipped" mean the gate could not
 * tell, while "failed" means it did tell. A caller that treats them alike either blocks forever on a
 * transient or — much worse — learns to read a non-zero exit as noise.
 *
 * ★This file also covers `actionFor`, the verdict→action mapping. It used to be inline in `main()`,
 * which meant the half of the gate that PRESSES MERGE was covered by nothing: an edit could make a
 * void verdict merge anyway and every assertion here would still pass.
 */
import { describe, it, expect } from "vitest";
import { classify, actionFor, fromRollup, type CheckRun } from "../../scripts/verify/pr-merge-gate";

const ok = (name: string): CheckRun => ({ name, status: "completed", conclusion: "success" });
const done = (name: string, conclusion: string | null): CheckRun => ({
  name,
  status: "completed",
  conclusion,
});

describe("PR merge gate — classify", () => {
  it("accepts a fully green head", () => {
    expect(classify([ok("Validate"), ok("Test"), ok("Build")]).kind).toBe("ready");
  });

  it("★accepts `Notify main red` reporting skipped — that is its correct output on a healthy main", () => {
    const runs = [ok("Validate"), ok("Test"), ok("Build"), done("Notify main red", "skipped")];
    expect(classify(runs).kind).toBe("ready");
  });

  it("refuses while a required check is still running", () => {
    const runs = [{ name: "Validate", status: "in_progress", conclusion: null }, ok("Test"), ok("Build")];
    const v = classify(runs);
    expect(v.kind).toBe("void"); // ★void, not not_ready — the gate could not tell yet
    expect(v.kind === "void" && v.reason).toContain("Validate");
  });

  it("★treats a missing required check as void, never as pass", () => {
    const v = classify([ok("Validate"), ok("Build")]);
    expect(v.kind).toBe("void");
    expect(v.kind === "void" && v.reason).toContain("Test");
  });

  it("reports a real failure as not_ready, distinct from void", () => {
    const v = classify([done("Validate", "failure"), ok("Test"), ok("Build")]);
    expect(v.kind).toBe("not_ready");
    expect(v.kind === "not_ready" && v.reason).toContain("Validate=failure");
  });

  it("★a non-required check failing still blocks — required-ness widens what must pass, it does not narrow it", () => {
    const runs = [ok("Validate"), ok("Test"), ok("Build"), done("GitGuardian Security Checks", "failure")];
    expect(classify(runs).kind).toBe("not_ready");
  });

  // ─── the shape that actually happened ───────────────────────────────────────────────────────────
  it("★the #969 shape: Validate failed and Test/Build skipped behind `needs:` — names the failure, not the skips", () => {
    // Measured on PR #969 head e79ea37 (merged 23:51:03Z, Validate completed/failure at 23:57:09).
    // `Test`/`Build` declare `needs: validate`, so a failing Validate makes both report skipped. The
    // useful sentence is "Validate failed" — reporting three unclear things buries the one fact.
    const v = classify([done("Validate", "failure"), done("Test", "skipped"), done("Build", "skipped")]);
    expect(v.kind).toBe("not_ready");
    expect(v.kind === "not_ready" && v.reason).toContain("Validate=failure");
    expect(v.kind === "not_ready" && v.reason).not.toContain("Test=skipped");
  });

  it("★a REQUIRED check reporting `skipped` is VOID — it did not run, so nothing was measured", () => {
    // `skipped` on a required name carries the same information as an absent one: the suite did not
    // execute. It must never read as pass, and calling it a *failure* is what makes a gate look like
    // it cries wolf — which is the pressure that gets gates loosened.
    const v = classify([ok("Validate"), done("Test", "skipped"), ok("Build")]);
    expect(v.kind).toBe("void");
    expect(v.kind === "void" && v.reason).toContain("Test");
  });

  it("★a NON-required check reporting `skipped` is not excused unless it is named", () => {
    // ★This is the assertion that pins SKIPPABLE against the unsafe widening. "Excuse skipped when the
    // check is not REQUIRED" passes every other test in this file, and reads a security scanner that
    // never ran as green. The out-of-band runs that motivated that idea are excluded by the
    // POPULATION (statusCheckRollup), not by loosening the predicate.
    const runs = [ok("Validate"), ok("Test"), ok("Build"), done("GitGuardian Security Checks", "skipped")];
    expect(classify(runs).kind).not.toBe("ready");
  });

  it("★`completed` with a null conclusion is void — this used to classify as ready and merge", () => {
    expect(classify([done("Validate", null), ok("Test"), ok("Build")]).kind).toBe("void");
    // A missing key must land in the same branch as an explicit null.
    const noKey = [{ name: "Validate", status: "completed" } as CheckRun, ok("Test"), ok("Build")];
    expect(classify(noKey).kind).toBe("void");
  });

  it("★all three spellings of `no conclusion` collapse to void — null, absent, and GraphQL's empty string", () => {
    // Measured: GraphQL returns "" for an unfinished run while the REST check-runs API returns null.
    // Comparing the raw values made every in-flight PR report a false instrument disagreement.
    for (const c of [null, undefined, ""]) {
      const runs = [{ name: "Validate", status: "completed", conclusion: c } as CheckRun, ok("Test"), ok("Build")];
      expect(classify(runs).kind).toBe("void");
    }
    expect(fromRollup({ __typename: "CheckRun", name: "Validate", status: "IN_PROGRESS", conclusion: "" })).toEqual({
      name: "Validate",
      status: "in_progress",
      conclusion: null, // ★not "" — otherwise the cross-check compares null against "" and cries wolf
    });
  });

  it("★cancelled / timed_out / stale are void, not not_ready — the job never delivered an answer", () => {
    for (const c of ["cancelled", "timed_out", "stale", "neutral"]) {
      expect(classify([ok("Validate"), done("Test", c), ok("Build")]).kind).toBe("void");
    }
  });

  it("empty input is void, not ready (a call that returned nothing measured nothing)", () => {
    expect(classify([]).kind).toBe("void");
  });
});

describe("PR merge gate — actionFor (the half that presses the button)", () => {
  it("★void never merges, whatever the caller asked for", () => {
    expect(actionFor({ kind: "void", reason: "x" }, true)).toEqual({ exit: 2, merge: false });
  });

  it("★not_ready never merges, whatever the caller asked for", () => {
    expect(actionFor({ kind: "not_ready", reason: "x" }, true)).toEqual({ exit: 1, merge: false });
  });

  it("ready merges only when --merge was passed", () => {
    expect(actionFor({ kind: "ready" }, true)).toEqual({ exit: 0, merge: true });
    expect(actionFor({ kind: "ready" }, false)).toEqual({ exit: 0, merge: false });
  });
});

describe("PR merge gate — fromRollup (the population)", () => {
  it("normalises a CheckRun's SCREAMING enum values to the lower-case the classifier expects", () => {
    const r = fromRollup({ __typename: "CheckRun", name: "Validate", status: "COMPLETED", conclusion: "SUCCESS" });
    expect(r).toEqual({ name: "Validate", status: "completed", conclusion: "success" });
  });

  it("★a StatusContext becomes a CheckRun — this is how `Vercel` becomes visible at all", () => {
    // Measured: `Vercel` is posted to the legacy commit-statuses API and appears in the check-runs
    // API on NO head. Reading only check-runs, the old gate would have said "ready" with Vercel red.
    expect(fromRollup({ __typename: "StatusContext", context: "Vercel", state: "SUCCESS" })).toEqual({
      name: "Vercel",
      status: "completed",
      conclusion: "success",
    });
  });

  it("★a pending StatusContext lands in the still-running branch, not in a conclusion", () => {
    const r = fromRollup({ __typename: "StatusContext", context: "Vercel", state: "PENDING" });
    expect(r.status).toBe("in_progress");
    expect(classify([ok("Validate"), ok("Test"), ok("Build"), r]).kind).toBe("void");
  });

  it("★a StatusContext ERROR is a failure, not an unknown conclusion", () => {
    const r = fromRollup({ __typename: "StatusContext", context: "Vercel", state: "ERROR" });
    expect(r.conclusion).toBe("failure");
    expect(classify([ok("Validate"), ok("Test"), ok("Build"), r]).kind).toBe("not_ready");
  });
});
