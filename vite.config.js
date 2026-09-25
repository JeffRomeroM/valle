import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Valle',
        short_name: 'Valle',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          { src: 'valle.png', sizes: '192x192', type: 'image/png' },
          { src: 'valle.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://script.google.com/macros/s/AKfycbxJNweIxfw64CRx1shap292OcLTXsP2-Vmf9fskwbZZ_dKsDKv7Ru93Ua0JlUwrQHenVQ/exec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
