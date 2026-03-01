import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Dyno Pro - Power Meter',
        short_name: 'Dyno Pro',
        description: 'Measure your vehicle horsepower with sensor fusion.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [] // Wir lassen dies vorerst leer, Vercel/PWA plugin meckert nicht zwingend lokal, aber wir fügen in der Praxis echte Icons hinzu.
      }
    })
  ],
})
