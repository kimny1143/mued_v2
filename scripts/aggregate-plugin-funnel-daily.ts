#!/usr/bin/env tsx
/**
 * プラグインfunnel (MUEDsat/MUEDlim) 日次自動集計 — Resend×DB collector (Stage A).
 *
 * insight課 (gw-data-analysis) の設計 (PR #272 in gw-data-analysis) を conductor が endorse (2026-07-18)、
 * mued課 (repo/secret/CI owner) がTier2レビュー。棚別(muedsat/muedlim)split は Resend に無い
 * (audience は統一 "MUEDsp" 1本) ため DB `plugin_entitlements`(plugin_key) を権威値とし、Resend
 * welcome件名判定 (measure-muedsp-shelf-daily.ts と同ロジック) は DB との乖離を検知する anomaly signal
 * に降格する。
 *
 * READ-ONLY: Resend GET + DB SELECT のみ。write/upsert 一切なし。
 * PII: 出力JSONは件数・率のみ。emailアドレス等は一切書き出さない。
 *
 * MUEDsp audience id は rescue8-muedsp-delta.ts (2026-07-18 CLOSED, verify PASS, owner union=311) と
 * 同じ 243e06eb-...（旧MUEDlim audienceをリネームし統一）を権威として使う。
 * ★count-plugin-backfill-dryrun.ts に残る "General"(6293ccef-...) 参照は rescue-8 統合前の名残と判断
 *   したが未確定 — レビューで誤りなら指摘ください。
 *
 * broadcast開封率・クリック率は本v1では未収集（broadcast送信日のみ意味があり非ブロッキング — Resendが
 * 自動保持するため必要な時に別途pull可能。将来のfollow-upとする）。
 *
 * Usage:
 *   npx tsx scripts/aggregate-plugin-funnel-daily.ts                 # 直近UTC完全1日（昨日）
 *   npx tsx scripts/aggregate-plugin-funnel-daily.ts 2026-07-17      # 指定UTC日
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const KEY = process.env.RESEND_API_KEY;
if (!KEY) {
  console.error("RESEND_API_KEY missing");
  process.exit(1);
}
const H = { Authorization: `Bearer ${KEY}` };

const MUEDSP_AUDIENCE_ID = "243e06eb-1ddc-441d-a241-1e2044ef4b5f";

const arg = process.argv[2];
function utcDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
const DAY = arg || utcDay(-1); // default = yesterday UTC (last complete day)

type Email = { id: string; subject?: string; last_event?: string; created_at?: string };
type PluginKey = "muedsat" | "muedlim";

function shelf(subject?: string): PluginKey | "other" {
  const s = subject || "";
  if (/MUEDsat/.test(s) && /download/i.test(s)) return "muedsat";
  if (/MUEDlim/.test(s) && /download/i.test(s)) return "muedlim";
  return "other";
}

async function fetchWelcomeEmailsForDay(day: string): Promise<Email[]> {
  let all: Email[] = [];
  let url: string | null = "https://api.resend.com/emails?limit=100";
  let pages = 0;
  while (url && pages < 30) {
    const r = await fetch(url, { headers: H });
    const b = (await r.json()) as { data?: Email[]; has_more?: boolean };
    const data = b.data || [];
    all = all.concat(data);
    pages++;
    const oldest = data.length ? data[data.length - 1].created_at || "" : "";
    if (!b.has_more || oldest < day) break;
    const last = data[data.length - 1];
    url = last ? `https://api.resend.com/emails?limit=100&after=${last.id}` : null;
  }
  return all.filter((e) => (e.created_at || "").startsWith(day));
}

type Contact = { email?: string | null; unsubscribed?: boolean; created_at?: string };

async function muedspAudienceSnapshot(): Promise<{ total: number; unsubscribed: number; netNewDay: number }> {
  const r = await fetch(`https://api.resend.com/audiences/${MUEDSP_AUDIENCE_ID}/contacts`, { headers: H });
  const text = await r.text();
  if (!r.ok) throw new Error(`audience list ${r.status}: ${text.slice(0, 160)}`);
  const body = JSON.parse(text) as { data?: Contact[]; has_more?: boolean };
  // ★accuracy guard: 単一callがtruncateしていたら過小集計→abort（rescue8-muedsp-delta.tsと同ガード）。
  if (body.has_more) {
    throw new Error("audience has_more=true — single-call list truncated. pagination未実装ゆえabort.");
  }
  const contacts = body.data ?? [];
  let unsubscribed = 0;
  let netNewDay = 0;
  for (const c of contacts) {
    if (c.unsubscribed) unsubscribed++;
    if ((c.created_at || "").startsWith(DAY)) netNewDay++;
  }
  return { total: contacts.length, unsubscribed, netNewDay };
}

async function dbShelfNetNew(day: string): Promise<Record<PluginKey, number>> {
  const rows = await db.execute(sql`
    SELECT plugin_key, count(*)::int AS cnt
    FROM plugin_entitlements
    WHERE created_at::date = ${day}::date
      AND plugin_key IN ('muedsat', 'muedlim')
    GROUP BY plugin_key
  `);
  const out: Record<PluginKey, number> = { muedsat: 0, muedlim: 0 };
  for (const r of rows.rows as Array<{ plugin_key: PluginKey; cnt: number }>) {
    out[r.plugin_key] = r.cnt;
  }
  return out;
}

async function dbOwnerUnionTotal(): Promise<number> {
  const rows = await db.execute(sql`
    SELECT count(DISTINCT lower(trim(email)))::int AS cnt
    FROM plugin_entitlements
    WHERE plugin_key IN ('muedsat', 'muedlim')
  `);
  return (rows.rows[0] as { cnt: number }).cnt;
}

async function main() {
  const [welcomeEmails, audience, dbNetNew, ownerUnionTotal] = await Promise.all([
    fetchWelcomeEmailsForDay(DAY),
    muedspAudienceSnapshot(),
    dbShelfNetNew(DAY),
    dbOwnerUnionTotal(),
  ]);

  const shelfEmail: Record<PluginKey, { delivered: number; bounced: number; other: number }> = {
    muedsat: { delivered: 0, bounced: 0, other: 0 },
    muedlim: { delivered: 0, bounced: 0, other: 0 },
  };
  for (const e of welcomeEmails) {
    const sh = shelf(e.subject);
    if (sh === "other") continue;
    if (e.last_event === "delivered") shelfEmail[sh].delivered++;
    else if (e.last_event === "bounced") shelfEmail[sh].bounced++;
    else shelfEmail[sh].other++;
  }

  // anomaly signal: DB純増(権威) > email delivered なら「DLは成立したがwelcome email失敗」を示唆。
  const anomalies: string[] = [];
  for (const sh of ["muedsat", "muedlim"] as const) {
    if (dbNetNew[sh] > shelfEmail[sh].delivered) {
      anomalies.push(
        `${sh}: db_net_new(${dbNetNew[sh]}) > email_delivered(${shelfEmail[sh].delivered}) — welcome email未達の疑い`,
      );
    }
  }

  const report = {
    date: DAY,
    generated_at: new Date().toISOString(),
    resend: {
      mued_sp_total_contacts: audience.total,
      mued_sp_net_new_day: audience.netNewDay,
      mued_sp_unsubscribed_total: audience.unsubscribed,
      welcome_delivered_total: shelfEmail.muedsat.delivered + shelfEmail.muedlim.delivered,
      broadcast: null, // v1未収集。broadcast送信日のみ別途pull（follow-up）。
    },
    shelf: {
      muedsat: { db_net_new: dbNetNew.muedsat, email_delivered: shelfEmail.muedsat.delivered, email_bounced: shelfEmail.muedsat.bounced },
      muedlim: { db_net_new: dbNetNew.muedlim, email_delivered: shelfEmail.muedlim.delivered, email_bounced: shelfEmail.muedlim.bounced },
    },
    db_owner_union_total: ownerUnionTotal,
    anomalies,
  };

  mkdirSync("reports/plugin-funnel", { recursive: true });
  const outPath = `reports/plugin-funnel/${DAY}.json`;
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`=== plugin funnel daily aggregate — UTC ${DAY} ===`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n→ written: ${outPath}`);
  if (anomalies.length) {
    console.warn(`\n⚠️ anomalies detected:\n${anomalies.map((a) => `  - ${a}`).join("\n")}`);
  }
}

main().then(() => process.exit(0)).catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[aggregate-plugin-funnel-daily] fatal: ${msg}`);
  process.exit(1);
});
