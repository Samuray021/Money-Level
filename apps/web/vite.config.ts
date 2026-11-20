import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const packageManifest = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  define: {
    __MONEY_LEVEL_APP_VERSION__: JSON.stringify(
      process.env.MONEY_LEVEL_BUILD_VERSION ?? packageManifest.version,
    ),
  },
  plugins: [
    react(),
    VitePWA({
      manifest: false,
      injectRegister: 'inline',
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,webmanifest,png,wav}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      },
    }),
  ],
});
