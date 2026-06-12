import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isFreeCampaignEnabled,
  getFreeCampaignAudience,
  getFreeCampaignCap,
  evaluateFreeCampaignEligibility,
  FREE_CAMPAIGN_SESSION,
} from '@/lib/dial/free-campaign';

const ENV_KEYS = ['DIAL_FREE_CAMPAIGN_ENABLED', 'DIAL_FREE_CAMPAIGN_AUDIENCE', 'DIAL_FREE_CAMPAIGN_CAP'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  // Default: enabled for eligibility-logic tests; individual tests override.
  process.env.DIAL_FREE_CAMPAIGN_ENABLED = 'true';
  process.env.DIAL_FREE_CAMPAIGN_AUDIENCE = 'open';
  delete process.env.DIAL_FREE_CAMPAIGN_CAP;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
});

// Helper deps: open audience, cap not reached, not yet granted.
const okDeps = {
  countGrants: async () => 0,
  isWaitlisted: async () => true,
  isGrantUsed: async () => false,
};

describe('config getters', () => {
  it('kill-switch defaults OFF when env unset', () => {
    delete process.env.DIAL_FREE_CAMPAIGN_ENABLED;
    expect(isFreeCampaignEnabled()).toBe(false);
  });

  it('kill-switch ON only for exact "true"', () => {
    process.env.DIAL_FREE_CAMPAIGN_ENABLED = 'true';
    expect(isFreeCampaignEnabled()).toBe(true);
    process.env.DIAL_FREE_CAMPAIGN_ENABLED = '1';
    expect(isFreeCampaignEnabled()).toBe(false);
  });

  it('audience defaults to open; waitlist only for exact "waitlist"', () => {
    delete process.env.DIAL_FREE_CAMPAIGN_AUDIENCE;
    expect(getFreeCampaignAudience()).toBe('open');
    process.env.DIAL_FREE_CAMPAIGN_AUDIENCE = 'waitlist';
    expect(getFreeCampaignAudience()).toBe('waitlist');
    process.env.DIAL_FREE_CAMPAIGN_AUDIENCE = 'OPEN';
    expect(getFreeCampaignAudience()).toBe('open');
  });

  it('cap defaults to 15, env overrides positive integer', () => {
    delete process.env.DIAL_FREE_CAMPAIGN_CAP;
    expect(getFreeCampaignCap()).toBe(15);
    process.env.DIAL_FREE_CAMPAIGN_CAP = '20';
    expect(getFreeCampaignCap()).toBe(20);
    process.env.DIAL_FREE_CAMPAIGN_CAP = '-3';
    expect(getFreeCampaignCap()).toBe(15);
    process.env.DIAL_FREE_CAMPAIGN_CAP = 'abc';
    expect(getFreeCampaignCap()).toBe(15);
  });
});

describe('FREE_CAMPAIGN_SESSION shape', () => {
  it('funds the full dialogue journey: baseCycleLimit=3 (mix_check×2 + final)', () => {
    // limit=3 + the mixCheckCount<2 guard (final/route.ts) guarantees a final slot remains
    // after refining. limit=1 stranded the user once a single mix_check was spent.
    expect(FREE_CAMPAIGN_SESSION.baseCycleLimit).toBe(3);
  });

  it('estimates the realized full-journey RoEx cost: 980cr (mix_check×2 + final + master + diag)', () => {
    expect(FREE_CAMPAIGN_SESSION.roexCrEstimate).toBe(980);
  });

  it('keeps the other guardrails unchanged (no retake purchases, dialogue+omakase)', () => {
    expect(FREE_CAMPAIGN_SESSION.additionalCycleLimit).toBe(0);
    expect(FREE_CAMPAIGN_SESSION.mode).toBe('dialogue');
    expect(FREE_CAMPAIGN_SESSION.masteringMode).toBe('omakase');
  });
});

describe('evaluateFreeCampaignEligibility', () => {
  it('kill-switch OFF → disabled (highest precedence)', async () => {
    process.env.DIAL_FREE_CAMPAIGN_ENABLED = 'false';
    const r = await evaluateFreeCampaignEligibility({ signedIn: true, email: 'a@b.com' }, okDeps);
    expect(r).toEqual({ eligible: false, reason: 'disabled', remaining: 0 });
  });

  it('not signed in → not_signed_in', async () => {
    const r = await evaluateFreeCampaignEligibility({ signedIn: false, email: null }, okDeps);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('not_signed_in');
  });

  it('signed in but no email → no_email', async () => {
    const r = await evaluateFreeCampaignEligibility({ signedIn: true, email: null }, okDeps);
    expect(r.reason).toBe('no_email');
  });

  it('cap reached → cap_reached, remaining 0', async () => {
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, countGrants: async () => 15 },
    );
    expect(r).toEqual({ eligible: false, reason: 'cap_reached', remaining: 0 });
  });

  it('open audience: eligible without waitlist check', async () => {
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, isWaitlisted: async () => false }, // ignored in open mode
    );
    expect(r).toEqual({ eligible: true, reason: 'ok', remaining: 15 });
  });

  it('waitlist audience: non-member → not_waitlisted', async () => {
    process.env.DIAL_FREE_CAMPAIGN_AUDIENCE = 'waitlist';
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, isWaitlisted: async () => false },
    );
    expect(r.reason).toBe('not_waitlisted');
  });

  it('waitlist audience: member → eligible', async () => {
    process.env.DIAL_FREE_CAMPAIGN_AUDIENCE = 'waitlist';
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, isWaitlisted: async () => true },
    );
    expect(r.eligible).toBe(true);
  });

  it('already granted (lifetime-1) → already_granted', async () => {
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, isGrantUsed: async () => true },
    );
    expect(r.reason).toBe('already_granted');
  });

  it('remaining reflects cap minus used', async () => {
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, countGrants: async () => 10 },
    );
    expect(r).toEqual({ eligible: true, reason: 'ok', remaining: 5 });
  });

  it('fail-closed on dependency error', async () => {
    const r = await evaluateFreeCampaignEligibility(
      { signedIn: true, email: 'a@b.com' },
      { ...okDeps, countGrants: async () => { throw new Error('db down'); } },
    );
    expect(r).toEqual({ eligible: false, reason: 'error', remaining: 0 });
  });
});
