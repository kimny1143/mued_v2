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
 *   - marketing_contacts_total (②): 全 audience union の distinct email (billing exposure・CFO 指標)。
 *     ★muedsp_reachable = 北極星線 (MUEDsp セグメントのみ・unsub 除外・kimny 7/18 批准スコープ)。
 *     marketing_contacts_reachable = org 全体リーチ (別行・AND 保守側)。各 definition 同梱。
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
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
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
// ★Derived from the registry, NOT a local list. This file used to redeclare
//   `type PluginKey = "muedsat" | "muedlim"` — a SECOND definition that tsc could never reconcile
//   with lib/plugins/registry.ts, so MUEDrive shipped (2026-08-27) counting zero here while the
//   type checker stayed green. Adding a 4th module must not require editing this file.
const PLUGIN_KEYS = Object.keys(PLUGIN_DIST) as PluginKey[];

// ★Welcome-email subjects, both locales (lib/services/email.service.ts):
//     JA "[MUEDsat] ダウンロードリンクをお届けします" / "MUEDlim のダウンロードリンクです"
//     EN "[MUEDsat] Your download link"              / "Your MUEDlim download link"
// ★The old guard was `/download/i`, which NO Japanese subject contains — every JA welcome was
//   filed as "other" from the day this collector started. That is an undercount of the JA side of
//   the email shelf, not a MUEDrive-only problem. Match either language's word.
// ★消費側へ同梱する分類規則。★数え方が変わった日を、値の変化と区別できるようにするため。
//   2026-08-28 まで: /download/i のみ → ★JA の件名に "download" が無く、JA の welcome は全部 "other"。
const SHELF_DEFINITION =
  'welcome email を件名で分類。件名が /download|ダウンロード/i に一致し、かつ registry の plugin key ' +
  '(大小無視) を含むものをその製品の棚へ。どちらも満たさなければ "other"。' +
  '★2026-08-28 以前は /download/i のみだったため、日本語件名の welcome は全て "other" に落ちていた。';

// ★合成行（smoke test / 動作確認）を集計から外す述語。★正本は insight課 の設計 doc
//   `reports/plugin-funnel-automation-design-20260718.md` §10（2026-08-28 合意）。
//   ★経緯: 2026-08-28 の MUEDrive ローンチ検証で本番フォームを2回 通した。★うち1件は解除にメール内
//   トークンが要り、その受信箱に到達できないため★行を消せない。∴ 述語で外すしかない。
//   ★次に smoke を撃つ人は source='smoke-test' を使うこと（doc §10 が正本）。
const SYNTHETIC_SOURCE = "smoke-test";

const DOWNLOAD_RE = /download|ダウンロード/i;

function shelf(subject?: string): PluginKey | "other" {
  const s = subject || "";
  if (!DOWNLOAD_RE.test(s)) return "other";
  // Subjects carry the display name ("MUEDsat"), the registry carries the key ("muedsat").
  const hit = PLUGIN_KEYS.find((k) => new RegExp(k, "i").test(s));
  return hit ?? "other";
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
 * marketing_contacts の3系列を1度の走査で出す。★スコープが北極星定義と一致するかが肝 (Chief 検出・
 * 2026-07-23): kimny 批准の北極星分母は「MUEDsp セグメント10,000人」(brief-road-to-10k-20260718 L4) で
 * あって union(MUEDsp+General) ではない。General を混ぜると非プラグイン契約で北極星が膨らむ (同 brief L31
 * の「転換不能な分母で 10k の見かけを膨らませる」と同型)。ゆえに3系列を明確に分ける:
 *  - total          = 全 audience union の distinct email (unsub 含む＝billing exposure・CFO 指標)。
 *  - muedspReachable = ★北極星線。MUEDsp セグメントのみ・unsubscribed=false・distinct。単一スコープゆえ
 *                      OR/AND の問い自体が無い。
 *  - reachableUnionAnd = org 全体リーチ (北極星でない別行)。Chief 裁定で AND=保守側 (どこか1つの audience
 *                      でも解除なら除外=どの audience でも解除されていない email のみ)。
 * 数え方は各 definition フィールドに同梱 (消費側が引き算せず取り違えない)。
 * accuracy guard: audience 一覧 or 各 audience contacts が has_more なら過小集計→abort。
 */
async function marketingContacts(): Promise<{ total: number; muedspReachable: number; reachableUnionAnd: number }> {
  const listRes = await fetch("https://api.resend.com/audiences", { headers: H });
  const listText = await listRes.text();
  if (!listRes.ok) throw new Error(`audiences list ${listRes.status}: ${listText.slice(0, 160)}`);
  const listBody = JSON.parse(listText) as { data?: Array<{ id: string }>; has_more?: boolean };
  if (listBody.has_more) {
    throw new Error("audiences list has_more=true — >100 audiences, pagination未実装ゆえabort.");
  }
  const ids = (listBody.data ?? []).map((a) => a.id);
  const allEmails = new Set<string>();
  const unsubAnywhere = new Set<string>();       // >=1 audience で unsubscribed=true な email
  const muedspReachableSet = new Set<string>();  // MUEDsp segment で subscribed な email (北極星スコープ)
  for (const id of ids) {
    for (const c of await audienceContacts(id)) {
      allEmails.add(c.email);
      if (c.unsubscribed) unsubAnywhere.add(c.email);
      if (id === MUEDSP_AUDIENCE_ID && !c.unsubscribed) muedspReachableSet.add(c.email);
    }
  }
  let reachableUnionAnd = 0;
  for (const email of allEmails) if (!unsubAnywhere.has(email)) reachableUnionAnd++;
  return { total: allEmails.size, muedspReachable: muedspReachableSet.size, reachableUnionAnd };
}

const MUEDSP_REACHABLE_DEFINITION =
  "MUEDsp segment only; unsubscribed=false; unique. ★North-star denominator (kimny ratified 2026-07-18: 北極星=MUEDsp セグメント10,000人). Single scope → no OR/AND question.";
const MARKETING_REACHABLE_DEFINITION =
  "union across all audiences (currently MUEDsp+General); reachable = NOT unsubscribed in ANY audience (AND/conservative, Chief ruling 2026-07-23). Org-wide reach — NOT the north-star. total (marketing_contacts_total) = billing exposure incl. unsubscribed.";

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
    -- ★DELIBERATELY still the two original modules. Adding MUEDrive here would change what this
    -- number MEANS (it is a denominator carried across a time series), not fix a bug — unlike the
    -- per-plugin breakdown above, which was simply blind to a third product. Whether the
    -- denominator should widen is insight課's call; asked 2026-08-28, unanswered at time of writing.
    WHERE plugin_key IN ('muedsat', 'muedlim')
      -- ★合成行の除外。★今日この行は値を変えない（既知の smoke 行は plugin_key='muedrive' で、
      --   この WHERE は既にそれを外している）。★(b) で分母が3製品へ広がった日に効く。
      AND source <> ${SYNTHETIC_SOURCE}
  `);
  const r = rows.rows[0] as { cumulative: number; day_utc: number };
  return {
    cumulative: r.cumulative,
    day_utc: r.day_utc,
    counting_since: PORTAL_REG_COUNTING_SINCE,
    note: PORTAL_REG_NOTE,
  };
}

// ★The array goes after IN, never after ANY(. drizzle expands a JS array into the row expression
//   `($1, $2, $3)`: valid to the right of IN, invalid to the right of ANY( — Postgres answers
//   `op ANY/ALL (array) requires array on right side (42809)`. Hit on 2026-08-28 in #903; main's
//   collector was broken until a manual dispatch executed it. tsc/unit/lint/build all stayed green
//   because none of them run SQL. The shape is guarded by tests/unit/collector-sql-shape.test.ts.
//
// ★This note lives OUT here, above the query, and not inside the sql`` template — which was the
//   second bug of the same afternoon. A `--` line inside a template literal is a comment to
//   Postgres but NOT to JavaScript; the template is parsed by JS first, and prose written for
//   humans is parsed along with it.
//
//   ★The rule is NOT "avoid ${" — that was the first diagnosis and it is too narrow. Measured
//   with node --check across four variants (product課, reviewing #907; reproduced here):
//
//       -- use `IN ${keys}` not ANY     ← backtick + interpolation   ★parse FAILS
//       -- use IN ${keys} not ANY       ← interpolation only          parses (fails at RUNTIME)
//       -- use `IN` not ANY             ← ★backtick only              ★parse FAILS
//       -- use IN not ANY               ← neither (control)           parses
//
//   ★A backtick CLOSES the template on the spot, so whatever follows becomes bare code. That is
//   what produced `Expected ")" but found "IN"`. Following "no ${" to the letter still lets the
//   third line through. ★The rule that actually holds: put no prose inside a sql`` template —
//   no backticks, no ${. Explanations go above the function, as this one does.
async function dbShelfNetNew(day: string): Promise<Record<PluginKey, number>> {
  const rows = await db.execute(sql`
    SELECT plugin_key, count(*)::int AS cnt
    FROM plugin_entitlements
    WHERE created_at::date = ${day}::date
      AND plugin_key IN ${PLUGIN_KEYS}
      AND source <> ${SYNTHETIC_SOURCE}
    GROUP BY plugin_key
  `);
  // ★Zero-filled from the registry so a module with no signups still reports 0 rather than being
  //   absent — an absent key and a real zero are not the same thing downstream.
  const out = Object.fromEntries(PLUGIN_KEYS.map((k) => [k, 0])) as Record<PluginKey, number>;
  for (const r of rows.rows as Array<{ plugin_key: PluginKey; cnt: number }>) {
    out[r.plugin_key] = r.cnt;
  }
  return out;
}

async function dbOwnerUnionTotal(): Promise<number> {
  const rows = await db.execute(sql`
    SELECT count(DISTINCT lower(trim(email)))::int AS cnt
    FROM plugin_entitlements
    -- ★DELIBERATELY still the two original modules. Adding MUEDrive here would change what this
    -- number MEANS (it is a denominator carried across a time series), not fix a bug — unlike the
    -- per-plugin breakdown above, which was simply blind to a third product. Whether the
    -- denominator should widen is insight課's call; asked 2026-08-28, unanswered at time of writing.
    WHERE plugin_key IN ('muedsat', 'muedlim')
      -- ★合成行の除外。★今日この行は値を変えない（既知の smoke 行は plugin_key='muedrive' で、
      --   この WHERE は既にそれを外している）。★(b) で分母が3製品へ広がった日に効く。
      AND source <> ${SYNTHETIC_SOURCE}
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

  // ★PLUGIN_KEYS から zero-fill で建てる。手書きの2キーを置くと、shelf() が3値を返すようになった
  //   瞬間に shelfEmail["muedrive"] が undefined になり、★MUEDrive の welcome が1通 delivered された
  //   日に収集器ごと落ちる（product課 が #903 レビューで実測: TypeError reading 'delivered'）。
  //   ★この file は tsconfig の exclude に入っている（`scripts/**/*`）ので Record<PluginKey,…> は
  //   ★型検査を受けない＝注釈は装飾。守るのは注釈ではなく「registry から建てる」という構造の方。
  const shelfEmail: Record<PluginKey, { delivered: number; bounced: number; other: number }> =
    Object.fromEntries(
      PLUGIN_KEYS.map((k) => [k, { delivered: 0, bounced: 0, other: 0 }]),
    ) as Record<PluginKey, { delivered: number; bounced: number; other: number }>;
  for (const e of welcomeEmails) {
    const sh = shelf(e.subject);
    if (sh === "other") continue;
    if (e.last_event === "delivered") shelfEmail[sh].delivered++;
    else if (e.last_event === "bounced") shelfEmail[sh].bounced++;
    else shelfEmail[sh].other++;
  }

  // anomaly signal: DB純増(権威) > email delivered なら「DLは成立したがwelcome email失敗」を示唆。
  const anomalies: string[] = [];
  for (const sh of PLUGIN_KEYS) {
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
      welcome_delivered_total: PLUGIN_KEYS.reduce((n, k) => n + shelfEmail[k].delivered, 0),
      broadcast: null, // v1未収集。broadcast送信日のみ別途pull（follow-up）。
    },
    shelf: Object.fromEntries(
      PLUGIN_KEYS.map((k) => [
        k,
        { db_net_new: dbNetNew[k], email_delivered: shelfEmail[k].delivered, email_bounced: shelfEmail[k].bounced },
      ]),
    ),
    // ★継ぎ目の印。shelf の分類規則を毎回 同梱する（他の指標が definition を同梱しているのと同じ形）。
    //   これが無いと、2026-08-28 の分類修正で JA の welcome が `other` から各製品へ移ったことが、
    //   ★読む人には「other の急減」に見える。値の変化と、数え方の変化を、消費側が区別できるように。
    shelf_definition: SHELF_DEFINITION,
    db_owner_union_total: ownerUnionTotal,
    // ② 全 audience unique dedup (def B・freee サインオフ)。insight Stage B (#276) が passthrough で拾う。
    // ★これは billing exposure (Resend は unsubscribed も課金対象として保持) であり "reachable な到達可能数"
    //   ではない (reachable は unsub 除外)。unsubscribed 単体は上の mued_sp_unsubscribed_total で分離可能。
    marketing_contacts_total: mktg.total,
    // ★北極星線 = MUEDsp セグメントの到達可能数 (kimny 7/18 批准スコープ)。ダッシュボードの 10k 分母はこれ。
    muedsp_reachable: { count: mktg.muedspReachable, definition: MUEDSP_REACHABLE_DEFINITION },
    // org 全体リーチ (北極星でない別行・Chief 裁定で AND=保守側)。dedup と unsub 除外の数え方を collector に
    //   閉じ込め (消費側が引き算で二重計上しない)、definition を同梱。
    marketing_contacts_reachable: { count: mktg.reachableUnionAnd, definition: MARKETING_REACHABLE_DEFINITION },
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

/**
 * Strip credentials from anything we print. The driver's cause can carry the connection DSN, and
 * GitHub Actions masking only hides strings that match a secret VERBATIM — a percent-encoded password
 * (`%40` for `@`, etc.) inside a DSN would sail straight through into the log.
 */
function redact(s: string): string {
  return s.replace(/(postgres(?:ql)?:\/\/[^:@\s/]+:)[^@\s]+(@)/gi, "$1***$2");
}

/**
 * Render one link of the chain. `String(x)` gives "[object Object]" for the plain objects these
 * drivers actually throw (observed: a bad host produced exactly that), which is no more diagnosable
 * than the bare message this whole block exists to replace — so pull the fields that identify a
 * failure (code / errno / syscall / hostname) and fall back to JSON before giving up.
 */
function describeError(err: unknown): string {
  if (err instanceof Error) {
    const extra = ["code", "errno", "syscall", "hostname"]
      .map((k) => [k, (err as unknown as Record<string, unknown>)[k]] as const)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${String(v)}`);
    return `${err.name}: ${err.message}${extra.length ? ` (${extra.join(" ")})` : ""}`;
  }
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    const named = ["message", "code", "errno", "syscall", "hostname", "reason"]
      .map((k) => [k, rec[k]] as const)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${String(v)}`);
    if (named.length) return named.join(" ");
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      /* circular or non-serialisable — fall through */
    }
    const ctor = (err as { constructor?: { name?: string } }).constructor?.name;
    return ctor ? `<${ctor} with no readable fields>` : "<object with no readable fields>";
  }
  return String(err);
}

main().then(() => process.exit(0)).catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[aggregate-plugin-funnel-daily] fatal: ${redact(msg)}`);

  // ★ Print the cause chain. drizzle/neon wrap the driver error, so `e.message` alone is just
  // "Failed query: SELECT …" — it does NOT say whether the query was rejected for authentication,
  // for permissions, or for connectivity. Those need completely different fixes, and this runs
  // unattended: without the cause, a failure is visible but not diagnosable, and whoever picks it
  // up has to reproduce it by hand against prod to find out why.
  //
  // Observed 2026-07-25 (run 30149602277): the collector failed on the first query after switching
  // to the read-only role, and the log showed only the SQL. The actual reason (a password mismatch
  // in DATABASE_URL_READONLY — the role's own GRANTs were correct) had to be established by
  // separately querying has_table_privilege() against prod.
  // Walk BOTH links: `.cause` (drizzle/neon wrapping a driver error) and `AggregateError.errors`
  // (undici/neon surface connection failures — ECONNREFUSED / ENOTFOUND / TLS — as an AggregateError
  // whose reasons live in `.errors`, NOT `.cause`). Following only `.cause` printed nothing at all for
  // exactly the connectivity case this is supposed to distinguish.
  const MAX_DEPTH = 5;
  let truncated = false;
  const seen = new Set<unknown>(); // cause graphs can loop back on themselves
  const walk = (err: unknown, depth: number): void => {
    if (err === undefined || err === null || seen.has(err)) return;
    if (depth > MAX_DEPTH) {
      truncated = true;
      return;
    }
    seen.add(err);
    console.error(`[aggregate-plugin-funnel-daily]   caused by (${depth}): ${redact(describeError(err))}`);
    // Duck-typed, not `instanceof`: the wrapper is not always a real AggregateError/Error, and an
    // instanceof check would silently skip the links that carry the reason.
    const rec = err as { errors?: unknown; cause?: unknown };
    if (Array.isArray(rec?.errors)) for (const sub of rec.errors) walk(sub, depth + 1);
    if (rec?.cause !== undefined) walk(rec.cause, depth + 1);
  };
  const root = e as { errors?: unknown; cause?: unknown };
  if (Array.isArray(root?.errors)) for (const sub of root.errors) walk(sub, 1);
  if (root?.cause !== undefined) walk(root.cause, 1);
  if (truncated) {
    // Say it rather than stopping quietly — a silently shortened chain reads like the end of the chain.
    console.error(`[aggregate-plugin-funnel-daily]   … cause chain truncated at depth ${MAX_DEPTH}`);
  }

  // ★ NOT process.exit(1): on macOS, stderr to a pipe is ASYNC, so exiting immediately can discard the
  // very lines printed above — and the case that needs them most is a human reproducing this locally
  // with `| tee`. (CI on ubuntu pipes synchronously, so it would never have shown up there.) Setting
  // exitCode lets the buffers drain and the process end on its own.
  process.exitCode = 1;
  // Backstop so an unattended run can never hang on a live driver handle. unref'd: it does not hold the
  // loop open by itself, but it still fires if something else is holding it.
  setTimeout(() => process.exit(1), 5000).unref();
});
