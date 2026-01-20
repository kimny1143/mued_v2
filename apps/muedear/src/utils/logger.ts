/**
 * Logger utility - only logs in development mode
 * Use this instead of console.log to prevent production log leakage
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

const noop = () => {};

const createLogger = (): Logger => {
  if (__DEV__) {
    return {
      log: (...args: any[]) => console.log(...args),
      warn: (...args: any[]) => console.warn(...args),
      error: (...args: any[]) => console.error(...args),
      info: (...args: any[]) => console.info(...args),
      debug: (...args: any[]) => console.debug(...args),
    };
  }

  // In production, only log errors (for crash reporting)
  return {
    log: noop,
    warn: noop,
    error: (...args: any[]) => console.error(...args),
    info: noop,
    debug: noop,
  };
};

export const logger = createLogger();
