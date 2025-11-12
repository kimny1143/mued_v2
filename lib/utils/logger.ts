/**
 * Centralized Logger Utility
 *
 * Development-only logging to prevent information leakage in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logging - only in development
   */
  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.info(message, data);
    }
  },

  /**
   * Warning logging - always logged
   */
  warn: (message: string, data?: unknown) => {
    console.warn(message, data);
  },

  /**
   * Error logging - always logged
   */
  error: (message: string, error?: unknown) => {
    console.error(message, error);
  },
};
