import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'TrainerDesk — Personal Training OS',
        short_name: 'TrainerDesk',
        description:
          'Daily client schedule, live session workout logger, progress analytics, and diet plans for personal gym trainers.',
        theme_color: '#C9521D',
        background_color: '#F7F6F3',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/v1\/(sessions|clients|exercises|foods|reports\/dashboard-stats)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'trainerdesk-api-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'trainerdesk-uploads-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', 'axios'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
});
