/**
 * Unit — dependency invariant guard for the `brace-expansion` / `minimatch` overrides in package.json.
 *
 * ## Why this test exists (PR #750 — do not delete the overrides it protects)
 *
 * `brace-expansion` advisory GHSA-mh99-v99m-4gvg covers `<=5.0.7`; the ONLY patched release is
 * `5.0.8`. There is no patched 1.x or 2.x. But 5.x also CHANGED ITS EXPORT SHAPE: the CJS build
 * exports an object `{ expand, EXPANSION_MAX, ... }`, where 1.x/2.x exported the function itself.
 *
 * So the obvious fix — forcing every `brace-expansion` to 5.0.8 — SILENTLY BREAKS old minimatch:
 *
 *   minimatch@3/@5:  `var expand = require('brace-expansion'); expand(pattern)`
 *                    → TypeError: expand is not a function
 *   minimatch@9:     `__importDefault(require('brace-expansion')).default(pattern)`
 *                    → TypeError: (0 , brace_expansion_1.default) is not a function
 *
 * ...and it only throws on patterns that CONTAIN BRACES, so non-brace patterns keep working and the
 * breakage hides. `npm audit --omit=dev --audit-level=high` returns EXIT 0 the whole time — the audit
 * gate is a proxy for "dependencies are safe", and here the operation that satisfies it breaks them.
 * (Observed for real: it took eslint down with `expand is not a function` at @eslint/config-array.)
 *
 * The fix in #750 was to raise the CONSUMER instead: `minimatch@5`/`@9` → `^10.2.5` (minimatch@10
 * uses the named `import { expand }`, so it matches 5.0.8), leaving `brace-expansion@1` alone for
 * the dev-only minimatch@3 that eslint pulls in via @eslint/eslintrc.
 *
 * Which override is actually load-bearing (measured, so the next person can prune accurately —
 * #750's own description was imprecise about this):
 *   `brace-expansion@1` → LOAD-BEARING. Sole consumer @eslint/eslintrc → minimatch@3.1.5. Raise it
 *                         to 5.x and eslint dies. This is the one this test protects.
 *   `brace-expansion@2` → currently a NO-OP. After #750 there are zero 2.x instances in the tree.
 *                         Harmless, but do not cite it as load-bearing.
 *   `brace-expansion@5` → pins the patched 5.0.8 for the minimatch@10 consumers.
 *   `minimatch@5`/`@9`  → the actual fix; forces the archiver subtree onto minimatch@10.
 *
 * ## What this test asserts
 *
 * The PROPERTY, not a version number or an export shape: every `minimatch` installed in the tree
 * must actually brace-expand a pattern without throwing. That is the thing that broke, and it is
 * invariant under future version bumps — a test pinning "brace-expansion must be callable" would
 * itself be a proxy, and would go stale the moment a consumer legitimately moves to 10.x.
 *
 * If this test fails, a `brace-expansion` / `minimatch` override has been changed or removed and the
 * resolved pair is mismatched. Do not "fix" it by deleting the assertion — check package.json
 * `overrides` against the notes above.
 *
 * NOTE: this does NOT mean GHSA-mh99 is resolved. The dev-only `minimatch/node_modules/brace-expansion`
 * is still 1.1.16 and still in the advisory's range; CI is green only because the gate runs with
 * `--omit=dev`. The advisory was moved OUT OF PRODUCTION SCOPE, not eliminated.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, "../..");

/** Collect every installed `minimatch` package directory, following nested node_modules. */
function findMinimatchDirs(nodeModules: string, found: string[] = [], depth = 0): string[] {
  if (depth > 4 || !existsSync(nodeModules)) return found;

  for (const entry of readdirSync(nodeModules)) {
    if (entry === ".bin" || entry === ".package-lock.json") continue;

    const dir = path.join(nodeModules, entry);
    if (!statSync(dir).isDirectory()) continue;

    // scoped packages (@scope/name) hold their packages one level deeper
    if (entry.startsWith("@")) {
      for (const scoped of readdirSync(dir)) {
        const scopedDir = path.join(dir, scoped);
        if (!statSync(scopedDir).isDirectory()) continue;
        findMinimatchDirs(path.join(scopedDir, "node_modules"), found, depth + 1);
      }
      continue;
    }

    if (entry === "minimatch" && existsSync(path.join(dir, "package.json"))) found.push(dir);
    findMinimatchDirs(path.join(dir, "node_modules"), found, depth + 1);
  }

  return found;
}

describe("dependency invariant: minimatch ↔ brace-expansion export shapes match", () => {
  const minimatchDirs = findMinimatchDirs(path.join(ROOT, "node_modules"));

  it("finds the installed minimatch copies (guards against the walk silently matching nothing)", () => {
    // A zero-length sweep would make every assertion below vacuously pass.
    expect(minimatchDirs.length).toBeGreaterThan(0);
  });

  it.each(minimatchDirs.map((dir) => [path.relative(ROOT, dir), dir] as const))(
    "%s brace-expands without throwing",
    (_label, dir) => {
      const version = require_(path.join(dir, "package.json")).version as string;
      const loaded = require_(dir) as unknown;
      // minimatch exports the function directly (<=9) or as a named `.minimatch` (>=10)
      const match = (loaded as { minimatch?: unknown }).minimatch ?? loaded;

      expect(typeof match, `minimatch@${version} at ${dir} is not callable`).toBe("function");

      const call = match as (p: string, pattern: string) => boolean;

      // The brace pattern is the whole point — this is the call that throws on a mismatched pair.
      expect(
        () => call("a/b.txt", "**/*.{txt,md}"),
        `minimatch@${version} failed to brace-expand — its resolved brace-expansion has an ` +
          `incompatible export shape. See the header of this file and package.json overrides (PR #750).`,
      ).not.toThrow();

      expect(call("a/b.txt", "**/*.{txt,md}")).toBe(true);
      expect(call("a/b.wav", "**/*.{txt,md}")).toBe(false);
    },
  );
});
