/**
 * Unit — adding a column to plugin_entitlements stays safe while production has not been migrated yet.
 *
 * ★THE WINDOW THIS PROTECTS. A column exists in the drizzle schema from the moment its PR merges, but
 * in production only after kimny applies the migration by hand. In between, the code's idea of the
 * table is ahead of the database. That window is safe only if every read names its columns: a bare
 * `.select()` makes drizzle emit every column it knows about, including the one production does not
 * have, and the query errors. An explicit projection asks for what already exists.
 *
 * ★AND IT WOULD NOT BE LOUD. `getPortalItemsForUser` is on the portal's render path, and
 * `recordPluginEntitlement` swallows its own errors by design — so the failure mode is a portal that
 * shows nothing, or entitlements that quietly stop being written. ★0058's header already warns about
 * deploy order in prose; this turns the half that is checkable into a check.
 *
 * ★Source text, not execution: these queries cannot be run here (no database), and the property is
 * about how the query is WRITTEN. `tests/unit/collector-sql-shape.test.ts` takes the same approach for
 * the same reason.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["lib", "scripts", "app", "db"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Every source file that queries the table, with its text. */
function callers(): { path: string; src: string }[] {
  const hits: { path: string; src: string }[] = [];
  for (const root of ROOTS) {
    for (const p of walk(join(process.cwd(), root))) {
      const src = readFileSync(p, "utf8");
      if (src.includes("from(pluginEntitlements)")) hits.push({ path: p, src });
    }
  }
  return hits;
}

describe("plugin_entitlements — column-addition safety", () => {
  it("★finds the callers at all (zero would make the rule below vacuous)", () => {
    const found = callers();
    expect(found.length).toBeGreaterThan(0);
    // ★Positive control: the portal's read is the one that must never break, so name it.
    expect(found.map((f) => f.path).some((p) => p.endsWith("portal-data.ts"))).toBe(true);
  });

  it("★no caller uses a bare .select() — every read names its columns", () => {
    for (const { path, src } of callers()) {
      // `.select()` with nothing between the parens is the unsafe form; `.select({ … })` is fine.
      const bare = /\.select\(\s*\)/.test(src);
      expect(
        bare,
        `${path}: bare .select() on plugin_entitlements — it emits every column drizzle knows, ` +
          `which fails while production is a migration behind. Name the columns you need.`,
      ).toBe(false);
    }
  });

  it("★the drizzle column and the migration agree on the name", () => {
    const schema = readFileSync(join(process.cwd(), "db", "schema", "plugin-entitlements.ts"), "utf8");
    const migration = readFileSync(
      join(process.cwd(), "db", "migrations", "0061_plugin_entitlements_locale.sql"),
      "utf8",
    );
    expect(schema).toContain("locale: text('locale')");
    expect(migration).toMatch(/add column if not exists\s+locale/i);
    // ★Idempotent DDL: the apply may be retried, and a second run must not fail.
    expect(migration).toMatch(/if not exists/i);
  });

  it("★the writer is NOT wired yet — that is deliberate, not an oversight", () => {
    // recordPluginEntitlement swallows errors, so wiring it before production has the column would
    // lose every new row without an error surfacing. The writer ships in a later PR, after the apply.
    const rec = readFileSync(join(process.cwd(), "lib", "plugins", "entitlements.ts"), "utf8");
    expect(rec).not.toContain("locale");
    // ★Positive control: the file really is the recorder, so "does not mention locale" means something.
    expect(rec).toContain("recordPluginEntitlement");
  });
});
