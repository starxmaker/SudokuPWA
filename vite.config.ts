import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig(async () => {
  const react = (await import('@vitejs/plugin-react')).default
  return {
    base: '/SudokuPWA/',
    plugins: [
      react(),
      VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icons/*.{svg,png}'],
        manifest: {
          name: 'Sudoku PWA',
          short_name: 'Sudoku',
          start_url: '/SudokuPWA/',
          scope: '/SudokuPWA/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#0b6cff',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,cjs,css,html,svg,png,ico,woff,woff2,txt,md}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        }
      })
    ],
    optimizeDeps: {
      exclude: ['hodoku-core-js'],
    },
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __REPO_URL__: JSON.stringify(pkg.homepage) },
    server: { port: 5173 }
  }
})
