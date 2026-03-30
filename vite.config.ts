import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig(async () => {
  const react = (await import('@vitejs/plugin-react')).default
  return {
    base: '/SudokuPWA/',
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    server: { port: 5173 }
  }
})
