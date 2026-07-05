/**
 * Targeted teardown for ONE advisory booking — undo a test / erroneous 壁打ち booking cleanly.
 *
 * Reopens the claimed slot (status='open', inquiry_id=NULL) and deletes the booking row, so both the
 * availability picker and the KPI store (advisory_inquiries) are left clean. Mirrors the seed script's
 * safety model:
 *   - DRY-RUN BY DEFAULT — prints current state + exactly what it would change; nothing written.
 *   - `--commit` gated. `.env.local` DATABASE_URL is PROD Neon, so --commit writes to production
 *     (kimny専管 — run only with explicit kimny authorization; run under TZ=UTC for consistency).
 *   - GUARDED, never collateral: the slot is reopened ONLY if it is currently booked BY THIS booking
 *     (releaseAdvisorySlot: status='booked' AND inquiry_id=<booking>), and ONLY an inquiry of
 *     type='booking' is deleted. A wrong id is a no-op, never a change to a real/other booking.
 *   - Read-back verifies the final state (slot open + booking gone) and exits non-zero on mismatch.
 *   - No calendar cleanup needed: the Meet link is a fixed reusable URL (no Calendar API) and the .ics
 *     is only an email attachment — there is no server-side event to delete.
 *
 * Usage:
 *   npx tsx scripts/teardown-advisory-booking.ts --slot <uuid> --booking <uuid>            # dry-run
 *   TZ=UTC npx tsx scripts/teardown-advisory-booking.ts --slot <uuid> --booking <uuid> --commit
 */
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { advisorySlots, advisoryInquiries } from "../db/schema";
import { releaseAdvisorySlot } from "../lib/advisory/slot-reservation";

config({ path: ".env.local" });

function getFlag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const slotId = getFlag("--slot");
  const bookingId = getFlag("--booking");
  const commit = hasFlag("--commit");
  if (!slotId || !bookingId) {
    console.error("Usage: --slot <uuid> --booking <uuid> [--commit]");
    process.exit(1);
  }

  const [slot] = await db.select().from(advisorySlots).where(eq(advisorySlots.id, slotId)).limit(1);
  const [booking] = await db
    .select()
    .from(advisoryInquiries)
    .where(eq(advisoryInquiries.id, bookingId))
    .limit(1);

  console.log(`\n🧹 Advisory booking teardown — ${commit ? "COMMIT" : "DRY-RUN"}`);
  console.log(
    `  slot    ${slotId}\n    → ${slot ? `status=${slot.status}, inquiry_id=${slot.inquiryId ?? "null"}` : "NOT FOUND"}`,
  );
  console.log(
    `  booking ${bookingId}\n    → ${booking ? `type=${booking.type}, status=${booking.status}, email=${booking.email}` : "NOT FOUND"}`,
  );

  // safety notes (each guarded action is a no-op when its condition fails — surfaced here up front)
  const warns: string[] = [];
  if (slot && slot.inquiryId && slot.inquiryId !== bookingId)
    warns.push(`slot is claimed by a DIFFERENT booking (${slot.inquiryId}) — it will NOT be reopened.`);
  if (slot && slot.status !== "booked") warns.push(`slot is '${slot.status}', not 'booked' — reopen is a no-op.`);
  if (booking && booking.type !== "booking")
    warns.push(`inquiry is type='${booking.type}', not 'booking' — it will NOT be deleted.`);
  if (!slot) warns.push("slot not found — reopen is a no-op.");
  if (!booking) warns.push("booking not found — already deleted (delete is a no-op).");
  for (const w of warns) console.log(`  ⚠ ${w}`);

  if (!commit) {
    console.log(
      "\nDry-run — would reopen the slot (only if booked by this booking) and delete the booking. Add --commit to write.\n",
    );
    process.exit(0);
  }

  let deleted = 0;
  await db.transaction(async (tx) => {
    // guarded reopen (status='booked' AND inquiry_id=<booking>); no-op otherwise
    await releaseAdvisorySlot(tx, slotId, bookingId);
    const del = await tx
      .delete(advisoryInquiries)
      .where(and(eq(advisoryInquiries.id, bookingId), eq(advisoryInquiries.type, "booking")))
      .returning({ id: advisoryInquiries.id });
    deleted = del.length;
  });

  // read-back verification
  const [slotAfter] = await db.select().from(advisorySlots).where(eq(advisorySlots.id, slotId)).limit(1);
  const [bookingAfter] = await db
    .select()
    .from(advisoryInquiries)
    .where(eq(advisoryInquiries.id, bookingId))
    .limit(1);
  const slotOk = !!slotAfter && slotAfter.status === "open" && !slotAfter.inquiryId;
  const bookingOk = !bookingAfter;
  console.log(
    `\n  read-back slot   : ${slotAfter ? `status=${slotAfter.status}, inquiry_id=${slotAfter.inquiryId ?? "null"}` : "NOT FOUND"} → ${slotOk ? "✅ open" : "❌"}`,
  );
  console.log(`  read-back booking: ${bookingAfter ? "STILL EXISTS ❌" : "deleted ✅"} (${deleted} row deleted)`);
  console.log(
    slotOk && bookingOk
      ? "\n✅ teardown verified: slot reopened + test booking removed. Availability + KPI are clean.\n"
      : "\n❌ teardown INCOMPLETE — see the read-back/warnings above.\n",
  );
  process.exit(slotOk && bookingOk ? 0 : 2);
}

main().catch((err) => {
  console.error("teardown-advisory-booking failed:", err);
  process.exit(1);
});
