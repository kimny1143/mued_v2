/**
 * Plugin Value Formatter Types
 *
 * Common types for plugin-specific value formatting.
 */

/**
 * Context for value formatting
 */
export interface FormatContext {
  deviceName: string;
  paramName: string;
  value: number;
  originalValueString: string;
}

/**
 * Plugin formatter interface
 * Each plugin module should export an object implementing this interface
 */
export interface PluginFormatter {
  /**
   * Plugin name pattern to match (e.g., "Pro-Q" matches "Pro-Q 3", "Pro-Q 4")
   */
  pluginPattern: string | RegExp;

  /**
   * Format a parameter value
   * @returns Formatted string, or null if this formatter doesn't handle this param
   */
  format(ctx: FormatContext): string | null;
}
