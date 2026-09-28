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
  ])("%s keeps its gate name, depends on `changes`, and every step is conditioned", (job, name) => {
    const b = block(job);
    expect(b).toContain(`    name: ${name}\n`);
    expect(b).toMatch(/\n    needs: (changes|\[changes, validate\])\n/);
    // ★No job-level `if:` — a skipped REQUIRED job is void to the merge gate.
    expect(b).not.toMatch(/\n    if: /);
    const lines = b.split("\n");
    const stepStarts = lines.flatMap((l, i) => (/^      - (uses|name|run): /.test(l) ? [i] : []));
    expect(stepStarts.length).toBeGreaterThan(1);
    for (const i of stepStarts) {
      expect(lines[i + 1], `step "${lines[i].trim()}" has a condition`).toMatch(/^        if: needs\.changes\.outputs\.code (==|!=) 'false'$/);
    }
    // ★Fail-CLOSED: exactly one no-op step runs only on an explicit 'false'; every heavy step runs
    //   unless the output is exactly 'false' — an empty output runs everything (CCO #1156).
    expect(b.match(/if: needs\.changes\.outputs\.code == 'false'/g)).toHaveLength(1);
    expect(b).not.toContain("code == 'true'");
  });

  it("the changes job treats schedule / workflow_dispatch as full runs and paginates the file list", () => {
    const b = block("changes");
    expect(b).toContain('if [ "$EVENT" != "pull_request" ]');
    expect(b).toContain("--paginate");
    expect(b).toContain(".previous_filename // empty");
    expect(b).toContain("scripts/ci/docs-only.mjs");
  });

  it("codex-scope no longer runs on PR-body edits", () => {
    const cs = readFileSync(join(process.cwd(), ".github/workflows/codex-scope.yml"), "utf8");
    expect(cs).toMatch(/types: \[opened, synchronize, reopened\]/);
    expect(cs).not.toMatch(/types: \[[^\]]*edited/);
  });
});
