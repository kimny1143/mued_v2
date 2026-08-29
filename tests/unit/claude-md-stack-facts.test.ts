/**
 * Unit — the 技術スタック table in CLAUDE.md / AGENTS.md matches what is actually installed.
 *
 * ★WHY. CLAUDE.md declared "Next.js 15.5" while package.json declared ^16.2.11 — a MAJOR crossover,
 * wrong for 261 days (first 16.x landed 2025-12-12; the line was last written 2025-11-26, so it was
 * true when written). ★Nothing measured it: tsc, unit, lint and build all pass over a markdown table.
 * The wrong major then propagated into a skill that instructs future work ("Next.js 15 最適化パターン").
 *
 * ★The lesson is not "be careful with version numbers" — the previous line was written carefully and
 * was correct that day. It is that a hand-written fact with no instrument pointed at it decays
 * silently. So this file points one at it.
 *
 * ★MAJOR ONLY, deliberately. Pinning the minor would turn every routine bump into a docs edit, and a
 * check that cries on correct changes gets deleted. The major is what changes how the framework is
 * used — which is what the table is telling a reader.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

/** The declared range's major — `^16.2.11` → 16. */
function declaredMajor(dep: string): number {
  const raw = pkg.dependencies?.[dep] ?? pkg.devDependencies?.[dep];
  if (!raw) throw new Error(`${dep} is not a dependency — this test is not measuring what it thinks`);
  const m = String(raw).match(/(\d+)/);
  if (!m) throw new Error(`cannot read a major out of ${dep}@${raw}`);
  return Number(m[1]);
}

/** The major the doc claims, from the Frontend row: "Next.js 16.2 (App Router), React 19, …". */
function documentedMajor(doc: string, label: string): number {
  const row = doc.split("\n").find((l) => l.includes("**Frontend**"));
  if (!row) throw new Error("no **Frontend** row found — the table moved and this test went blind");
  const m = row.match(new RegExp(`${label}\\s+(\\d+)`));
  if (!m) throw new Error(`no "${label} <major>" in the Frontend row: ${row}`);
  return Number(m[1]);
}

const DOCS = ["CLAUDE.md", "AGENTS.md"];
// [doc label, package name] — the cells of the Frontend row that name a version.
const CELLS: [string, string][] = [
  ["Next.js", "next"],
  ["React", "react"],
  ["TailwindCSS", "tailwindcss"],
];

describe("CLAUDE.md 技術スタック — declared major matches package.json", () => {
  it("★the docs and the Frontend row are actually being read (a miss here blinds everything below)", () => {
    for (const d of DOCS) {
      const src = readFileSync(join(process.cwd(), d), "utf8");
      expect(src, `${d} is empty`).toContain("**Frontend**");
    }
    // ★Positive control on the other reader: a package we know is declared.
    expect(declaredMajor("next")).toBeGreaterThan(0);
  });

  for (const doc of DOCS) {
    for (const [label, dep] of CELLS) {
      it(`${doc}: ${label} major == package.json ${dep}`, () => {
        const src = readFileSync(join(process.cwd(), doc), "utf8");
        expect(documentedMajor(src, label)).toBe(declaredMajor(dep));
      });
    }
  }

  it("★negative control: a fabricated cell is NOT silently accepted", () => {
    // Without this, a documentedMajor() that quietly returned the declared value on any input would
    // make every assertion above pass. It must throw on something that is not there.
    const src = readFileSync(join(process.cwd(), "CLAUDE.md"), "utf8");
    expect(() => documentedMajor(src, "Zzqq")).toThrow();
  });

  it("★the two docs agree with each other (they are separate files, not a symlink)", () => {
    // CLAUDE.md and AGENTS.md carry the same table by hand. Fixing one and not the other is how the
    // drift came back last time — the AI row already differs on purpose, the versions must not.
    const rows = DOCS.map((d) =>
      readFileSync(join(process.cwd(), d), "utf8").split("\n").find((l) => l.includes("**Frontend**")),
    );
    expect(rows[0]).toBe(rows[1]);
  });
});
