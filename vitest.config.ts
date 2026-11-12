import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register': path.resolve(__dirname, 'src/test/pwaRegisterStub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // user-event flows are CPU-heavy; a short timeout aborts mid-flow and its
    // queued events leak into the next test, cascading spurious failures.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});