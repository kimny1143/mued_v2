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
 * 北極星2段計数 (conductor dispatch 2026-07-23): 本 collector が Stage A。insight課 Stage B (#276 merged)
 * は null 安全 passthrough 済ゆえ、ここで下記2キーを出せば Stage B 無変更で反映される:
 *   - marketing_contacts_total (②): 全 Resend audience の email を union dedup した distinct 件数 (def B・
 *     billing exposure)。併せて marketing_contacts_reachable (unsub 除外・到達可能数・definition 同梱)。
 *   - portal_registrations (③b): plugin_entitlements.portal_registered_at (列 0059) の cumulative + day_utc。
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
const GENERAL_AUDIENCE_ID = "6293ccef-c19f-4a4e-bb52-4bd8a6ef5c6f";

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

/**
 * ② marketing_contacts_total — 全 Resend audience の email を lower/trim して union した distinct 件数
 * (freee/CFO サインオフの def B: General 単体は billing exposure 過小ゆえ全 audience dedup)。
 * READ-ONLY GET のみ。accuracy guard: audience 一覧 or 各 audience contacts が has_more なら過小集計→abort。
 * 現状 audience は MUEDsp + General の2本 (実測 has_more=false)。将来 audience 追加時も一覧を辿るので追随する。
 */
async function audienceContacts(audienceId: string): Promise<Array<{ email: string; unsubscribed: boolean }>> {
  const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, { headers: H });
  const text = await r.text();
  if (!r.ok) throw new Error(`audience ${audienceId} list ${r.status}: ${text.slice(0, 160)}`);
  const body = JSON.parse(text) as { data?: Contact[]; has_more?: boolean };
  if (body.has_more) {
    throw new Error(`audience ${audienceId} has_more=true — single-call list truncated. pagination未実装ゆえabort.`);
  }
  return (body.data ?? [])
    .map((c) => ({ email: (c.email || "").trim().toLowerCase(), unsubscribed: c.unsubscribed === true }))
    .filter((c) => c.email.length > 0);
}

/**
 * marketing_contacts の total (billing exposure) と reachable を1度の走査で出す。
 * ★total = 全 audience union の distinct email 件数 (freee def B・unsubscribed 含む＝billing exposure)。
 * ★reachable = そのうち「いずれかの audience で subscribed (unsubscribed=false)」な email 件数。
 *   定義判断: Resend の unsubscribe は audience 単位ゆえ、ある audience で解除でも別 audience で購読中なら
 *   その audience 経由で到達可能 → reachable は OR (少なくとも1つで subscribed)。この選択を出力の
 *   `definition` フィールドに同梱し、Chief 台帳が別定義 (どこか1つでも解除なら除外=AND) を採るなら
 *   follow-up で差し替え可能にする (北極星の分母の最終判断は Chief 領分・conductor 経由)。
 * accuracy guard: audience 一覧 or 各 audience contacts が has_more なら過小集計→abort。
 */
async function marketingContacts(): Promise<{ total: number; reachable: number }> {
  const listRes = await fetch("https://api.resend.com/audiences", { headers: H });
  const listText = await listRes.text();
  if (!listRes.ok) throw new Error(`audiences list ${listRes.status}: ${listText.slice(0, 160)}`);
  const listBody = JSON.parse(listText) as { data?: Array<{ id: string }>; has_more?: boolean };
  if (listBody.has_more) {
    throw new Error("audiences list has_more=true — >100 audiences, pagination未実装ゆえabort.");
  }
  const ids = (listBody.data ?? []).map((a) => a.id);
  // email → reachableAnywhere (いずれかの audience で unsubscribed=false なら true)
  const reachableByEmail = new Map<string, boolean>();
  for (const id of ids) {
    for (const c of await audienceContacts(id)) {
      const prev = reachableByEmail.get(c.email) ?? false;
      reachableByEmail.set(c.email, prev || !c.unsubscribed);
    }
  }
  let reachable = 0;
  for (const ok of reachableByEmail.values()) if (ok) reachable++;
  return { total: reachableByEmail.size, reachable };
}

const MARKETING_REACHABLE_DEFINITION =
  "union dedup across all audiences (currently MUEDsp+General); reachable = subscribed (unsubscribed=false) in at least one audience. total (marketing_contacts_total) = billing exposure incl. unsubscribed.";

/**
 * ★forward-only signal の起点日 = #710 (markPortalRegistered) が prod deploy された日 (2026-07-23)。
 * portal_registered_at はこの日以降の初回ポータル表示しか記録しない — deploy 前の到達は列が存在しなかった
 * ので backfill 不可。GA4 で観測した broadcast 反応 (7/18–22 の到達15) は別軸・遡れない。
 * ★これを ↓ の出力に counting_since + note として同梱する (conductor + product課 が独立に要求)。理由:
 * 消費側 (insight Stage B / Chief 台帳 / kimny PWA) は JSON しか読まないので、意味を別文書の注記に置くと
 * 剥がれて「cumulative=0 なのに GA は15 = ポータル壊れてる」と誤読される。データに意味を同梱すれば
 * 誰がどの順で読んでも取り違えない (この session で繰り返した「中間表現を最終形として読む」の予防)。
 */
const PORTAL_REG_COUNTING_SINCE = "2026-07-23";
const PORTAL_REG_NOTE =
  "forward-only; not backfillable (recording shipped 2026-07-23). Portal arrivals before that date are only observable in GA4, not here.";

type PortalRegistrations = {
  cumulative: number;
  day_utc: number;
  counting_since: string;
  note: string;
};

/**
 * ③b portal_registrations — 認証済 owner が /dashboard/plugins を初回表示した signal (北極星③・列 0059)。
 * markPortalRegistered は owner の verified email に紐づく全 entitlement 行に同一 timestamp を1度だけ書く。
 * 行数でなく DISTINCT email で数えるが、これは厳密には「人数」でなく「distinct registered email」＝
 * 1人が複数 verified email に entitlement を持つと複数計上されうる (稀)。北極星 signal としては実用十分。
 *
 * ★tz 基準: portal_registered_at は `timestamp without time zone` に UTC instant を格納 (new Date())。
 * daily は本レポート全体と同じ UTC 日付でバケットする (report header も "UTC ${DAY}")。JST 早朝
 * (00:00–08:59 JST) の登録は UTC 前日に落ちる — レポート全体の tz 基準と揃えた意図的挙動で、出力キー名
 * `day_utc` で明示する (product課 review 指摘の反映)。cumulative は tz 非依存 (IS NOT NULL)。
 */
async function portalRegistrations(day: string): Promise<PortalRegistrations> {
  const rows = await db.execute(sql`
    SELECT
      count(DISTINCT lower(trim(email))) FILTER (WHERE portal_registered_at IS NOT NULL)::int AS cumulative,
      count(DISTINCT lower(trim(email))) FILTER (WHERE portal_registered_at::date = ${day}::date)::int AS day_utc
    FROM plugin_entitlements
    WHERE plugin_key IN ('muedsat', 'muedlim')
  `);
  const r = rows.rows[0] as { cumulative: number; day_utc: number };
  return {
    cumulative: r.cumulative,
    day_utc: r.day_utc,
    counting_since: PORTAL_REG_COUNTING_SINCE,
    note: PORTAL_REG_NOTE,
  };
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
  const [welcomeEmails, audience, dbNetNew, ownerUnionTotal, mktg, portalReg] = await Promise.all([
    fetchWelcomeEmailsForDay(DAY),
    muedspAudienceSnapshot(),
    dbShelfNetNew(DAY),
    dbOwnerUnionTotal(),
    marketingContacts(),
    portalRegistrations(DAY),
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
    // ② 全 audience unique dedup (def B・freee サインオフ)。insight Stage B (#276) が passthrough で拾う。
    // ★これは billing exposure (Resend は unsubscribed も課金対象として保持) であり "reachable な到達可能数"
    //   ではない (reachable は unsub 除外)。unsubscribed 単体は上の mued_sp_unsubscribed_total で分離可能。
    marketing_contacts_total: mktg.total,
    // ★reachable = billing exposure から unsub を除いた到達可能数。dedup と unsub 除外の数え方を1か所に
    //   閉じ込め (消費側が引き算で二重計上しない)、definition を同梱 (数え方をデータに埋める＝
    //   portal_registrations の counting_since と同思想)。北極星の分母にどちらを使うかは Chief 台帳判断。
    marketing_contacts_reachable: { count: mktg.reachable, definition: MARKETING_REACHABLE_DEFINITION },
    // ③b 北極星③ registration signal (列 0059)。cumulative=tz非依存 / day_utc=レポート全体と同 UTC 基準。
    portal_registrations: portalReg,
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
