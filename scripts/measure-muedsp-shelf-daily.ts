#!/usr/bin/env tsx
/**
 * MUEDsp 棚別（MUEDsat / MUEDlim）日次 DL welcome 実数 — Chief「棚別実数 正式初観測」用。
 *
 * 背景: 2026-07-16 Resend quota incident 時の棚別実数（MUEDsat 12 / MUEDlim 9 delivered）は
 * quota 枯渇後の truncated 値。kimny の $20 Pro upgrade 後、quota 非制約の clean full-day を1本
 * 計測して Chief の「正式初観測値」に差し替える段取り（conductor 2026-07-16 依頼）。
 *
 * データ源 = Resend `GET /emails`（authoritative・welcome subject "[MUEDsat/MUEDlim] Your
 * download link" で棚別）。local .env.local の RESEND_API_KEY = prod team key。
 *
 * 使い方:
 *   npx tsx scripts/measure-muedsp-shelf-daily.ts                 # 直近 UTC 完全1日（昨日 00:00〜今日 00:00 UTC）
 *   npx tsx scripts/measure-muedsp-shelf-daily.ts 2026-07-17      # 指定 UTC 日（00:00〜23:59:59 UTC）
 *
 * ★実行タイミング: Pro upgrade（2026-07-16 ~04:00 UTC）後の最初の完全 UTC 日 = 2026-07-17。
 *   → 2026-07-18 00:00 UTC 以降に `... 2026-07-17` で実行すれば quota 非制約の clean full-day。
 *   （incident 診断法の全体は memory: reference-resend-quota-incident-playbook）
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RESEND_API_KEY;
if (!KEY) {
  console.error("RESEND_API_KEY missing (.env.local)");
  process.exit(1);
}
const H = { Authorization: `Bearer ${KEY}` };

// Target UTC day: arg "YYYY-MM-DD", else yesterday (last complete UTC day) relative to the arg-free run.
// (No Date.now() in workflow scripts, but this is a plain tsx CLI — Date is fine here.)
const arg = process.argv[2];
function utcDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
const DAY = arg || utcDay(-1); // default = yesterday UTC (last complete day)

type Email = { id: string; to?: string[]; subject?: string; last_event?: string; created_at?: string };

function shelf(subject?: string): "muedsat" | "muedlim" | "other" {
  const s = subject || "";
  if (/MUEDsat/.test(s) && /download/i.test(s)) return "muedsat";
  if (/MUEDlim/.test(s) && /download/i.test(s)) return "muedlim";
  return "other";
}

async function main() {
  // Paginate most-recent-first until we pass the start of the target day.
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
    if (!b.has_more || oldest < DAY) break;
    const last = data[data.length - 1];
    url = last ? `https://api.resend.com/emails?limit=100&after=${last.id}` : null;
  }

  const day = all.filter((e) => (e.created_at || "").startsWith(DAY));
  const report: Record<string, { total: number; delivered: number; bounced: number; other: number; uniq: Set<string> }> = {
    muedsat: { total: 0, delivered: 0, bounced: 0, other: 0, uniq: new Set() },
    muedlim: { total: 0, delivered: 0, bounced: 0, other: 0, uniq: new Set() },
  };
  for (const e of day) {
    const sh = shelf(e.subject);
    if (sh === "other") continue;
    const row = report[sh];
    row.total++;
    if (e.last_event === "delivered") row.delivered++;
    else if (e.last_event === "bounced") row.bounced++;
    else row.other++;
    (e.to || []).forEach((t) => row.uniq.add(t.toLowerCase()));
  }

  console.log(`\n=== MUEDsp 棚別 日次 DL welcome 実数 — UTC ${DAY} (fetched ${all.length} objects / ${pages} page(s)) ===`);
  for (const sh of ["muedsat", "muedlim"] as const) {
    const r = report[sh];
    console.log(
      `${sh.toUpperCase().padEnd(8)} sent=${r.total}  delivered=${r.delivered}  bounced=${r.bounced}  other=${r.other}  unique_recipients=${r.uniq.size}`,
    );
  }
  const totDeliv = report.muedsat.delivered + report.muedlim.delivered;
  console.log(`TOTAL welcome delivered: ${totDeliv} (MUEDsat ${report.muedsat.delivered} / MUEDlim ${report.muedlim.delivered})`);
  console.log(`\n(参照元: Resend /emails subject split — welcome "[MUEDsat/MUEDlim] Your download link" のみ。非 welcome/alert 除外。)`);
  console.log(`(Chief 正式初観測用: Pro upgrade 後の clean full-day か確認 — 502 quota-block はこの delivered には現れない=別途 Vercel logs で 0 確認推奨。)`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(String(e));
  process.exit(1);
});
