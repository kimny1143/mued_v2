import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use Node environment for integration tests (not jsdom)
    // This ensures Node.js APIs like fetch are available
    environment: 'node',

    // Setup files for integration tests
    setupFiles: ['./tests/setup/vitest.integration.setup.ts'],

    // Global setup (testcontainers)
    globalSetup: ['./tests/setup/testcontainers.setup.ts'],

    // Longer timeout for integration tests
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
    },

    // Include only integration tests
    include: [
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/e2e/**',
      'tests/unit/**',
      'tests/performance/**',
    ],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,

    // Reporters
    reporters: ['default'],

    // Run integration tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Watch mode configuration
    watch: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/components': path.resolve(__dirname, './components'),
      '@/types': path.resolve(__dirname, './types'),
      '@/db': path.resolve(__dirname, './db'),
    },
  },
});