import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: { query: { dialSessions: { findFirst: vi.fn() }, dialTasks: { findFirst: vi.fn() } } },
}));
vi.mock('@/lib/dial/admin-access', () => ({
  resolveRequesterEmail: vi.fn(),
  isDialSessionAdmin: vi.fn(),
  recordAdminAccess: vi.fn(),
}));

import { db } from '@/db';
import { resolveRequesterEmail, isDialSessionAdmin, recordAdminAccess } from '@/lib/dial/admin-access';
import { verifyDialSessionReadAccess } from '@/lib/middleware/dial-ownership';

const findSession = db.query.dialSessions.findFirst as ReturnType<typeof vi.fn>;
const mockResolveEmail = resolveRequesterEmail as ReturnType<typeof vi.fn>;
const mockIsAdmin = isDialSessionAdmin as ReturnType<typeof vi.fn>;
const mockRecord = recordAdminAccess as ReturnType<typeof vi.fn>;

const SESSION = { id: 's1', userId: 'owner1', guestToken: 'gt1' };

beforeEach(() => {
  vi.clearAllMocks();
  findSession.mockResolvedValue(SESSION);
});

function auth(over: Record<string, unknown>) {
  return { userId: null, guestToken: null, isGuest: false, request: {}, ...over } as never;
}

describe('verifyDialSessionReadAccess', () => {
  it('owner → { viaAdmin: false }, never consults admin path', async () => {
    const r = await verifyDialSessionReadAccess('s1', auth({ userId: 'owner1' }));
    expect(r).toEqual({ session: SESSION, viaAdmin: false });
    expect(mockIsAdmin).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('non-owner allow-listed admin → { viaAdmin: true } + audit logged', async () => {
    mockResolveEmail.mockResolvedValue('admin@x.com');
    mockIsAdmin.mockReturnValue(true);
    const r = await verifyDialSessionReadAccess('s1', auth({ userId: 'admin1' }), 'listen');
    expect(r).toEqual({ session: SESSION, viaAdmin: true });
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({
      adminUserId: 'admin1', adminEmail: 'admin@x.com', targetSessionId: 's1', accessType: 'listen',
    }));
  });

  it('non-owner non-admin → null, no audit', async () => {
    mockResolveEmail.mockResolvedValue('rando@x.com');
    mockIsAdmin.mockReturnValue(false);
    const r = await verifyDialSessionReadAccess('s1', auth({ userId: 'rando' }));
    expect(r).toBeNull();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('guest non-owner → null, admin path never reached', async () => {
    const r = await verifyDialSessionReadAccess('s1', auth({ isGuest: true, guestToken: 'wrong' }));
    expect(r).toBeNull();
    expect(mockIsAdmin).not.toHaveBeenCalled();
  });

  it('guest with matching token → owner access (viaAdmin false)', async () => {
    const r = await verifyDialSessionReadAccess('s1', auth({ isGuest: true, guestToken: 'gt1' }));
    expect(r).toEqual({ session: SESSION, viaAdmin: false });
    expect(mockIsAdmin).not.toHaveBeenCalled();
  });
});
