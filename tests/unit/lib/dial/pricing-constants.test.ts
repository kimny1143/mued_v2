import { describe, it, expect } from 'vitest';
import {
  DIAL_CREDIT_COSTS,
  DIAL_SINGLE_PRICES,
  DIAL_SUB_PLANS,
  DIAL_CREDIT_PACKS,
  CANCEL_GRACE_DAYS,
  CREDIT_PACK_EXPIRY_MONTHS,
} from '@/lib/dial/pricing';

// Regression guard: David Ronan confirmed values (2026-03-24, PR#295)
// Any change here requires re-verification with upstream RoEx pricing.
describe('DIAL_CREDIT_COSTS — DR-confirmed values', () => {
  it('mix_diagnosis = 10cr', () => {
    expect(DIAL_CREDIT_COSTS.mix_diagnosis).toBe(10);
  });

  it('omakase = 300cr', () => {
    expect(DIAL_CREDIT_COSTS.omakase).toBe(300);
  });

  it('mastering = 220cr', () => {
    expect(DIAL_CREDIT_COSTS.mastering).toBe(220);
  });

  it('dialogue = 530cr', () => {
    expect(DIAL_CREDIT_COSTS.dialogue).toBe(530);
  });

  it('dialogue_mastering = 750cr (530 + 220)', () => {
    expect(DIAL_CREDIT_COSTS.dialogue_mastering).toBe(
      DIAL_CREDIT_COSTS.dialogue + DIAL_CREDIT_COSTS.mastering,
    );
    expect(DIAL_CREDIT_COSTS.dialogue_mastering).toBe(750);
  });
});

describe('DIAL_SINGLE_PRICES — USD cents', () => {
  it('omakase = $8', () => {
    expect(DIAL_SINGLE_PRICES.omakase).toBe(800);
  });

  it('dialogue = $15', () => {
    expect(DIAL_SINGLE_PRICES.dialogue).toBe(1500);
  });

  it('mastering_addon = $6', () => {
    expect(DIAL_SINGLE_PRICES.mastering_addon).toBe(600);
  });
});

describe('DIAL_SUB_PLANS', () => {
  it('basic: $19.99/mo, 1000cr', () => {
    expect(DIAL_SUB_PLANS.basic.priceUsdCents).toBe(1999);
    expect(DIAL_SUB_PLANS.basic.credits).toBe(1000);
  });

  it('pro: $34.99/mo, 1700cr', () => {
    expect(DIAL_SUB_PLANS.pro.priceUsdCents).toBe(3499);
    expect(DIAL_SUB_PLANS.pro.credits).toBe(1700);
  });

  it('studio: $49.99/mo, 3000cr', () => {
    expect(DIAL_SUB_PLANS.studio.priceUsdCents).toBe(4999);
    expect(DIAL_SUB_PLANS.studio.credits).toBe(3000);
  });
});

describe('DIAL_CREDIT_PACKS', () => {
  it('small: $12.99, 500cr', () => {
    expect(DIAL_CREDIT_PACKS.small.priceUsdCents).toBe(1299);
    expect(DIAL_CREDIT_PACKS.small.credits).toBe(500);
  });

  it('large: $34.99, 1500cr', () => {
    expect(DIAL_CREDIT_PACKS.large.priceUsdCents).toBe(3499);
    expect(DIAL_CREDIT_PACKS.large.credits).toBe(1500);
  });
});

describe('Credit policy', () => {
  it('cancel grace period = 30 days', () => {
    expect(CANCEL_GRACE_DAYS).toBe(30);
  });

  it('credit pack expiry = 12 months', () => {
    expect(CREDIT_PACK_EXPIRY_MONTHS).toBe(12);
  });
});
