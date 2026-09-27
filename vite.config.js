import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

export default defineConfig({
  // Dibaca App / UpdaterAlert untuk membandingkan versi bundle aktif vs /ota/version.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    headers: {
      // Firebase Auth signInWithPopup butuh window.closed untuk deteksi saat user selesai login.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true,
      },
      manifest: false, // Digenerate secara dinamis di frontend sesuai profil/logo toko
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // WAJIB: Cegah PWA menahan index.html lama di precache saat rilis baru deploy
        navigateFallback: null,
        globIgnores: ['index.html'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Pemecahan vendor chunk untuk memangkas file tunggal 1.2 MB menjadi chunk terpisah
        // Meningkatkan performa parsing di HP/tablet kasir dan optimasi cache browser.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/firebase/firestore')) {
            return 'vendor-firestore';
          }
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-canvas';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-ui';
          }
          if (id.includes('@capacitor') || id.includes('@capgo')) {
            return 'vendor-capacitor';
          }
          return 'vendor';
        },
      },
    },
  },
})