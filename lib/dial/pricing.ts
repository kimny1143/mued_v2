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

export const DIAL_SUB_TIERS = ['basic', 'pro', 'studio'] as const;
export type DialSubTier = (typeof DIAL_SUB_TIERS)[number];

export const DIAL_SUB_PLANS: Record<DialSubTier, {
  credits: number;
  priceUsdCents: number;
  label: string;
}> = {
  basic: {
    credits: 1_000,
    priceUsdCents: 1999,
    label: 'MUEDial Basic',
  },
  pro: {
    credits: 1_700,
    priceUsdCents: 3499,
    label: 'MUEDial Pro',
  },
  studio: {
    credits: 3_000,
    priceUsdCents: 4999,
    label: 'MUEDial Studio',
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
  omakase: 800,           // $8
  dialogue: 1500,         // $15
  mastering_addon: 600,   // $6
  retake: 1000,           // $10
} as const;

// ========================================
// Credit Policy
// ========================================

/** Subscription credits: no expiry while subscribed (unlimited rollover) */
/** On cancellation: remaining grants expire after this many days */
export const CANCEL_GRACE_DAYS = 30;

/** Credit packs expire 12 months after purchase (aligned with RoEx upstream) */
export const CREDIT_PACK_EXPIRY_MONTHS = 12;
