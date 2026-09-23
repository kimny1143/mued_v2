/**
 * Copy a completed deliverable to R2 and record the stable URL on its task — both awaited.
 *
 * ★Why a helper: the session GET's inline poll used to do this fire-and-forget as
 * `copyToR2(...).then((r) => { if (r) { db.update(...).set(...).where(...) } })`. The update inside
 * `.then` was never awaited or returned, and a Drizzle query is a lazy thenable (`QueryPromise.then()`
 * is what calls `execute()`), so `r2_final_url` was never written on that path. Nothing failed; the
 * download just had no R2 copy once RoEx's GCS URL and task were gone. Returning the write from one
 * awaited function makes "copied" and "recorded" the same step.
 *
 * Returns true only when the copy succeeded AND the row was updated. A failed copy (copyToR2 returns
 * null) records nothing — the download route keeps falling back to the GCS URL, as before.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';
import { copyToR2 } from '@/lib/dial/r2-storage';

export async function persistDeliverableToR2(
  params: Parameters<typeof copyToR2>[0],
): Promise<boolean> {
  const r2Result = await copyToR2(params);
  if (!r2Result) return false;

  await db
    .update(dialTasks)
    .set({ r2FinalUrl: r2Result.r2Url, r2ExpiresAt: r2Result.expiresAt })
    .where(eq(dialTasks.id, params.taskId));
  return true;
}
