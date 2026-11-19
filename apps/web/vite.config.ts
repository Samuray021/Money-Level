import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
