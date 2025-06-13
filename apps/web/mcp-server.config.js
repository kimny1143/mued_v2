/**
 * MCP Server Configuration for Playwright
 * This configuration is used by the mcp-server-playwright package
 */

module.exports = {
  // Server settings
  server: {
    port: 3333,
    host: 'localhost',
    cors: {
      enabled: true,
      origin: ['http://localhost:3000', 'http://localhost:3333'],
      credentials: true
    }
  },

  // Authentication
  auth: {
    enabled: process.env.NODE_ENV === 'production',
    token: process.env.PLAYWRIGHT_MCP_TOKEN || 'dev-token'
  },

  // Playwright specific settings
  playwright: {
    // Browser launch options
    launchOptions: {
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 50 : 0,
      devtools: process.env.DEBUG === 'true'
    },

    // Context options
    contextOptions: {
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    },

    // Default timeouts
    timeouts: {
      default: 30000,
      navigation: 30000,
      action: 10000
    }
  },

  // Logging
  logging: {
    level: process.env.DEBUG ? 'debug' : 'info',
    format: 'json',
    outputDir: './logs/mcp'
  },

  // Storage for screenshots, videos, etc.
  storage: {
    screenshots: './test-results/screenshots',
    videos: './test-results/videos',
    traces: './test-results/traces'
  },

  // Security
  security: {
    allowedDomains: [
      'localhost:3000',
      'dev.mued.jp',
      '*.vercel.app',
      'mued-lms.vercel.app'
    ],
    blockList: [
      'file://',
      'chrome://',
      'about:'
    ]
  }
};