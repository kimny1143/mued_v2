import { db } from '@/db';
import { dialSessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { UnifiedSession } from '@/components/dashboard/session-ledger';

/**
 * Lists a signed-in user's MUEDial sessions as UnifiedSession[] for the session
 * history view (/dial/sessions) and the unified dashboard.
 *
 * Mirrors the dial query + mapping in app/dashboard/page.tsx (the single source of
 * truth for "a user's dial sessions"); the dashboard will be DRY'd onto this helper
 * in a follow-up PR (deferred to keep this PR's blast-radius off the live mued.jp
 * dashboard).
 *
 * SECURITY: enumeration-safe by construction — the only filter is the caller's own
 * verified Clerk user id. There is no parameter that lets a caller read another
 * user's sessions; callers must pass the id resolved from the verified auth token.
 */

// Shape of a dial session row with the columns this view needs (matches the query below).
interface RawDialSession {
  id: string;
  mode: string | null;
  status: string;
  musicalStyle: string | null;
  title: string | null;
  createdAt: Date | null;
  tracks: { id: string }[];
  tasks: {
    id: string;
    taskType: string;
    status: string;
    r2FinalUrl: string | null;
    r2ExpiresAt: Date | null;
  }[];
}

const DOWNLOADABLE_TASK_TYPES = ['final_basic', 'final_advanced', 'mastering'] as const;

/**
 * Pure mapper: raw dial session rows → UnifiedSession[]. Takes `now` explicitly so the
 * daysRemaining (R2 download-expiry countdown) computation is deterministic and testable.
 * Behaviour mirrors app/dashboard/page.tsx:272-331 exactly.
 */
export function mapDialSessionsToUnified(rows: RawDialSession[], now: Date): UnifiedSession[] {
  return rows.map((s) => {
    const downloadableTasks = s.tasks.filter(
      (t) =>
        t.r2FinalUrl &&
        t.r2ExpiresAt &&
        t.status === 'completed' &&
        (DOWNLOADABLE_TASK_TYPES as readonly string[]).includes(t.taskType),
    );
    const earliestExpiry =
      downloadableTasks.length > 0
        ? downloadableTasks.reduce((min, t) => {
            const exp = new Date(t.r2ExpiresAt!);
            return exp < min ? exp : min;
          }, new Date(downloadableTasks[0].r2ExpiresAt!))
        : null;
    const daysRemaining = earliestExpiry
      ? Math.ceil((earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: s.id,
      product: 'dial' as const,
      status: s.status,
      displayName: s.title || s.musicalStyle || s.id.replace(/-/g, '').slice(0, 8),
      createdAt: s.createdAt,
      href: `/dial/session/${s.id}`,
      hasDownload: downloadableTasks.length > 0,
      daysRemaining,
    };
  });
}

/**
 * Query + map a signed-in user's dial sessions (newest first).
 *
 * `now` is injectable so a caller that already has a timestamp can pass it and get exactly the
 * behaviour it had before delegating here. Without it the countdown would be computed AFTER this
 * function's own DB round-trip — a gap of tens to hundreds of milliseconds, not microseconds — and
 * a `daysRemaining` boundary could land on the other side of the `Math.ceil`. Vanishingly unlikely,
 * but "vanishingly unlikely" is a worse thing to write in a refactor's PR description than "same".
 */
export async function listUserDialSessions(
  clerkUserId: string,
  now: Date = new Date(),
): Promise<UnifiedSession[]> {
  const rows = await db.query.dialSessions.findMany({
    where: eq(dialSessions.userId, clerkUserId),
    orderBy: [desc(dialSessions.createdAt)],
    with: {
      tracks: { columns: { id: true } },
      tasks: {
        columns: {
          id: true,
          taskType: true,
          status: true,
          r2FinalUrl: true,
          r2ExpiresAt: true,
        },
      },
    },
  });

  return mapDialSessionsToUnified(rows as RawDialSession[], now);
}
