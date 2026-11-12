import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const packageVersion = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;
const buildTimestamp = new Date().toISOString().slice(0, 19) + 'Z';
const buildStamp = `${packageVersion} · ${buildTimestamp}`;

export default defineConfig({
  // Relative URLs keep one build valid at a domain root (Vercel) and under a
  // repository subpath (GitHub Pages); HashRouter keeps the document URL fixed.
  base: './',
  define: {
    // Visible in Settings so a user can tell which build they are running.
    __BUILD_VERSION__: JSON.stringify(buildStamp),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-180.png'],
      manifest: {
        name: 'Workout — 3-Day Full-Body Tracker',
        short_name: 'Workout',
        description: 'Personal 3-day full-body lean muscle program tracker with superset timers and progression.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0B',
        theme_color: '#0A0A0B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Keep the entry chunk small enough to stay under Vite's warning size.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion'],
          zod: ['zod'],
          dates: ['date-fns'],
        },
      },
    },
  },
});