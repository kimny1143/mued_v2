/**
 * Seed / replenish open availability for the MUED advisory free 60-min 壁打ち.
 *
 * WHY THIS EXISTS
 * ---------------
 * `advisory_slots` is "curated fixed availability the operator (kimny) seeds" (db/schema/advisory.ts).
 * The booking modal only renders its form when GET /api/advisory/slots returns >0 OPEN, FUTURE slots;
 * with an empty list the whole LP dead-ends on "現在ご案内できる空き枠がありません" and NO ONE can book.
 * Until now slots were hand-written SQL, so once the seeded batch elapsed the storefront silently
 * stopped accepting bookings (the 2026-07 regression). This script is the missing operator tool:
 * generate a batch of future slots, review them in a dry-run, then commit.
 *
 * TIMEZONE (read this before committing)
 * --------------------------------------
 * You give times as JST wall-clock. The app runs on Vercel (UTC) and renders each slot with
 * `Intl.DateTimeFormat(..., { timeZone: 'Asia/Tokyo' })`, so what must be stored is the absolute
 * instant (JST − 9h). We build every instant with `Date.UTC(...)` so the value is correct no matter
 * what timezone the seeding machine is in. The dry-run prints, per slot:
 *   intended JST  |  stored (UTC/ISO)  |  what the app will display (Asia/Tokyo)
 * The last column is what the booker sees — confirm it equals the intended JST before --commit.
 *
 * SAFETY
 * ------
 *   - DRY-RUN BY DEFAULT. Nothing is written without --commit.
 *   - `.env.local` DATABASE_URL points at PROD Neon, so `--commit` writes to production. Prod DB
 *     writes are kimny専管 — only run --commit with explicit kimny/conductor authorization.
 *   - Idempotent: a slot whose start_time already exists is skipped (safe to re-run / overlap batches).
 *   - After --commit it reads the rows back and (when run under TZ=UTC, mirroring Vercel) asserts the
 *     Asia/Tokyo render matches what you intended, aborting the summary as FAILED on any mismatch.
 *
 * USAGE
 * -----
 *   # explicit JST datetimes (full control over exactly when you're available) — PRIMARY:
 *   npx tsx scripts/seed-advisory-slots.ts --slots "2026-07-08 20:00, 2026-07-11 15:00"
 *   # recurring standing pattern (STANDING_AVAILABILITY below) up to a bounded end date:
 *   npx tsx scripts/seed-advisory-slots.ts --recur --until 2026-10-09
 *   # actually write (kimny-gated). Run under UTC so the read-back check mirrors Vercel:
 *   TZ=UTC npx tsx scripts/seed-advisory-slots.ts --slots "2026-07-08 20:00" --commit
 *
 * FLAGS
 *   --slots "<jst>,<jst>,..."   explicit JST datetimes ("YYYY-MM-DD HH:mm")
 *   --recur                     generate from STANDING_AVAILABILITY
 *   --weeks N                   recur horizon in weeks (default 3; ignored if --until given)
 *   --until YYYY-MM-DD          recur horizon end date (JST, inclusive) — bounds a fixed campaign
 *   --duration N                slot length in minutes (default 60)
 *   --commit                    perform the writes (omit = dry-run)
 */
import { config } from "dotenv";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "../db";
import { advisorySlots } from "../db/schema";

config({ path: ".env.local" });

const JST_OFFSET_HOURS = 9;
const DEFAULT_DURATION_MIN = 60;
const DEFAULT_WEEKS = 3;

/**
 * Standing weekly availability, used only with --recur. Times are JST wall-clock. EDIT THIS to your
 * real recurring hours — an empty list forces you to pass explicit --slots (no accidental auto-book).
 * weekday: 0=Sun … 6=Sat.
 *
 * Current (kimny, 2026-07 → early Oct): Tue/Wed/Thu 10:00–16:00 JST, 60-min slots, 12:00 lunch
 * excluded → 5 slots/day at 10 / 11 / 13 / 14 / 15. kimny keeps these windows free (recurring cadence
 * chosen with auto-book understood). Pair --recur with --until 2026-10-09 to bound the 3-month horizon.
 */
const STANDING_AVAILABILITY: Array<{ weekday: number; hour: number; minute: number }> = [2, 3, 4].flatMap(
  (weekday) => [10, 11, 13, 14, 15].map((hour) => ({ weekday, hour, minute: 0 })),
);

/** JST wall-clock → the absolute instant, independent of the machine's local timezone. */
function jstToInstant(y: number, mo1: number, d: number, hh: number, mm: number): Date {
  // Date.UTC treats args as UTC; subtract the JST offset to get the true instant for a JST wall-clock.
  return new Date(Date.UTC(y, mo1 - 1, d, hh - JST_OFFSET_HOURS, mm, 0, 0));
}

const JST_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
/** How the app will render this instant to the booker (Asia/Tokyo). */
function renderJst(instant: Date): string {
  // en-CA yields "YYYY-MM-DD, HH:mm" — normalise to "YYYY-MM-DD HH:mm".
  return JST_FMT.format(instant).replace(",", "").replace(/‎/g, "");
}

function parseJstLiteral(literal: string): { intended: string; start: Date } {
  const m = literal.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Bad JST datetime "${literal}" — expected "YYYY-MM-DD HH:mm"`);
  const [, y, mo, d, hh, mm] = m.map(Number) as unknown as number[];
  const start = jstToInstant(y, mo, d, hh, mm);
  return { intended: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`, start };
}

function generateRecurring(weeks: number, untilJst?: string): Array<{ intended: string; start: Date }> {
  if (STANDING_AVAILABILITY.length === 0) {
    throw new Error(
      "--recur but STANDING_AVAILABILITY is empty. Edit it in this file, or use --slots for explicit times.",
    );
  }
  const out: Array<{ intended: string; start: Date }> = [];
  const now = new Date();
  const todayJst = renderJst(now).slice(0, 10); // YYYY-MM-DD in JST
  const [ty, tm, td] = todayJst.split("-").map(Number);
  const base = Date.UTC(ty, tm - 1, td); // midnight JST-day anchor (in UTC ms)
  // --until bounds the horizon (JST date, inclusive); otherwise weeks*7 days. 400-day backstop.
  const hardCap = untilJst ? 400 : weeks * 7;
  for (let day = 0; day < hardCap; day++) {
    const cur = new Date(base + day * 86400000);
    const dateStr = cur.toISOString().slice(0, 10); // JST calendar date being enumerated
    if (untilJst && dateStr > untilJst) break;
    const weekday = cur.getUTCDay();
    for (const a of STANDING_AVAILABILITY) {
      if (a.weekday !== weekday) continue;
      const [yy, mm, dd] = dateStr.split("-").map(Number);
      const start = jstToInstant(yy, mm, dd, a.hour, a.minute);
      if (start.getTime() <= now.getTime()) continue; // never seed a past slot
      out.push({
        intended: `${dateStr} ${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(2, "0")}`,
        start,
      });
    }
  }
  return out;
}

function getFlag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const commit = hasFlag("--commit");
  const durationMin = Number(getFlag("--duration") ?? DEFAULT_DURATION_MIN);
  const weeks = Number(getFlag("--weeks") ?? DEFAULT_WEEKS);
  const utcOffset = new Date().getTimezoneOffset(); // 0 when the process runs under UTC

  let planned: Array<{ intended: string; start: Date }>;
  const slotsArg = getFlag("--slots");
  if (slotsArg) {
    planned = slotsArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parseJstLiteral);
  } else if (hasFlag("--recur")) {
    planned = generateRecurring(weeks, getFlag("--until"));
  } else {
    console.error(
      "Nothing to seed. Pass --slots \"YYYY-MM-DD HH:mm,...\" (JST) or --recur (edit STANDING_AVAILABILITY).",
    );
    process.exit(1);
  }

  // future-only + de-dupe within the batch
  const now = new Date();
  const seen = new Set<string>();
  planned = planned
    .filter((p) => p.start.getTime() > now.getTime())
    .filter((p) => (seen.has(p.start.toISOString()) ? false : (seen.add(p.start.toISOString()), true)))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (planned.length === 0) {
    console.error("All requested slots are in the past. Nothing to seed.");
    process.exit(1);
  }

  console.log(`\n🗓  Advisory slot seeding — ${commit ? "COMMIT" : "DRY-RUN"} (duration ${durationMin}min)`);
  if (utcOffset !== 0) {
    console.log(
      `⚠  Process TZ offset ${-utcOffset}min (not UTC). Stored values are UTC-correct by construction,\n` +
        `   but the post-commit read-back check needs TZ=UTC to mirror Vercel — re-run with TZ=UTC to verify.`,
    );
  }
  // batch summary (total / distinct days / per-day / horizon) so a large recurring plan is auditable
  const days = new Set(planned.map((p) => p.intended.slice(0, 10)));
  const perDay = (planned.length / days.size).toFixed(1);
  console.log(
    `\n  ${planned.length} slot(s) · ${days.size} day(s) · ~${perDay}/day · ` +
      `${planned[0].intended} → ${planned[planned.length - 1].intended} JST`,
  );

  console.log("\n  intended (JST)     stored (UTC / ISO)          app shows (Asia/Tokyo)");
  console.log("  ─────────────────  ──────────────────────────  ──────────────────────");
  const rowStr = (p: { intended: string; start: Date }) => {
    const shows = renderJst(p.start);
    const ok = shows === p.intended ? "" : "  ❌ MISMATCH";
    return `  ${p.intended}   ${p.start.toISOString()}   ${shows}${ok}`;
  };
  // sample large batches (first 6 + last 3) — every slot is still integrity-checked below
  const sample: Array<{ intended: string; start: Date } | null> =
    planned.length > 16 ? [...planned.slice(0, 6), null, ...planned.slice(-3)] : planned;
  for (const p of sample) console.log(p ? rowStr(p) : `  … (${planned.length - 9} more) …`);
  const mismatch = planned.filter((p) => renderJst(p.start) !== p.intended);
  if (mismatch.length) {
    console.log(`\n  ❌ ${mismatch.length} slot(s) render at the WRONG JST time — do NOT --commit until fixed.`);
  }
  console.log("");

  if (!commit) {
    console.log(`Dry-run only — ${planned.length} slot(s) would be inserted (skipping any that already exist).`);
    console.log("Add --commit to write. Reminder: --commit writes to PROD Neon (kimny専管).\n");
    // report current open/future availability so the operator sees how empty it is
    try {
      const openRows = await db
        .select({ id: advisorySlots.id })
        .from(advisorySlots)
        .where(and(eq(advisorySlots.status, "open"), gt(advisorySlots.startTime, now)));
      console.log(`(Current DB: ${openRows.length} open future slot(s) right now.)\n`);
    } catch {
      console.log("(Could not read current open-slot count — DB read unavailable in this context.)\n");
    }
    process.exit(0);
  }

  // ---- COMMIT ----
  let inserted = 0;
  let skipped = 0;
  const insertedIds: string[] = [];
  for (const p of planned) {
    const end = new Date(p.start.getTime() + durationMin * 60000);
    // idempotent: skip if a slot with this exact start already exists
    const existing = await db
      .select({ id: advisorySlots.id })
      .from(advisorySlots)
      .where(eq(advisorySlots.startTime, p.start))
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    const [row] = await db
      .insert(advisorySlots)
      .values({ startTime: p.start, endTime: end, status: "open" })
      .returning({ id: advisorySlots.id });
    insertedIds.push(row.id);
    inserted++;
  }

  // read-back verification (only meaningful under UTC, matching Vercel's runtime)
  let mismatches = 0;
  if (insertedIds.length > 0) {
    const rows = await db
      .select({ id: advisorySlots.id, startTime: advisorySlots.startTime })
      .from(advisorySlots)
      .where(inArray(advisorySlots.id, insertedIds));
    if (utcOffset === 0) {
      const wanted = new Map(planned.map((p) => [p.start.toISOString(), p.intended]));
      for (const r of rows) {
        const shows = renderJst(r.startTime);
        const intended = wanted.get(r.startTime.toISOString());
        if (intended && shows !== intended) {
          mismatches++;
          console.log(`  ❌ read-back mismatch: stored ${r.startTime.toISOString()} shows ${shows}, wanted ${intended}`);
        }
      }
      console.log(
        mismatches === 0
          ? `✅ read-back verified: all ${rows.length} inserted slot(s) render at the intended JST time.`
          : `❌ read-back FAILED: ${mismatches} slot(s) render at the wrong time — investigate before relying on these.`,
      );
    } else {
      console.log("↷ read-back time-check skipped (not UTC). Re-run a dry-run under TZ=UTC to audit rendering.");
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} already existed. ${mismatches ? "⚠ SEE MISMATCHES ABOVE." : ""}\n`);
  process.exit(mismatches > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error("seed-advisory-slots failed:", err);
  process.exit(1);
});
