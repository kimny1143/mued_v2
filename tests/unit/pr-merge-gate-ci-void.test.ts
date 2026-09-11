/**
 * Unit — which workflow edits can actually move a REQUIRED check name.
 *
 * ## What this replaces
 *
 * The gate used to VOID on ANY file under `.github/workflows/`. ★Correct, and too wide: measured on
 * PR #1004, which added a step to `plugin-funnel-collector.yml` while every REQUIRED name lives in
 * `test.yml`, and whose diff moved ★zero `name:` lines. A human re-derived exactly that and merged by
 * hand. ★A gate that refuses work it could have judged trains people to merge around it.
 *
 * ## Why the population is not taken from the server
 *
 * conductor proposed deriving REQUIRED from branch protection. ★Measured 2026-09-11: ruleset
 * 14319569 "main-protection" has a `pull_request` rule and ★zero required_status_checks contexts.
 * ★There is no server list — the hand-written REQUIRED exists BECAUSE nothing is enforced
 * server-side. So the definer set is reverse-looked-up from the workflow files each run.
 *
 * ★These cases are synthetic on purpose: the whole point is to exercise the branch that fires on a
 * day nobody is watching, not to re-describe today's repo.
 */
import { describe, it, expect } from "vitest";
import { ciVoidReason, declaredNames, type WorkflowChange } from "@/scripts/verify/pr-merge-gate";

const REQUIRED = ["Validate", "Test", "Build"] as const;
/** The healthy world: every REQUIRED name is defined by test.yml. */
const DEFINERS = new Map<string, string[]>([
  ["Validate", [".github/workflows/test.yml"]],
  ["Test", [".github/workflows/test.yml"]],
  ["Build", [".github/workflows/test.yml"]],
]);
const TEST_YML = "jobs:\n  validate:\n    name: Validate\n  test:\n    name: Test\n  build:\n    name: Build\n";

const change = (p: Partial<WorkflowChange> & { path: string }): WorkflowChange => ({
  changedLines: [],
  ...p,
});

describe("declaredNames", () => {
  it("reads job and step names, quoted or not", () => {
    const n = declaredNames('jobs:\n  a:\n    name: Build\n    steps:\n      - name: "Test"\n');
    expect(n.has("Build")).toBe(true);
    expect(n.has("Test")).toBe(true);
  });
});

describe("ciVoidReason — the narrowed ⑤", () => {
  it("★lets through a workflow edit that cannot touch a REQUIRED name (the #1004 shape)", () => {
    expect(
      ciVoidReason(
        [change({ path: ".github/workflows/plugin-funnel-collector.yml", baseSource: "jobs:\n  x:\n    name: Collect\n", changedLines: ["          npx tsx scripts/emit.ts a b"] })],
        REQUIRED,
        DEFINERS,
      ),
    ).toBeNull();
  });

  it("★★VOIDs when a REQUIRED-defining file has a name: line moved", () => {
    const r = ciVoidReason(
      [change({ path: ".github/workflows/test.yml", baseSource: TEST_YML, changedLines: ["    name: Verify"] })],
      REQUIRED,
      DEFINERS,
    );
    expect(r).toContain("test.yml");
  });

  it("★a comment-only edit to the REQUIRED-defining file is NOT void — stage ① alone would over-fire", () => {
    expect(
      ciVoidReason(
        [change({ path: ".github/workflows/test.yml", baseSource: TEST_YML, changedLines: ["# a clarifying comment"] })],
        REQUIRED,
        DEFINERS,
      ),
    ).toBeNull();
  });

  it("★★VOIDs when a BRAND-NEW workflow declares a REQUIRED name — stage ② alone catches what ① cannot", () => {
    // ★No baseSource: the file does not exist on base, so it "defines" nothing there. The old
    //   any-workflow rule caught this by accident; a naive narrowing would lose it.
    const r = ciVoidReason(
      [change({ path: ".github/workflows/sneaky.yml", changedLines: ["jobs:", "  x:", "    name: Test"] })],
      REQUIRED,
      DEFINERS,
    );
    expect(r).toContain("sneaky.yml");
  });

  it("★a new workflow that declares only NON-required names is allowed", () => {
    expect(
      ciVoidReason(
        [change({ path: ".github/workflows/new.yml", changedLines: ["jobs:", "  x:", "    name: Lint docs"] })],
        REQUIRED,
        DEFINERS,
      ),
    ).toBeNull();
  });

  it("★★VOIDs when a REQUIRED name is defined by NO workflow — zero hits is a failed measurement", () => {
    // ★The reverse lookup returning nothing does not mean "nothing to worry about"; it means the
    //   lookup told us nothing — the name may have been renamed out from under the gate.
    const orphaned = new Map<string, string[]>([...DEFINERS, ["Build", []]]);
    const r = ciVoidReason([], REQUIRED, orphaned);
    expect(r).toContain("Build");
    expect(r).toContain("逆引き");
  });

  it("★a PR touching no workflow at all is not void", () => {
    expect(ciVoidReason([], REQUIRED, DEFINERS)).toBeNull();
  });

  it("★self-RED: the healthy inputs above really are healthy", () => {
    // ★Without this, every `toBeNull()` would also pass against a function that always returns null.
    expect(ciVoidReason([change({ path: ".github/workflows/test.yml", baseSource: TEST_YML, changedLines: ["    name: Test"] })], REQUIRED, DEFINERS)).not.toBeNull();
  });
});
