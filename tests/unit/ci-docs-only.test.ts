/**
 * Unit — the docs-only CI skip (conductor 2026-09-28, after the Actions budget ran out).
 * Two things must hold: the path rule is conservative, and the three REQUIRED jobs still exist and
 * still run (only their steps are skipped), so the merge gate keeps seeing Validate/Test/Build.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs with no type declarations, on purpose (runs on the runner's Node)
import { isDocsOnly, isDocFile } from "../../scripts/ci/docs-only.mjs";

describe("isDocsOnly — conservative path rule", () => {
  it.each([
    [["docs/paid-line/c8.md"]],
    [["status.md"]],
    [["status.md", "docs/status-archive/x.md", "README.md"]],
    [["docs/portal/mock.html"]],
    [["notes.jsonl"]],
  ])("docs-only: %j", (files) => {
    expect(isDocsOnly(files)).toBe(true);
  });

  it.each([
    [["CLAUDE.md"]],                                   // read by claude-md-stack-facts.test.ts
    [["AGENTS.md"]],
    [[".claude/skills/tdd/SKILL.md"]],                 // skill tests + Validate "Skill durability"
    [[".agents/skills/x/SKILL.md"]],
    [["content/learn/intro.md"]],                      // rendered at build time
    [["tests/fixtures/case.md"]],
    [["app/README.md"]],
    [["status.md", "lib/masterchain/license.ts"]],     // ★one code file makes the whole PR code
    [["docs/x.md", ".github/workflows/test.yml"]],
    [["messages/en.json"]],
    [[]],                                              // ★unknown / empty → run everything
    [["", "  "]],
    [["docs/tools/helper.ts"]],                        // ★tsconfig typechecks .ts under docs/ (CCO #1156)
    [["docs/ui/Mock.tsx"]],
    [["docs/data/fixture.json"]],
    // ★A rename out of code: the workflow passes previous_filename too (CCO #1156).
    [["docs/archive/foo.md", "lib/foo.ts"]],
  ])("full pipeline: %j", (files) => {
    expect(isDocsOnly(files)).toBe(false);
  });

  it("★a list at the files-endpoint cap (3000) may be truncated → full pipeline", () => {
    expect(isDocsOnly(Array.from({ length: 2999 }, (_, i) => `docs/${i}.md`))).toBe(true);
    expect(isDocsOnly(Array.from({ length: 3000 }, (_, i) => `docs/${i}.md`))).toBe(false);
  });

  it("decides by path, not by branch name (docs/* branches carried code 8 times in 2026-09)", () => {
    expect(isDocFile("docs/notes/anything.md")).toBe(true);
    expect(isDocFile("lib/docs/helper.md")).toBe(false);
    // ★Under docs/, only document extensions count — a file with no extension is not a document.
    expect(isDocFile("docs/anything")).toBe(false);
  });
});

describe("CI workflow keeps the REQUIRED jobs and guards every heavy step", () => {
  const wf = readFileSync(join(process.cwd(), ".github/workflows/test.yml"), "utf8");
  const block = (job: string) => {
    const start = wf.indexOf(`\n  ${job}:\n`);
    expect(start, `${job} job exists`).toBeGreaterThan(0);
    const next = wf.slice(start + 1).search(/\n  [a-z][a-z-]*:\n/);
    return wf.slice(start, next === -1 ? undefined : start + 1 + next);
  };

  it.each([
    ["validate", "Validate"],
    ["test", "Test"],
    ["build", "Build"],
  ])("%s keeps its gate name, decides docs-only in its own first steps, and every heavy step is conditioned", (job, name) => {
    const b = block(job);
    expect(b).toContain(`    name: ${name}\n`);
    // ★No separate `changes` job (conductor 2026-10-01: a ~10 s job is billed a full minute on every run).
    expect(b).not.toContain("needs.changes");
    expect(b).not.toMatch(/\n    needs: .*changes/);
    // ★No job-level `if:` — a skipped REQUIRED job is void to the merge gate.
    expect(b).not.toMatch(/\n    if: /);
    const lines = b.split("\n");
    const stepStarts = lines.flatMap((l, i) => (/^      - (uses|name|run): /.test(l) ? [i] : []));
    // The first three steps always run: the checkout, node (the detection runs a node script, and the
    // self-hosted runner image has no node of its own), and the detection itself.
    expect(lines[stepStarts[0]]).toMatch(/^      - uses: actions\/checkout@v4$/);
    expect(lines[stepStarts[1]]).toBe("      - uses: actions/setup-node@v4");
    expect(lines[stepStarts[2]]).toBe("      - name: Detect changes");
    expect(lines[stepStarts[2] + 1]).toBe("        id: docs");
    expect(b.match(/uses: actions\/setup-node@v4/g)).toHaveLength(1);
    expect(stepStarts.length).toBeGreaterThan(4);
    for (const i of stepStarts.slice(3)) {
      expect(lines[i + 1], `step "${lines[i].trim()}" has a condition`).toMatch(/^        if: steps\.docs\.outputs\.code (==|!=) 'false'$/);
    }
    // ★Fail-CLOSED: exactly one no-op step runs only on an explicit 'false'; every heavy step runs
    //   unless the output is exactly 'false' — an empty output runs everything (CCO #1156).
    expect(b.match(/if: steps\.docs\.outputs\.code == 'false'/g)).toHaveLength(1);
    expect(b).not.toContain("code == 'true'");
    // The detection treats schedule / workflow_dispatch as full runs and reads EVERY page of the file list
    // (100 per page; a full page means there may be more), with curl + jq — the runner image has no gh.
    expect(b).toContain('if [ "$EVENT" != "pull_request" ]');
    expect(b).toContain("per_page=100&page=$page");
    expect(b).toContain(`[ "$(printf '%s' "$body" | jq 'length')" -lt 100 ] && break`);
    expect(b).toContain(".previous_filename // empty");
    expect(b).toContain("scripts/ci/docs-only.mjs");
    expect(b).not.toMatch(/\bgh (api|pr|run)\b/);
    // Self-hosted when the repo variable is set, GitHub's runner otherwise.
    expect(b).toContain("    runs-on: ${{ vars.CI_RUNNER_LINUX || 'ubuntu-latest' }}\n");
    expect(b).not.toContain("secrets.");
    // It needs to read the PR's files.
    expect(b).toMatch(/\n    permissions:\n      contents: read\n      pull-requests: read\n/);
  });

  it("the three jobs carry the same detection (same script, same input → the same answer)", () => {
    const det = (job: string) => {
      const b = block(job);
      return b.slice(b.indexOf("      - name: Detect changes"), b.indexOf("      - name: Docs-only PR"));
    };
    expect(det("test")).toBe(det("validate"));
    expect(det("build")).toBe(det("validate"));
  });

  it("there is no separate `changes` job any more", () => {
    expect(wf).not.toMatch(/\n  changes:\n/);
  });

  it("★component tests run inside the unit tests (no testcontainers for 6 UI files)", () => {
    expect(block("test")).not.toContain("npm run test:components");
    const unit = readFileSync(join(process.cwd(), "vitest.config.unit.ts"), "utf8");
    expect(unit).toContain("'components/**/*.test.tsx'");
  });

  it("codex-scope no longer runs on PR-body edits", () => {
    const cs = readFileSync(join(process.cwd(), ".github/workflows/codex-scope.yml"), "utf8");
    expect(cs).toMatch(/types: \[opened, synchronize, reopened\]/);
    expect(cs).not.toMatch(/types: \[[^\]]*edited/);
  });
});
