import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,ttf}']
      },
      manifest: {
        name: 'مزرعة الزوين',
        short_name: 'مزرعتي',
        theme_color: '#1a7a42',
        background_color: '#f4f7f6',
        display: 'standalone',
      }
    })
  ],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
