/**
 * Every zod array in app/api and lib carries a length bound (.max or .length).
 *
 * ★Why: zod GHSA-mrhx-c7xc-m3w5 exhausts memory on a large array with no length limit. Its only fix
 * is zod 4, so the audit gate allows it until a date (lib/ci/audit-allowlist.ts) on the condition that
 * our own inputs are bounded. This test is that condition. A new unbounded z.array fails here.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOTS = ["app/api", "lib"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

/** For each `z.array(`, the text right after its matching `)`. Strings and comments are not special-cased. */
export function unboundedArrays(source: string): number[] {
  const lines: number[] = [];
  const re = /z\.array\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < source.length && depth > 0) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
      i++;
    }
    // Modifiers may come in any order before the bound: .min(1).max(200), .optional() is NOT a bound.
    const tail = source.slice(i).match(/^(\s*\.(?:min|nonempty)\([^)]*\))*\s*\.(max|length)\(/);
    if (!tail) lines.push(source.slice(0, m.index).split("\n").length);
  }
  return lines;
}

describe("zod arrays are bounded", () => {
  it("the scanner itself: flags an unbounded array, accepts .max / .min().max / .length", () => {
    expect(unboundedArrays("a: z.array(z.string()).optional(),")).toEqual([1]);
    expect(unboundedArrays("a: z.array(z.string()).max(5),")).toEqual([]);
    expect(unboundedArrays("a: z.array(\n z.object({ b: z.string() })\n).min(1).max(200),")).toEqual([]);
    expect(unboundedArrays("e: z.array(z.number()).length(1536),")).toEqual([]);
    expect(unboundedArrays("a: z.array(z.array(z.string()).max(3)),")).toEqual([1]);
  });

  it("finds arrays at all (the population is not empty)", () => {
    const total = ROOTS.flatMap(files).reduce((n, f) => n + (readFileSync(f, "utf8").match(/z\.array\(/g)?.length ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(15);
  });

  it("app/api and lib have no unbounded z.array", () => {
    const offenders = ROOTS.flatMap(files).flatMap((f) =>
      unboundedArrays(readFileSync(f, "utf8")).map((line) => `${f}:${line}`),
    );
    expect(offenders).toEqual([]);
  });
});
