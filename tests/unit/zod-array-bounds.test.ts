/**
 * Every zod array in app/api and lib goes through boundedArray (lib/validation/bounded-array.ts).
 *
 * ★Why not "every z.array has .max()": in zod 3, `.max()` runs after all elements are parsed, so it
 * does not bound the work (CCO, #1307 review 5638963405 — 2.25M issues and ~830 MB for one 4.5 MB
 * request). boundedArray checks the length first; tests/unit/bounded-array.test.ts measures that.
 * So the rule here is structural: a raw `z.array(` outside the helper fails.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOTS = ["app/api", "lib"];
const HELPER = join("lib", "validation", "bounded-array.ts");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

const all = ROOTS.flatMap(files);

describe("zod arrays go through boundedArray", () => {
  it("the population is not empty (boundedArray is actually used)", () => {
    const uses = all.reduce((n, f) => n + (readFileSync(f, "utf8").match(/boundedArray\(/g)?.length ?? 0), 0);
    expect(uses).toBeGreaterThanOrEqual(19);
  });

  it("no raw z.array( in app/api or lib outside the helper", () => {
    const offenders = all
      .filter((f) => f !== HELPER)
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .flatMap((line, i) => (/\bz\.array\(/.test(line) ? [`${f}:${i + 1}`] : [])),
      );
    expect(offenders).toEqual([]);
  });
});
