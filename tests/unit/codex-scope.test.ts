import { createRequire } from "node:module";
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
