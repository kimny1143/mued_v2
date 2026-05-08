import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Inline schema (mirrors app/api/dial/checkout/subscription/route.ts) ───

const subscriptionSchema = z.object({
  tier: z.enum(['hoo_pass']),
  utmSource: z.string().max(50).optional(),
  utmMedium: z.string().max(50).optional(),
  utmCampaign: z.string().max(100).optional(),
});

// ─── Guard logic (mirrors the duplicate-subscription check) ──────────────

function checkDuplicateSubscription(existingSub: { id: string } | null): {
  blocked: boolean;
  code?: string;
} {
  if (existingSub) {
    return { blocked: true, code: 'ALREADY_SUBSCRIBED' };
  }
  return { blocked: false };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('Subscription Checkout — request schema', () => {
  it('accepts hoo_pass tier', () => {
    const result = subscriptionSchema.safeParse({ tier: 'hoo_pass' });
    expect(result.success).toBe(true);
  });

  it('rejects deprecated tiers (basic, pro, studio)', () => {
    for (const tier of ['basic', 'pro', 'studio']) {
      const result = subscriptionSchema.safeParse({ tier });
      expect(result.success).toBe(false);
    }
  });

  it('rejects missing tier', () => {
    const result = subscriptionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional utm fields', () => {
    const result = subscriptionSchema.safeParse({
      tier: 'hoo_pass',
      utmSource: 'lp',
      utmMedium: 'hero',
      utmCampaign: 'research_beta',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utmSource).toBe('lp');
      expect(result.data.utmCampaign).toBe('research_beta');
    }
  });

  it('rejects utmSource exceeding 50 chars', () => {
    const result = subscriptionSchema.safeParse({
      tier: 'hoo_pass',
      utmSource: 'x'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe('Subscription Checkout — duplicate guard', () => {
  it('blocks when user already has an active subscription', () => {
    const existing = { id: 'sub_abc123' };
    const result = checkDuplicateSubscription(existing);
    expect(result.blocked).toBe(true);
    expect(result.code).toBe('ALREADY_SUBSCRIBED');
  });

  it('allows when no active subscription exists', () => {
    const result = checkDuplicateSubscription(null);
    expect(result.blocked).toBe(false);
    expect(result.code).toBeUndefined();
  });
});
