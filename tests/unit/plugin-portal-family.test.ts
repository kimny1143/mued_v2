/**
 * Unit — the free family is all-or-nothing once you are in it.
 *
 * Regression guard for a live complaint (kimny, 2026-08-29): MUEDsat and MUEDlim were backfilled onto
 * existing owners' shelves in July, MUEDrive was not, so those people were shown a "not on your shelf
 * yet — get it" card and asked for their email a second time for a module the announcement email had
 * already called theirs. ★The portal code was identical for all three; only the history differed.
 *
 * ★Scoped to people who already hold at least one module. Someone holding nothing has not given us an
 * email, and that gate is the point — their shelf must stay empty. That boundary is what these tests
 * pin; without it this feature would hand every visitor a full shelf.
 *
 * ★A separate file because tests/unit/plugin-portal.test.ts mocks the registry WITHOUT `live`, so the
 * inclusion branch is dead there — its 11 tests passing says nothing about this behaviour. (Measured:
 * they still passed after this shipped.)
 *
 * ★product課 swept for the same hole and found it is TWO files, not one: `plugin-portal-data.test.ts`
 * also mocks a `live`-less registry, and that one is heavier — it covers `getPortalItemsForUser`, the
 * entry point page.tsx actually calls, which reaches `buildPortalItems`. So the de-facto integration
 * test never exercised this. (`plugin-portal-register.test.ts` mocks `PLUGIN_DIST: {}` but is harmless:
 * markPortalRegistered never reads the registry.) ★The mechanism is worth naming: a missing mock field
 * does not merely leave a branch untested, it makes NEW behaviour invisible — the old tests keep
 * passing, and that reads as "nothing changed" when it means "nothing ran". Not fixed here.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/plugins/registry', () => ({
  PLUGIN_DIST: {
    muedsat: { key: 'muedsat', live: true, i18nNamespace: 'muedsat', version: '1.0.0', downloadUrl: 'https://cdn/sat.pkg', lpPath: '/muedsat' },
    muedlim: { key: 'muedlim', live: true, i18nNamespace: 'muedlim', version: '2.0.0', downloadUrl: 'https://cdn/lim.pkg', lpPath: '/muedlim' },
    muedrive: { key: 'muedrive', live: true, i18nNamespace: 'muedrive', version: '3.0.0', downloadUrl: 'https://cdn/rive.pkg', lpPath: '/muedrive' },
    muedstaged: { key: 'muedstaged', live: false, i18nNamespace: 'muedstaged', version: '0.1.0', downloadUrl: '', lpPath: '/muedstaged' },
  },
}));

import { buildPortalItems, buildAvailableItems } from '@/lib/plugins/portal';

const CLAIMED = new Date('2026-07-17T00:00:00.000Z');
const owns = (...keys: string[]) => keys.map((pluginKey) => ({ pluginKey, createdAt: CLAIMED }));
const shelf = (...keys: string[]) => buildPortalItems(owns(...keys)).map((i) => i.pluginKey);

describe('portal shelf — the free family', () => {
  it('★someone holding muedsat also sees muedlim and muedrive', () => {
    expect(shelf('muedsat').sort()).toEqual(['muedlim', 'muedrive', 'muedsat']);
  });

  it('★the boundary: someone holding NOTHING still sees nothing', () => {
    expect(buildPortalItems([])).toEqual([]);
    expect(buildPortalItems(null)).toEqual([]);
    // ★Positive control on the same function: it is not simply returning [] for everything.
    expect(shelf('muedsat').length).toBe(3);
  });

  it('★a staged module is never included (live=false stays off the shelf)', () => {
    expect(shelf('muedsat')).not.toContain('muedstaged');
  });

  it('★KNOWN CONSEQUENCE: taking only MUEDrive today also puts sat and lim on the shelf', () => {
    // Recorded as a test rather than only a comment, so the next person meets it as intent.
    expect(shelf('muedrive').sort()).toEqual(['muedlim', 'muedrive', 'muedsat']);
  });

  it('★a claimed module keeps its real date; an included one has claimedAt === null', () => {
    const items = buildPortalItems(owns('muedsat'));
    const claimed = items.find((i) => i.pluginKey === 'muedsat')!;
    const included = items.find((i) => i.pluginKey === 'muedrive')!;
    expect(claimed.claimedAt).toEqual(CLAIMED);
    // ★null, not a stand-in date: nobody recorded a claim, and making the rows look uniform would put
    //   an unmeasured fact on screen.
    expect(included.claimedAt).toBeNull();
  });

  it('★an included module still carries its version and download URL (it is usable, not a stub)', () => {
    const included = buildPortalItems(owns('muedsat')).find((i) => i.pluginKey === 'muedrive')!;
    expect(included.version).toBe('3.0.0');
    expect(included.downloadUrl).toBe('https://cdn/rive.pkg');
  });

  it('claimed modules still sort newest-first, ahead of the included ones', () => {
    const older = new Date('2026-07-01T00:00:00.000Z');
    const items = buildPortalItems([
      { pluginKey: 'muedsat', createdAt: older },
      { pluginKey: 'muedlim', createdAt: CLAIMED },
    ]);
    expect(items.map((i) => i.pluginKey)).toEqual(['muedlim', 'muedsat', 'muedrive']);
  });

  it('★"not on your shelf yet" is empty for a family member — that section was the complaint', () => {
    expect(buildAvailableItems(buildPortalItems(owns('muedsat')))).toEqual([]);
    // ★Positive control: it is still non-empty for someone with nothing, so the section is not dead.
    expect(buildAvailableItems([]).map((a) => a.pluginKey).sort()).toEqual([
      'muedlim',
      'muedrive',
      'muedsat',
    ]);
  });

  it('does not duplicate a module the person genuinely claimed', () => {
    const items = buildPortalItems(owns('muedsat', 'muedlim', 'muedrive'));
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.claimedAt !== null)).toBe(true);
  });
});
