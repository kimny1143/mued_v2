/**
 * FabFilter Pro-Q Series Value Formatter
 *
 * Handles Pro-Q 3, Pro-Q 4, and future versions.
 *
 * Pro-Q's VST returns incorrect value_string for most parameters.
 * This module provides correct conversions based on the normalized value.
 *
 * @see docs/daw-hub/fabfilter-integration.md
 */

import type { PluginFormatter, FormatContext } from './types';

// ========================================
// Conversion Functions
// ========================================

/**
 * Frequency conversion
 *
 * Range: 10 Hz - 30 kHz (logarithmic scale)
 * Formula: frequency = 10 * 3000 ^ value
 */
function formatFrequency(value: number): string {
  const minFreq = 10;
  const maxFreq = 30000;
  const frequency = minFreq * Math.pow(maxFreq / minFreq, value);

  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(2)} kHz`;
  }
  return `${frequency.toFixed(1)} Hz`;
}

/**
 * Gain conversion
 *
 * Range: -30 dB - +30 dB (linear scale)
 * Formula: gain = (value - 0.5) * 60
 */
function formatGain(value: number): string {
  const gain = (value - 0.5) * 60;
  const sign = gain >= 0 ? '+' : '';
  return `${sign}${gain.toFixed(2)} dB`;
}

/**
 * Q (bandwidth) conversion
 *
 * Range: 0.025 - 40 (logarithmic scale)
 * Formula: q = 0.025 * 1600 ^ value
 */
function formatQ(value: number): string {
  const minQ = 0.025;
  const maxQ = 40;
  const q = minQ * Math.pow(maxQ / minQ, value);
  return q.toFixed(2);
}

/**
 * Slope conversion
 *
 * Range: 6 - 96 dB/oct (6 dB increments)
 * Formula: slope = (value + 1) * 6
 *
 * value=1 → 12 dB/oct, value=2 → 18 dB/oct, etc.
 */
function formatSlope(value: number): string {
  const slope = Math.round((value + 1) * 6);
  return `${slope} dB/oct`;
}

// ========================================
// Plugin Formatter Export
// ========================================

export const fabfilterProQ: PluginFormatter = {
  pluginPattern: 'Pro-Q',

  format(ctx: FormatContext): string | null {
    const { paramName, value } = ctx;

    // Frequency parameters (Band X Frequency)
    if (paramName.includes('Frequency')) {
      return formatFrequency(value);
    }

    // Gain parameters (Band X Gain, but not S/C Gain)
    if (paramName.includes('Gain') && !paramName.includes('S/C')) {
      return formatGain(value);
    }

    // Q parameters (Band X Q or just Q)
    if (paramName === 'Q' || paramName.includes(' Q')) {
      return formatQ(value);
    }

    // Slope parameters (Band X Slope)
    if (paramName.includes('Slope')) {
      return formatSlope(value);
    }

    // Not handled by this formatter
    return null;
  },
};

export default fabfilterProQ;
