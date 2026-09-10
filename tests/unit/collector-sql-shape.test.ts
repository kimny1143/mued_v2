/**
 * Shape guards for raw drizzle `sql` templates, repo-wide.
 *
 * ★WHY. On 2026-08-28 the funnel collector broke twice in one afternoon, and neither break was
 * visible to tsc, unit, lint or build:
 *
 *   #903  `= ANY(${PLUGIN_KEYS})` — drizzle expands a JS array into the ROW expression
 *         `($1, $2, $3)`, which is valid after `IN` and invalid after `ANY(`. Postgres answers
 *         `op ANY/ALL (array) requires array on right side (42809)`. It merged, and main's daily
 *         collector was broken until a manual dispatch executed it against the real database.
 *
 *   #907  A `--` line INSIDE the sql`` template, written to warn the next person about #903.
 *         A backtick in that prose CLOSED the template on the spot, so the SQL that followed
 *         became bare code and esbuild could not PARSE the file at all.
 *         ★Measured with `node --check` across four variants — the backtick is what breaks parsing:
 *             -- use `IN ${keys}` not ANY   backtick + interpolation  ★parse FAILS
 *             -- use IN ${keys} not ANY     interpolation only         parses (fails at RUNTIME)
 *             -- use `IN` not ANY           ★backtick only             ★parse FAILS
 *             -- use IN not ANY             neither (control)          parses
 *
 * ★WHAT THIS FILE CAN AND CANNOT DO. These are SHAPE guards: they render SQL through drizzle's own
 * dialect and read source text. They do not execute queries, so they say nothing about whether a
 * query returns the right rows. ★A green check only covers what it executes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";

const dialect = new PgDialect();
const render = (q: ReturnType<typeof sql>) => dialect.sqlToQuery(q).sql;
const KEYS = ["muedsat", "muedlim", "muedrive"];

/**
 * ★WHICH `sql` IS IN SCOPE DECIDES WHETHER THE FORM IS A BUG. Two drivers ship in this repo and they
 * serialize an interpolated array in OPPOSITE ways — measured 2026-09-10, and both canaried below so
 * the premise is executed rather than asserted in prose:
 *
 *   drizzle-orm               `= ANY(${ids})` → `ANY(($1, $2, $3))`  ★row expression → Postgres 42809
 *   @neondatabase/serverless  `= ANY(${ids})` → `ANY($1)`, one param, array intact  ★correct
 *
 * ∴ a neon file writing `= ANY(${ids})` is not the #903 bug — it is the idiomatic form for that
 * driver, and the only form that works there. ★The exclusion is by PROOF, not by convenience:
 *   · only a file that IMPORTS the neon driver leaves the population,
 *   · an unclassified file STAYS in (absence of evidence is not evidence of neon),
 *   · and a file importing BOTH goes red below instead of silently leaving.
 * ★Narrowing a detector is where blind spots are made, so the size of the exclusion is asserted the
 * same way SELF's is, and the file this guard was written for (#903) is asserted to still be inside.
 */
const importsNeon = (src: string) => /from\s*["']@neondatabase\/serverless["']/.test(src);
const importsDrizzleSql = (src: string) =>
  /import\s*\{[^}]*\bsql\b[^}]*\}\s*from\s*["']drizzle-orm["']/.test(src);

/**
 * ★Remove every comment syntax these files use — THREE of them, not two: block, TS line, and SQL
 * `--` inside the sql`` templates. A first attempt missed the SQL one and failed against the very
 * comment documenting the rule. ★A regex cannot tell USE from MENTION, so the mention has to leave
 * the population before the assertion runs; deleting the explanation to satisfy the grep would be
 * the wrong fix.
 */
const strip = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*--.*$/gm, "");

/**
 * ★Population defined BY EXECUTION, not by a hand-written list. The rule is repo-wide, so the
 * guard must be too — an earlier version checked a single file, which would have stayed green the
 * day the same mistake appeared somewhere else. A literal array of paths is guaranteed to rot.
 */
function filesWithRawSql(root = "."): string[] {
  const skip = new Set(["node_modules", ".next", ".git", "dist", "coverage", ".vercel", "reports"]);
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(entry.name) && readFileSync(p, "utf8").includes("sql`")) found.push(p);
    }
  };
  walk(root);
  return found;
}

describe("drizzle raw-SQL shape", () => {
  it("★canary: `= ANY(${array})` still renders a row expression in this drizzle version", () => {
    // ★Not a bug report — a canary on drizzle's CURRENT rendering, which is the premise the rule
    //   rests on. If a future drizzle emits a real array here, this goes red while nothing is
    //   broken, and that is the point: we want to be told the premise changed. ★Do not delete it
    //   as "a test of the broken form" — update the rule instead.
    expect(render(sql`SELECT 1 WHERE plugin_key = ANY(${KEYS})`)).toContain("ANY(($1, $2, $3))");
  });

  it("★canary: the neon driver keeps an interpolated array as ONE parameter", () => {
    // ★The premise the exclusion rests on, executed. A neon query object is LAZY — it is not sent
    //   until it is awaited — so this constructs one and reads what it built, touching no network.
    //   ★Do not await it and do not attach .then/.catch: either would execute the query.
    //   If a future neon expands the array the way drizzle does, this goes red — and then the
    //   exclusion below has to go, not this canary.
    const sqlNeon = neon("postgresql://user:pass@example.neon.tech/db");
    const q = sqlNeon`SELECT 1 FROM t WHERE id = ANY(${KEYS})` as unknown as {
      queryData: { strings: string[]; values: unknown[] };
    };
    expect(q.queryData.values).toEqual([KEYS]); // ★ONE value, and it is the array itself
    expect(q.queryData.strings.join("$")).toContain("ANY(");
  });

  it("★`IN ${array}` renders a plain parenthesised list", () => {
    const rendered = render(sql`SELECT 1 WHERE plugin_key IN ${KEYS}`);
    expect(rendered).toContain("IN ($1, $2, $3)");
    expect(rendered).not.toContain("ANY(");
  });

  it("★no file in the repo puts an expanded array after ANY( in CODE", () => {
    const files = filesWithRawSql();
    // ★Assert the population is non-empty before asserting anything "for all" over it. A walk that
    //   silently matches nothing makes every per-file check pass.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(join(".", "scripts", "aggregate-plugin-funnel-daily.ts"));

    // ★This guard file itself holds the forbidden form on purpose (the canary above), so it has to
    //   leave the population. ★Excluding yourself from your own check is exactly how a check goes
    //   quietly useless, so the exclusion is named, and its SIZE is asserted: if a second file ever
    //   ends up here, this line goes red instead of silently widening the blind spot.
    const SELF = join(".", "tests", "unit", "collector-sql-shape.test.ts");
    expect(files).toContain(SELF);
    const withSrc = files.filter((f) => f !== SELF).map((f) => [f, readFileSync(f, "utf8")] as const);

    // ★The one way the neon exclusion could hide a real drizzle bug: a file that is both. Measured
    //   0 today. If one ever appears, this goes red HERE rather than that file quietly leaving.
    //   ★SELF is out of this set on purpose — it imports both drivers to canary both renderings,
    //   which is precisely the shape this asserts nobody else has. It is excluded BY NAME above,
    //   never by class, so it can never be the thing that hides an offender.
    const mixed = withSrc.filter(([, s]) => importsNeon(s) && importsDrizzleSql(s)).map(([f]) => f);
    expect(mixed).toEqual([]);

    const neonFiles = withSrc.filter(([, s]) => importsNeon(s)).map(([f]) => f);
    const population = withSrc.filter(([, s]) => !importsNeon(s)).map(([f]) => f);

    // ★Every excluded file is accounted for by name-or-class: SELF, plus the proven-neon set.
    expect(files.length - population.length).toBe(1 + neonFiles.length);
    // ★…and the narrowing did not remove the file this guard exists for (#903, drizzle).
    expect(population).toContain(join(".", "scripts", "aggregate-plugin-funnel-daily.ts"));
    expect(population.length).toBeGreaterThan(20); // ★still a repo-wide check, not a two-file one

    const offenders = population.filter((f) =>
      /ANY\(\$\{[A-Za-z_]+\}\)/.test(strip(readFileSync(f, "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it("★no file in the repo puts a backtick inside a sql`` template", () => {
    // ★#907's actual cause. A backtick closes the template; whatever follows becomes bare code.
    const offenders: string[] = [];
    for (const f of filesWithRawSql()) {
      const src = readFileSync(f, "utf8");
      // Walk each sql`…` span. The template ends at the FIRST unescaped backtick, so a stray one
      // inside prose simply ends it early — which is exactly the failure being guarded against.
      // Detect it by looking for a `--` comment line that contains a backtick within a sql span.
      for (const m of src.matchAll(/\bsql`/g)) {
        const rest = src.slice(m.index! + m[0].length);
        const end = rest.indexOf("`");
        const span = end === -1 ? rest : rest.slice(0, end);
        if (/^\s*--.*$/m.test(span) && /^\s*--.*`/m.test(rest.slice(0, Math.max(end, 0) + 200))) {
          offenders.push(`${f}: a \`--\` line inside a sql template appears to contain a backtick`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("★the strip() helper removes mentions but keeps live code", () => {
    // ★Control on the MECHANISM, not on any file's prose. An earlier version asserted that the
    //   collector source still contained the forbidden form — true only while some comment happened
    //   to mention it, so rewording a comment broke the test.
    const synthetic = [
      "const a = 1; /* mentions ANY(${keys}) in a block comment */",
      "// mentions ANY(${keys}) in a TS line comment",
      "  -- mentions ANY(${keys}) in an SQL line comment",
      "const live = sql`WHERE k = ANY(${keys})`;",
    ].join("\n");
    expect(synthetic.match(/ANY\(\$\{[A-Za-z_]+\}\)/g)).toHaveLength(4); // all four before stripping
    expect(strip(synthetic).match(/ANY\(\$\{[A-Za-z_]+\}\)/g)).toHaveLength(1); // ★only the live one
  });
});
