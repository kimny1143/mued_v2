import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Unit test configuration - No testcontainers/Docker required
 * Uses mocks for all external dependencies
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    // No globalSetup - unit tests use mocks, not real DB
    testTimeout: 10000,
    include: [
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      // ★The component tests are pure UI (jsdom, mocks) — they run here, not under vitest.config.ts with
      //   testcontainers (conductor 2026-10-01, CI review: ~26 s per CI run for 6 files).
      'components/**/*.test.tsx',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
    ],
    mockReset: true,
    restoreMocks: true,
    reporters: ['default'],
    pool: 'threads',
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
