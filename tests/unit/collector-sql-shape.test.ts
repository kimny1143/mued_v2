/**
 * Shape guard for the funnel collector's SQL.
 *
 * ★WHY. On 2026-08-28, PR #903 changed the collector's per-plugin query from a hardcoded
 * `IN ('muedsat','muedlim')` to `= ANY(${PLUGIN_KEYS})` so a fourth product would be picked up
 * automatically. That is the right intent and the wrong operator: drizzle expands a JS array into
 * a ROW expression `($1, $2, $3)`, which is valid after `IN` and invalid after `ANY(` — Postgres
 * answers `op ANY/ALL (array) requires array on right side (42809)`. It merged, and main's daily
 * collector was broken until a manual dispatch executed it against the real database.
 *
 * ★The gate that missed it. tsc, unit, lint and build all passed — none of them EXECUTE SQL, and
 * the string is well-typed either way. Reviewers ran the JS classification logic, not the query.
 * ★A green check only covers what it executes.
 *
 * This test closes that specific gap without needing a database: it renders the SQL through
 * drizzle's own dialect and asserts the operator/right-hand-side pairing. It is deliberately about
 * SQL SHAPE, not about counts — behaviour still needs a real run.
 */
import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();
const render = (q: ReturnType<typeof sql>) => dialect.sqlToQuery(q).sql;
const KEYS = ["muedsat", "muedlim", "muedrive"];

describe("collector SQL shape", () => {
  it("★RED: `= ANY(${array})` renders a row expression, which Postgres rejects", () => {
    // ★The failing form, kept so the reason for the rule is executable rather than folklore.
    expect(render(sql`SELECT 1 WHERE plugin_key = ANY(${KEYS})`)).toContain("ANY(($1, $2, $3))");
  });

  it("★GREEN: `IN ${array}` renders a plain parenthesised list", () => {
    const rendered = render(sql`SELECT 1 WHERE plugin_key IN ${KEYS}`);
    expect(rendered).toContain("IN ($1, $2, $3)");
    expect(rendered).not.toContain("ANY(");
  });

  it("★the collector source contains no `ANY(${array})` in CODE (comments excluded)", async () => {
    const fs = await import("node:fs");
    const raw = fs.readFileSync("scripts/aggregate-plugin-funnel-daily.ts", "utf8");

    // ★Strip comments before matching. The first version of this test failed against the very
    //   comment that explains the rule — a plain regex cannot tell USE from MENTION, and the file
    //   deliberately mentions the broken form so the next reader knows why the rule exists.
    //   ★Deleting the explanation to satisfy the grep would be the wrong fix.
    //   ★Three comment syntaxes live in this file, not two: block, line, and ★SQL `--` inside the
    //   template literals. The second version of this test still failed because it stripped only
    //   the TypeScript ones — the mention that tripped it was an SQL comment inside the query.
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")   // block
      .replace(/^\s*\/\/.*$/gm, "")        // TS line
      .replace(/^\s*--.*$/gm, "");         // ★SQL line, inside the sql`` templates

    // ★Positive controls — prove the strip did not eat the code we are asserting about.
    expect(code).toContain("FROM plugin_entitlements");
    expect(code).toMatch(/plugin_key IN \$\{PLUGIN_KEYS\}/);
    // ★Negative control — the mention survives in raw, so raw is NOT a valid population here.
    expect(raw).toMatch(/ANY\(\$\{[A-Za-z_]+\}\)/);

    // ★The actual assertion, against code only.
    expect(code).not.toMatch(/ANY\(\$\{[A-Za-z_]+\}\)/);
  });
});
