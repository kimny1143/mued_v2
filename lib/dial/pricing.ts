/**
 * MUEDial Pricing Constants
 *
 * Single source of truth for subscription plans, credit packs,
 * and per-operation credit costs.
 *
 * Prices are in cents (USD). JPY display prices are tax-inclusive.
 */

// ========================================
// Subscription Plans
// ========================================

export const DIAL_SUB_TIERS = ['hoo_pass', 'basic', 'pro', 'studio'] as const;
export type DialSubTier = (typeof DIAL_SUB_TIERS)[number];

export const DIAL_SUB_PLANS: Record<DialSubTier, {
  credits: number;
  priceUsdCents: number;
  label: string;
  deprecated?: boolean;
}> = {
  hoo_pass: {
    credits: 100,
    priceUsdCents: 699,
    label: 'MUEDial Hoo Pass',
  },
  basic: {
    credits: 1_000,
    priceUsdCents: 1999,
    label: 'MUEDial Basic',
    deprecated: true,
  },
  pro: {
    credits: 1_700,
    priceUsdCents: 3499,
    label: 'MUEDial Pro',
    deprecated: true,
  },
  studio: {
    credits: 3_000,
    priceUsdCents: 4999,
    label: 'MUEDial Studio',
    deprecated: true,
  },
};

// ========================================
// Credit Packs (overage purchases)
// ========================================

export const DIAL_CREDIT_PACK_SIZES = ['small', 'large'] as const;
export type DialCreditPackSize = (typeof DIAL_CREDIT_PACK_SIZES)[number];

export const DIAL_CREDIT_PACKS: Record<DialCreditPackSize, {
  credits: number;
  priceUsdCents: number;
  label: string;
}> = {
  small: {
    credits: 500,
    priceUsdCents: 1299,
    label: 'MUEDial Credit Pack — 500cr',
  },
  large: {
    credits: 1_500,
    priceUsdCents: 3499,
    label: 'MUEDial Credit Pack — 1,500cr',
  },
};

// ========================================
// Per-Operation Credit Costs
// ========================================

export const DIAL_CREDIT_COSTS = {
  mix_diagnosis: 10,
  audio_cleanup: 10,
  omakase: 300,
  mastering: 220,
  dialogue: 530,
  dialogue_mastering: 750, // 530 + 220
} as const;

export type DialCreditOperation = keyof typeof DIAL_CREDIT_COSTS;

// ========================================
// Single Purchase Prices (maintained)
// ========================================

export const DIAL_SINGLE_PRICES = {
  omakase: 800,           // $8.00
  dialogue: 1499,         // $14.99
  mastering_addon: 699,   // $6.99
  retake: 999,            // $9.99
} as const;

// ========================================
// Credit Policy
// ========================================

/** Subscription credits: no expiry while subscribed (unlimited rollover) */
/** On cancellation: remaining grants expire after this many days */
export const CANCEL_GRACE_DAYS = 30;

/** Credit packs expire 12 months after purchase (aligned with RoEx upstream) */
export const CREDIT_PACK_EXPIRY_MONTHS = 12;
