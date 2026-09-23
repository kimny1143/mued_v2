#!/usr/bin/env tsx
/**
 * WHY A SCRIPT: only kimny reads production. This gives kimny one command to check whether
 * popup custom tags reached payload.data.tags after a FastSpring TEST order.
 *
 *   npx tsx scripts/read-fastspring-event-tags.ts [N]
 *
 * READ-ONLY: one SELECT, no transaction or writes; N defaults to 5 (1–50).
 * db/index.ts loads .env.local. Dev/Preview/Prod share one DATABASE_URL, so this reads PRODUCTION.
 * Only kimny runs it. Importing the formatter does not load the DB or execute the command.
 *
 * NO TAG VALUES LEAVE THE DB: SQL reduces data.tags to names and empty/non-empty flags.
 * The SELECT also reads event metadata and top-level live, never the whole payload or buyer fields.
 * Do not log selected rows or caught errors: either could disclose personal data.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHECKOUT_TAG_NAMES } from "../lib/masterchain/fastspring-checkout";

// Importing the route also initializes DB/fulfillment dependencies. Keep it out of this script;
// the unit test pins this literal to the route's exported SKIPPED_TEST_MARKER (with dependencies mocked).
export const SKIPPED_TEST_MARKER = "skipped: order.completed with live !== true";

type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";

export interface SelectedFastspringEvent {
  event_id: string;
  type: string;
  status: string;
  completed: boolean;
  error_message: string | null;
  created_at: string;
  live: unknown;
  tags_type: JsonType | null;
  tag_flags: Record<string, boolean> | null;
}

class LimitValidationError extends Error {
  constructor() {
    super("Expected N from 1 to 50");
    this.name = "LimitValidationError";
  }
}

export function parseLimit(args: readonly string[]): number {
  if (args.length === 0) return 5;
  if (args.length !== 1 || !/^[0-9]+$/.test(args[0])) throw new LimitValidationError();
  const limit = Number(args[0]);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new LimitValidationError();
  return limit;
}

/** Only identifier-shaped name/code fields may leave an error; never its message or stack. */
export function summarizeError(error: unknown): string {
  const parts = ["FAILED — no data was read; no report produced"];
  if (error !== null && typeof error === "object") {
    for (const key of ["name", "code"] as const) {
      const value = (error as Record<string, unknown>)[key];
      if (typeof value === "string" && /^[A-Za-z0-9_]{1,64}$/.test(value)) {
        parts.push(`${key}=${value}`);
      }
    }
  }
  if (error instanceof LimitValidationError) parts.push("expected N: 1–50");
  return parts.join("; ");
}

export function eventState(row: SelectedFastspringEvent) {
  if (row.status === "processing" && row.completed === true && row.error_message === SKIPPED_TEST_MARKER) {
    return "skipped (terminal)";
  }
  if (row.status === "processing" && row.completed === false) return "stuck (processing, not completed)";
  if (row.status === "processed") return "processed";
  if (row.status === "failed") return "failed";
  if (row.status === "processing" && row.completed === true && row.error_message !== SKIPPED_TEST_MARKER) {
    return "processing (completed, unexpected marker)";
  }
  return "unknown";
}

/** Pure, value-free report from already-selected rows. Never stringify a row, tags, or errors. */
export function formatFastspringEventTags(rows: readonly SelectedFastspringEvent[]): string {
  if (rows.length === 0) return "rows: 0 — no fastspring webhook event recorded";
  const events = rows.map((row) => {
    // jsonb_object_agg returns NULL for an empty object; tags_type keeps it distinct from missing.
    const tags = row.tags_type === "object" ? row.tag_flags ?? {} : null;
    const names = tags ? Object.keys(tags).sort() : [];
    const absent = CHECKOUT_TAG_NAMES.filter((name) => !names.includes(name));
    const tagSummary = row.tags_type === null
      ? "MISSING"
      : tags
        ? names.map((name) => `${JSON.stringify(name)}=${tags[name] ? "non-empty" : "empty"}`).join(", ") || "{}"
        : `INVALID (${row.tags_type})`;
    // Reject malformed live contents instead of printing arbitrary payload data.
    const live = typeof row.live === "boolean" ? String(row.live) : row.live == null ? "MISSING" : "INVALID";
    return [
      `event_id: ${JSON.stringify(row.event_id)}`,
      `type: ${JSON.stringify(row.type)}`,
      `status: ${JSON.stringify(row.status)}`,
      `state: ${eventState(row)}`,
      `skipped_test: ${row.error_message === SKIPPED_TEST_MARKER}`,
      `created_at (UTC): ${row.created_at}`,
      `live: ${live}`,
      `tags: ${tagSummary}`,
      `absent CHECKOUT_TAG_NAMES: ${absent.join(", ") || "NONE"}`,
    ].join("\n");
  });
  return [`rows: ${rows.length}`, ...events].join("\n\n");
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  // Lazy imports keep unit-test imports read-free and put initialization failures in the catch below.
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../db");
  const query = sql`
    SELECT event_id, type, status, error_message,
           completed_at IS NOT NULL AS completed,
           created_at::text AS created_at,
           payload->'live' AS live,
           jsonb_typeof(payload->'data'->'tags') AS tags_type,
           CASE WHEN jsonb_typeof(payload->'data'->'tags') = 'object' THEN
             (SELECT jsonb_object_agg(k, NOT (v = 'null'::jsonb OR v = '""'::jsonb OR v = '{}'::jsonb OR v = '[]'::jsonb))
                FROM jsonb_each(payload->'data'->'tags') AS t(k, v))
           END AS tag_flags
    FROM webhook_events
    WHERE source = 'fastspring'
    ORDER BY created_at DESC, event_id DESC
    LIMIT ${limit}
  `;
  // JST measured immediately before the read. created_at is a timestamp without time zone,
  // written as UTC wall time; SQL ::text prevents driver timezone reinterpretation.
  const measuredAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });
  const result = await db.execute(query);
  const report = formatFastspringEventTags(result.rows as unknown as SelectedFastspringEvent[]);
  console.log(`measured_at (JST): ${measuredAt}\n${report}`);
}

export function isEntryPoint(entryPath: string | undefined): boolean {
  if (!entryPath) return false;
  try {
    return realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint(process.argv[1])) {
  main().then(() => process.exit(0)).catch((error: unknown) => {
    // Fail loudly, without exposing errors that may contain SQL parameters or connection secrets.
    console.error(summarizeError(error));
    process.exit(1);
  });
}
