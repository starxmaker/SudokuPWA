import type { Grid } from './sudoku_types'

export const STORAGE_KEY = 'sudoku-pwa-state'

const V = 5 as const

export type CellColorGrid = (string | null)[][]
export type CandidateColorGrid = ((string | null)[])[][]

type SavedV5 = {
  v: typeof V
  initial: Grid
  current: Grid
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

function cloneNotes(n: number[][][]): number[][][] {
  return n.map(row => row.map(cell => [...cell]))
}

function cloneCellColors(colors: CellColorGrid): CellColorGrid {
  return colors.map(row => [...row])
}

function cloneCandidateColors(colors: CandidateColorGrid): CandidateColorGrid {
  return colors.map(row => row.map(cell => [...cell]))
}

function emptyNotes(): number[][][] {
  return Array.from({length: 9}, () => Array.from({length: 9}, () => []))
}

export function emptyCellColors(): CellColorGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null))
}

export function emptyCandidateColors(): CandidateColorGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null)))
}

/** Read saved game. Returns null solution for legacy saves that predate V3. */
export function loadSaved(): {
  initial: Grid
  current: Grid
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
} | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) {
      const g = parsed as Grid
      if (g.length !== 9) return null
      return {
        initial: cloneGrid(g),
        current: cloneGrid(g),
        solution: null,
        notes: emptyNotes(),
        cellColors: emptyCellColors(),
        candidateColors: emptyCandidateColors(),
      }
    }
    if (parsed && typeof parsed === 'object') {
      if ((parsed.v === 5) && parsed.initial && parsed.current) {
        return {
          initial: cloneGrid(parsed.initial),
          current: cloneGrid(parsed.current),
          solution: parsed.solution ? cloneGrid(parsed.solution) : null,
          notes: parsed.notes ? cloneNotes(parsed.notes) : emptyNotes(),
          cellColors: parsed.cellColors ? cloneCellColors(parsed.cellColors) : emptyCellColors(),
          candidateColors: parsed.candidateColors ? cloneCandidateColors(parsed.candidateColors) : emptyCandidateColors(),
        }
      }
      if ((parsed.v === 4) && parsed.initial && parsed.current) {
        return {
          initial: cloneGrid(parsed.initial),
          current: cloneGrid(parsed.current),
          solution: parsed.solution ? cloneGrid(parsed.solution) : null,
          notes: parsed.notes ? cloneNotes(parsed.notes) : emptyNotes(),
          cellColors: emptyCellColors(),
          candidateColors: emptyCandidateColors(),
        }
      }
      // Legacy V2/V3 saves — no notes
      if ((parsed.v === 3 || parsed.v === 2) && parsed.initial && parsed.current) {
        return {
          initial: cloneGrid(parsed.initial),
          current: cloneGrid(parsed.current),
          solution: parsed.solution ? cloneGrid(parsed.solution) : null,
          notes: emptyNotes(),
          cellColors: emptyCellColors(),
          candidateColors: emptyCandidateColors(),
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export const COMPLETED_KEY = 'sudoku-pwa-completed'

export function saveCompleted(): void {
  try { localStorage.setItem(COMPLETED_KEY, '1') } catch { /* ignore */ }
}

export function loadCompleted(): boolean {
  try { return localStorage.getItem(COMPLETED_KEY) === '1' } catch { return false }
}

export function clearCompleted(): void {
  try { localStorage.removeItem(COMPLETED_KEY) } catch { /* ignore */ }
}

export const ELAPSED_KEY = 'sudoku-pwa-elapsed'

export function saveElapsed(seconds: number): void {
  try { localStorage.setItem(ELAPSED_KEY, String(seconds)) } catch { /* ignore */ }
}

export function loadElapsed(): number {
  try {
    const s = localStorage.getItem(ELAPSED_KEY)
    if (s !== null) { const n = parseInt(s, 10); if (!isNaN(n) && n >= 0) return n }
  } catch { /* ignore */ }
  return 0
}

export function clearElapsed(): void {
  try { localStorage.removeItem(ELAPSED_KEY) } catch { /* ignore */ }
}

export function saveGame(
  initial: Grid,
  current: Grid,
  solution: Grid | null = null,
  notes: number[][][] = emptyNotes(),
  cellColors: CellColorGrid = emptyCellColors(),
  candidateColors: CandidateColorGrid = emptyCandidateColors(),
): void {
  try {
    const payload: SavedV5 = {
      v: V,
      initial: cloneGrid(initial),
      current: cloneGrid(current),
      solution: solution ? cloneGrid(solution) : null,
      notes: cloneNotes(notes),
      cellColors: cloneCellColors(cellColors),
      candidateColors: cloneCandidateColors(candidateColors),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

/** Encode a 9×9 grid as 81 chars with dots for empty squares, e.g. "53.6..." */
export function encodeGrid(grid: Grid): string {
  return grid.flat().map(n => n === 0 ? '.' : String(n)).join('')
}

/** Decode a string produced by encodeGrid back to a 9×9 Grid, or null if invalid.
 *  Supports both new format (81 chars, dots for 0) and old format (9 rows of digits joined by '-').
 */
export function decodeGrid(s: string): Grid | null {
  // New format: 81 chars of digits and dots
  if (/^[1-9.]{81}$/.test(s)) {
    const flat = s.split('').map(ch => ch === '.' ? 0 : Number(ch))
    const grid: Grid = []
    for (let r = 0; r < 9; r++) grid.push(flat.slice(r * 9, r * 9 + 9))
    return grid
  }
  // Old format: 9 rows of digits joined by '-'
  if (/^[0-9]{9}(-[0-9]{9}){8}$/.test(s)) {
    const rows = s.split('-')
    const grid: Grid = []
    for (const row of rows) {
      const nums = row.split('').map(Number)
      if (nums.some(n => n < 0 || n > 9)) return null
      grid.push(nums)
    }
    return grid
  }
  return null
}
