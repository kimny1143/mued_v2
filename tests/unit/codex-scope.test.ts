import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type ScopeEvaluation =
  | { kind: "skipped" }
  | { kind: "passed"; outsideFiles: string[] }
  | {
      kind: "failed";
      reason: "invalid_declaration" | "out_of_scope";
      outsideFiles: string[];
    };

type ScopeChecker = {
  evaluateScope: (headBranch: string, body: string, changedFiles: readonly string[]) => ScopeEvaluation;
  findOutOfScopeFiles: (changedFiles: readonly string[], allowedPaths: readonly string[]) => string[];
  parseAllowedPaths: (body: string) => string[] | null;
  shouldCheckBranch: (headBranch: string) => boolean;
};

// The CI entry point is deliberately valid CommonJS as well as TypeScript, so GitHub Actions can
// run it with the runner's Node.js without downloading an npm executor. Requiring it here exercises
// the exact module that CI executes.
const loadCommonJs = createRequire(import.meta.url);
const {
  evaluateScope,
  findOutOfScopeFiles,
  parseAllowedPaths,
  shouldCheckBranch,
} = loadCommonJs("../../scripts/ci/check-codex-scope.ts") as ScopeChecker;

describe("findOutOfScopeFiles", () => {
  it("returns no files when every changed file is declared", () => {
    expect(
      findOutOfScopeFiles(
        ["tests/unit/codex-scope.test.ts", "CODEX-REPORT.md"],
        ["tests/unit/codex-scope.test.ts", "CODEX-REPORT.md"],
      ),
    ).toEqual([]);
  });

  it("returns the one undeclared file mixed into the changes", () => {
    expect(
      findOutOfScopeFiles(
        ["scripts/ci/check-codex-scope.ts", "package.json"],
        ["scripts/ci/check-codex-scope.ts"],
      ),
    ).toEqual(["package.json"]);
  });

  it("accepts a file below a declared directory ending in a slash", () => {
    expect(findOutOfScopeFiles(["lib/audio/analyser.ts"], ["lib/audio/"])).toEqual([]);
  });

  it("does not confuse a path prefix with a directory boundary", () => {
    expect(findOutOfScopeFiles(["lib/ab.ts"], ["lib/a"])).toEqual(["lib/ab.ts"]);
  });

  it("fails when the declaration payload is empty and cannot be parsed", () => {
    expect(
      evaluateScope(
        "fix/codex-scope-check",
        "- 編集を許した path:",
        ["scripts/ci/check-codex-scope.ts"],
      ),
    ).toEqual({ kind: "failed", reason: "invalid_declaration", outsideFiles: [] });
  });
});

describe("parseAllowedPaths", () => {
  it("parses the valid declaration line", () => {
    expect(
      parseAllowedPaths(
        [
          "Automated Codex change.",
          "- 編集を許した path: ['tests/unit/codex-scope.test.ts', 'CODEX-REPORT.md']",
        ].join("\n"),
      ),
    ).toEqual(["tests/unit/codex-scope.test.ts", "CODEX-REPORT.md"]);
  });

  it("returns parse failure when the declaration line is absent", () => {
    expect(parseAllowedPaths("Automated Codex change.")).toBeNull();
  });

  it("parses an empty list and leaves every changed file out of scope", () => {
    const allowedPaths = parseAllowedPaths("- 編集を許した path: []");

    expect(allowedPaths).toEqual([]);
    expect(findOutOfScopeFiles(["CODEX-REPORT.md"], allowedPaths ?? [])).toEqual([
      "CODEX-REPORT.md",
    ]);
  });
});

describe("shouldCheckBranch", () => {
  it("checks a fix/codex branch", () => {
    expect(shouldCheckBranch("fix/codex-abc")).toBe(true);
  });

  it("silently skips another branch", () => {
    expect(shouldCheckBranch("feat/something")).toBe(false);
  });
});

describe("★the CI entry point stays plain JavaScript", () => {
  // ★The file's own docstring promises it is "valid CommonJS as well as TypeScript" so CI can run it
  //   with bare `node` and no install. ★Nothing enforced that promise: requiring it from vitest
  //   proves nothing, because vitest transpiles TypeScript happily — it would keep passing the day
  //   the file stopped being plain JS.
  //
  // ★Nor can the workflow enforce it. Measured 2026-09-12 on five runtimes: native type stripping is
  //   default from Node 22.18, so on a modern runtime a stray `const x: number` is silently stripped
  //   and everything stays green. ★Pinning CI to Node 20 would surface it — but Node 20 went EOL
  //   2026-04-30 (nodejs/Release schedule.json, checked by CCO), and pinning an unsupported runtime
  //   to obtain a lint-like property is the wrong trade. ★So assert the property directly here, where
  //   it costs nothing and does not depend on any runtime version.
  const SOURCE = "scripts/ci/check-codex-scope.ts";

  /** `node --check` parses without executing. Renamed to .cjs so it is parsed as the CommonJS it claims to be. */
  const parses = (contents: string): boolean => {
    const file = join(mkdtempSync(join(tmpdir(), "codex-scope-")), "probe.cjs");
    writeFileSync(file, contents);
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  };

  it("★★parses as CommonJS with no TypeScript-only syntax", () => {
    expect(parses(readFileSync(SOURCE, "utf8"))).toBe(true);
  });

  it("★positive control — the same check rejects a single type annotation", () => {
    // ★Without this, `parses()` returning true would also be satisfied by a broken probe that never
    //   fails. ★This is the assertion that makes the one above mean something.
    expect(parses(`${readFileSync(SOURCE, "utf8")}\nconst probe: number = 1;\n`)).toBe(false);
  });
});
