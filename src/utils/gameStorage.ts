import type { Grid } from './sudoku_types'

export const STORAGE_KEY = 'sudoku-pwa-state'

const V = 3 as const

type SavedV3 = { v: typeof V; initial: Grid; current: Grid; solution: Grid | null }

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

/** Read saved game. Returns null solution for legacy saves that predate V3. */
export function loadSaved(): { initial: Grid; current: Grid; solution: Grid | null } | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) {
      const g = parsed as Grid
      if (g.length !== 9) return null
      return { initial: cloneGrid(g), current: cloneGrid(g), solution: null }
    }
    if (parsed && typeof parsed === 'object') {
      if ((parsed.v === 3 || parsed.v === 2) && parsed.initial && parsed.current) {
        return {
          initial: cloneGrid(parsed.initial),
          current: cloneGrid(parsed.current),
          solution: parsed.solution ? cloneGrid(parsed.solution) : null,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveGame(initial: Grid, current: Grid, solution: Grid | null = null): void {
  try {
    const payload: SavedV3 = {
      v: V,
      initial: cloneGrid(initial),
      current: cloneGrid(current),
      solution: solution ? cloneGrid(solution) : null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

/** Encode a 9×9 grid as 9 rows joined by '-', e.g. "120056789-..." */
export function encodeGrid(grid: Grid): string {
  return grid.map(row => row.join('')).join('-')
}

/** Decode a string produced by encodeGrid back to a 9×9 Grid, or null if invalid. */
export function decodeGrid(s: string): Grid | null {
  // Must be exactly digits and dashes in the pattern NNNNNNNNN-...-NNNNNNNNN
  if (!/^[0-9]{9}(-[0-9]{9}){8}$/.test(s)) return null
  const rows = s.split('-')
  const grid: Grid = []
  for (const row of rows) {
    const nums = row.split('').map(Number)
    if (nums.some(n => n < 0 || n > 9)) return null
    grid.push(nums)
  }
  return grid
}
