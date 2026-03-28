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
  priceJpyDisplay: number; // Tax-inclusive display price
  label: string;
}> = {
  basic: {
    credits: 1_000,
    priceUsdCents: 1999,
    priceJpyDisplay: 2_980,
    label: 'MUEDial Basic',
  },
  pro: {
    credits: 1_700,
    priceUsdCents: 3499,
    priceJpyDisplay: 4_980,
    label: 'MUEDial Pro',
  },
  studio: {
    credits: 3_000,
    priceUsdCents: 4999,
    priceJpyDisplay: 7_980,
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
  mix_diagnosis: 5,
  audio_cleanup: 10,
  omakase: 300,
  mastering: 200,
  dialogue: 600,
  dialogue_mastering: 800,
} as const;

export type DialCreditOperation = keyof typeof DIAL_CREDIT_COSTS;

// ========================================
// Single Purchase Prices (maintained)
// ========================================

export const DIAL_SINGLE_PRICES = {
  omakase: 800,           // $8
  dialogue: 1500,         // $15
  mastering_addon: 600,   // $6
} as const;

// ========================================
// Credit Expiry
// ========================================

/** Subscription credits expire 3 months after grant */
export const CREDIT_EXPIRY_MONTHS = 3;
