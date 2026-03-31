import { defineConfig } from 'vitest/config'
import pkg from './package.json'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __REPO_URL__: JSON.stringify(pkg.homepage),
  },
})
