//
// User portal P-3 (docs/portal/plan-brief-user-portal-20260717.md) — one-shot backfill of
// plugin_entitlements from the existing Resend audiences (the only record of the free-download leads
// that predate P-1's write, ~250 people). This is the reconciliation net for anything the live
// subscribe-handler record missed or that came before it.
//
// IDEMPOTENT (onConflictDoNothing on UNIQUE(email, plugin_key)) — safe to re-run.
// DRY-RUN BY DEFAULT; pass --commit to actually write.
// RUN IS GATED (a mass list op + a prod DB write) = kimny/conductor, NOT peer self-run. Requires
// migration 0058 applied first (plugin_entitlements must exist).
// HONEST-DISPLAY: prints per-plugin counts (listed / unique / actually-new) so a lost lead is visible.
//
//   npx tsx scripts/backfill-plugin-entitlements.ts            # dry-run (default) — lists, writes nothing
//   npx tsx scripts/backfill-plugin-entitlements.ts --commit   # write (GATED — kimny/conductor only)
import { Resend } from "resend";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { pluginEntitlements } from "@/db/schema";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { pluginAudienceId } from "@/lib/plugins/audience";
import { contactsToEntitlementRows, type ResendContactLite } from "@/lib/plugins/backfill";

const COMMIT = process.argv.includes("--commit");
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CHUNK = 500;

async function countRows(plugin: PluginKey): Promise<number> {
  const res = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pluginEntitlements)
    .where(eq(pluginEntitlements.pluginKey, plugin));
  return res[0]?.c ?? 0;
}

async function main(): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error("[backfill] RESEND_API_KEY not set — cannot list the audiences. Aborting.");
    process.exit(1);
  }
  const resend = new Resend(RESEND_API_KEY);
  console.log(`[backfill] mode=${COMMIT ? "COMMIT (writing)" : "DRY-RUN (no writes)"}`);

  let grandNew = 0;
  for (const plugin of Object.keys(PLUGIN_DIST) as PluginKey[]) {
    const audienceId = pluginAudienceId(plugin);
    if (!audienceId) {
      console.log(`  ${plugin}: audience not configured (${PLUGIN_DIST[plugin].audienceEnvName} unset) — skip`);
      continue;
    }

    const { data, error } = await resend.contacts.list({ audienceId });
    if (error) {
      console.error(`  ${plugin}: Resend list error — skip`, error);
      continue;
    }
    const contacts = (data?.data ?? []) as ResendContactLite[];
    const rows = contactsToEntitlementRows(plugin, contacts);
    console.log(`  ${plugin}: listed=${contacts.length} unique=${rows.length}`);

    if (!COMMIT || rows.length === 0) continue;

    const before = await countRows(plugin);
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db
        .insert(pluginEntitlements)
        .values(rows.slice(i, i + CHUNK))
        .onConflictDoNothing({ target: [pluginEntitlements.email, pluginEntitlements.pluginKey] });
    }
    const after = await countRows(plugin);
    const added = after - before;
    grandNew += added;
    console.log(`    inserted new=${added} (was ${before}, now ${after})`);
  }

  console.log(`[backfill] done. ${COMMIT ? `new rows written=${grandNew}` : "dry-run — nothing written"}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] fatal", e);
  process.exit(1);
});
