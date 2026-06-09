/**
 * POST /api/cron/dial-reconcile — the durable stuck-task backstop + paid-incomplete flag.
 * Covers auth (500 no secret / 401 bad bearer) and the backstop decision (over → fail,
 * under → no fail). The reconcile + anomaly internals are unit-tested separately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/dial/task-timeout', () => ({
  isDialTaskPastBackstop: vi.fn(),
  markDialTaskFailedWithReconcile: vi.fn().mockResolvedValue({ failed: true }),
}));
vi.mock('@/lib/analytics/dial-events', () => ({ recordDialEvent: vi.fn() }));
vi.mock('@/db', () => ({ db: { select: vi.fn(), selectDistinct: vi.fn() } }));
vi.mock('@/db/schema', () => ({ dialTasks: {}, dialSessions: {}, dialTrialEvents: {} }));
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), inArray: vi.fn(), lt: vi.fn() }));

import { POST } from '@/app/api/cron/dial-reconcile/route';
import { db } from '@/db';
import { isDialTaskPastBackstop, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';

/** Stub a `db.select(...).from(...).where(...)` chain that resolves to `result`. */
function chain(result: unknown) {
  return { from: () => ({ where: () => Promise.resolve(result) }) } as never;
}
function req(authHeader?: string) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? authHeader ?? null : null) },
  } as never;
}

describe('POST /api/cron/dial-reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'secret';
    vi.mocked(markDialTaskFailedWithReconcile).mockResolvedValue({ failed: true });
  });

  it('500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req('Bearer x'));
    expect(res.status).toBe(500);
  });

  it('401 on a missing/wrong bearer', async () => {
    const res = await POST(req('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('fails a task past its backstop and reports the count', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([{ id: 't1', taskType: 'preview', createdAt: new Date(0) }])) // active tasks
      .mockReturnValueOnce(chain([])); // paid-idle sessions
    vi.mocked(db.selectDistinct).mockReturnValue(chain([]));
    vi.mocked(isDialTaskPastBackstop).mockReturnValue(true);

    const res = await POST(req('Bearer secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failedCount).toBe(1);
    expect(markDialTaskFailedWithReconcile).toHaveBeenCalledWith('t1', expect.any(String));
  });

  it('does NOT fail a task that is under its backstop', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([{ id: 't2', taskType: 'preview', createdAt: new Date() }]))
      .mockReturnValueOnce(chain([]));
    vi.mocked(db.selectDistinct).mockReturnValue(chain([]));
    vi.mocked(isDialTaskPastBackstop).mockReturnValue(false);

    const res = await POST(req('Bearer secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failedCount).toBe(0);
    expect(markDialTaskFailedWithReconcile).not.toHaveBeenCalled();
  });
});
