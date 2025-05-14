/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    __dirname: JSON.stringify(path.resolve())
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './testing/setup.ts',
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', '.storybook', '.vercel', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'dist/**',
        '.storybook/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}'
      ]
    },
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './app/components'),
      '@ui': path.resolve(__dirname, './app/components/ui'),
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
}); 