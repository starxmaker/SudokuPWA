import '@testing-library/jest-dom'
import { initSudoku } from './utils/sudoku'

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }

  const css = window.CSS ?? {}
  if (typeof css.supports !== 'function') {
    Object.defineProperty(window, 'CSS', {
      configurable: true,
      value: {
        ...css,
        supports: () => false,
      },
    })
  }
}

await initSudoku()
