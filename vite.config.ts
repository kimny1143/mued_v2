import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, './app/components'),
      '@ui': path.resolve(__dirname, './app/components/ui'),
      '@lib': path.resolve(__dirname, './lib'),
    }
  }
}); 