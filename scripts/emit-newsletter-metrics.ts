#!/usr/bin/env tsx
/**
 * Write `newsletter-metrics.json` (schema newsletter-metrics/v1) for gw-dash's "メール" tab.
 *
 * Usage (from the plugin-funnel-collector step, which already has RESEND_API_KEY):
 *   npx tsx scripts/emit-newsletter-metrics.ts <out.json>
 *
 * Covers broadcasts sent to the MUEDsp segment from the launch broadcast (LAUNCH_AT) on.
 * Per broadcast: totals (/emails/metrics dimensions=broadcast), hourly (dimensions=period,
 * granularity=hourly, the 25 hours after sending), clicked links (/broadcasts/{id}/clicked-links),
 * subject (/broadcasts/{id}). ★A failed sub-request becomes null + a note, never 0. ★Only a failed
 * broadcast LIST fails the whole run (then nothing is written and the old file stays).
 *
 * ★The shaping lives in lib/funnel/newsletter-metrics.ts (unit-tested); this file is plumbing.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { MUEDSP_AUDIENCE_ID } from "../lib/plugins/registry";
import { LAUNCH_AT } from "../lib/funnel/launch";
import {
  parseResendTime,
  toNewsletterMetrics,
  type BroadcastInput,
  type ClickedLinkRow,
  type HourlyRow,
  type TotalsRow,
} from "../lib/funnel/newsletter-metrics";

const outPath = process.argv[2];
const key = process.env.RESEND_API_KEY;
if (!outPath || !key) {
  console.error("usage: RESEND_API_KEY=… tsx scripts/emit-newsletter-metrics.ts <out.json>");
  process.exit(2); // ★2 = could not run (repo convention).
}
const H = { Authorization: `Bearer ${key}` };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resend allows a few requests per second; a short gap keeps a growing list of broadcasts under it.
async function get<T>(path: string): Promise<{ ok: true; body: T } | { ok: false; reason: string }> {
  await sleep(300);
  try {
    const r = await fetch(`https://api.resend.com${path}`, { headers: H });
    const text = await r.text();
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    return { ok: true, body: JSON.parse(text) as T };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.name : "fetch failed" };
  }
}

interface ListedBroadcast {
  id: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  audience_id?: string | null;
  segment_id?: string | null;
}

async function main() {
  const nowMs = Date.now();
  // LAUNCH_AT null = not launched yet → no lower bound (every MUEDsp broadcast).
  const launchMs = LAUNCH_AT ? Date.parse(LAUNCH_AT) : Number.NEGATIVE_INFINITY;

  const listed: ListedBroadcast[] = [];
  let after: string | null = null;
  for (let page = 0; ; page++) {
    const path: string = `/broadcasts?limit=100${after ? `&after=${after}` : ""}`;
    const res = await get<{ data: ListedBroadcast[]; has_more: boolean }>(path);
    if (!res.ok) {
      console.error(`[newsletter-metrics] broadcast list failed: ${res.reason}`);
      process.exit(1);
    }
    listed.push(...res.body.data);
    const last: ListedBroadcast | undefined = res.body.data[res.body.data.length - 1];
    if (!res.body.has_more || !last) break;
    if (page === 19) {
      console.error("[newsletter-metrics] broadcast list has_more after 20 pages — refusing to write a partial file");
      process.exit(1);
    }
    after = last.id;
  }

  const targets = listed.filter(
    (b): b is ListedBroadcast & { sent_at: string } =>
      b.status === "sent" &&
      typeof b.sent_at === "string" &&
      (b.segment_id ?? b.audience_id) === MUEDSP_AUDIENCE_ID &&
      // ★Launch broadcast included: LAUNCH_AT is its sent_at to the millisecond, Resend's has µs.
      parseResendTime(b.sent_at) >= launchMs - 1000,
  );

  const inputs: BroadcastInput[] = [];
  for (const b of targets) {
    const errors: string[] = [];
    const sentMs = parseResendTime(b.sent_at);
    const hourStart = new Date(Math.floor(sentMs / 3_600_000) * 3_600_000);

    const detail = await get<{ subject?: string | null }>(`/broadcasts/${b.id}`);
    if (!detail.ok) errors.push(`件名は取れなかった（${detail.reason}）`);

    const totalsRes = await get<{ data?: Array<TotalsRow & { broadcast_id?: string }> }>(
      `/emails/metrics?${new URLSearchParams({
        dimensions: "broadcast",
        broadcast_id: b.id,
        metrics: "sent,delivered,bounced,bounced_transient,bounced_permanent,suppressed,unique_opened,unique_clicked,unsubscribed,complained",
        start_date: hourStart.toISOString(),
        end_date: new Date(nowMs).toISOString(),
      })}`,
    );
    let totals: TotalsRow | null = null;
    if (!totalsRes.ok) errors.push(`合計は取れなかった（${totalsRes.reason}）`);
    else {
      totals = totalsRes.body.data?.find((row) => row.broadcast_id === b.id) ?? null;
      if (!totals) errors.push("合計の行が Resend の応答に無かった");
    }

    const hourlyRes = await get<{ data?: HourlyRow[] }>(
      `/emails/metrics?${new URLSearchParams({
        dimensions: "period",
        granularity: "hourly",
        broadcast_id: b.id,
        metrics: "unique_opened,unique_clicked,unsubscribed",
        start_date: hourStart.toISOString(),
        end_date: new Date(Math.min(nowMs, hourStart.getTime() + 25 * 3_600_000)).toISOString(),
      })}`,
    );
    if (!hourlyRes.ok) errors.push(`時間帯は取れなかった（${hourlyRes.reason}）`);

    const linksRes = await get<{ data?: ClickedLinkRow[]; has_more?: boolean }>(`/broadcasts/${b.id}/clicked-links`);
    if (!linksRes.ok) errors.push(`リンク別は取れなかった（${linksRes.reason}）`);
    else if (linksRes.body.has_more) errors.push("リンク別は 1 ページ目だけ（Resend が has_more を返した）");

    inputs.push({
      broadcast: { id: b.id, name: b.name, subject: detail.ok ? (detail.body.subject ?? null) : null, sent_at: b.sent_at },
      totals,
      hourly: hourlyRes.ok ? (hourlyRes.body.data ?? []) : null,
      links: linksRes.ok ? (linksRes.body.data ?? []) : null,
      errors,
    });
  }

  const metrics = toNewsletterMetrics(
    inputs,
    nowMs,
    "Resend API（/emails/metrics・/broadcasts/{id}/clicked-links）。plugin-funnel-collector が毎朝書き出す（mued_v2 scripts/emit-newsletter-metrics.ts）。",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(`→ newsletter metrics: ${outPath} (${metrics.broadcasts.length} broadcasts, ${metrics.notes.length} notes)`);
}

main().catch((e) => {
  console.error(`[newsletter-metrics] failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
