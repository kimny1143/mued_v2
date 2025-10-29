import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./tests/setup/vitest.setup.ts'],

    // Global test timeout
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.*',
        '**/*.d.ts',
        '.next/**',
        'scripts/**',
      ],
      thresholds: {
        branches: 10,
        functions: 60,
        lines: 10,
        statements: 10,
      },
    },

    // Include/Exclude patterns
    include: [
      'lib/**/*.{test,spec}.{ts,tsx}',
      'app/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/e2e/**',
      'tests/*.spec.ts', // Exclude Playwright tests
    ],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,

    // Reporters
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/index.html',
    },

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
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