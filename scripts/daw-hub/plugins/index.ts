/**
 * Plugin Value Formatters Registry
 *
 * Central registry for plugin-specific value formatters.
 * Add new plugins here as they are implemented.
 *
 * Usage:
 *   import { formatPluginValue } from './plugins';
 *   const formatted = formatPluginValue(deviceName, paramName, value, originalString);
 */

import type { PluginFormatter, FormatContext } from './types';
import { fabfilterProQ } from './fabfilter-proq';

// ========================================
// Plugin Registry
// ========================================

/**
 * Registered plugin formatters
 * Add new plugins here in order of priority
 */
const pluginFormatters: PluginFormatter[] = [
  fabfilterProQ,
  // Add more plugins here:
  // fabfilterProC,
  // fabfilterProL,
  // waves...,
  // izotope...,
];

// ========================================
// Main Format Function
// ========================================

/**
 * Format a parameter value using plugin-specific logic
 *
 * @param deviceName - Name of the device (e.g., "Pro-Q 4")
 * @param paramName - Name of the parameter (e.g., "Band 1 Frequency")
 * @param value - Normalized value (0.0 - 1.0 or plugin-specific range)
 * @param originalValueString - Original value_string from AbletonOSC
 * @returns Formatted string, or null if no formatter matches
 */
export function formatPluginValue(
  deviceName: string | undefined,
  paramName: string | undefined,
  value: number,
  originalValueString: string
): string | null {
  if (!deviceName || !paramName) return null;

  const ctx: FormatContext = {
    deviceName,
    paramName,
    value,
    originalValueString,
  };

  for (const formatter of pluginFormatters) {
    // Check if device name matches plugin pattern
    const pattern = formatter.pluginPattern;
    const matches =
      typeof pattern === 'string'
        ? deviceName.includes(pattern)
        : pattern.test(deviceName);

    if (matches) {
      const result = formatter.format(ctx);
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

// Re-export types
export type { PluginFormatter, FormatContext } from './types';
