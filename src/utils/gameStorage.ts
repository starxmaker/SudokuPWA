import type { Grid } from './sudoku_types'

export const STORAGE_KEY = 'sudoku-pwa-state'

const V = 7 as const

export type CellColorValue = string[]
export type CandidateColorCell = CellColorValue[]
export type CellColorGrid = CellColorValue[][]
export type CandidateColorGrid = CandidateColorCell[][]
export type DrawingPoint = [number, number]
export type DrawingStroke = {
  color: string
  points: DrawingPoint[]
}
export type DrawingStrokes = DrawingStroke[]

type SavedV7 = {
  v: typeof V
  initial: Grid
  current: Grid
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  drawingStrokes: DrawingStrokes
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

function cloneNotes(n: number[][][]): number[][][] {
  return n.map(row => row.map(cell => [...cell]))
}

function cloneCellColors(colors: CellColorGrid): CellColorGrid {
  return colors.map(row => row.map(cell => [...cell]))
}

function cloneCandidateColors(colors: CandidateColorGrid): CandidateColorGrid {
  return colors.map(row => row.map(cell => cell.map(candidate => [...candidate])))
}

function cloneDrawingPoint([x, y]: DrawingPoint): DrawingPoint {
  return [x, y]
}

export function cloneDrawingStrokes(strokes: DrawingStrokes): DrawingStrokes {
  return strokes.map(stroke => ({
    color: stroke.color,
    points: stroke.points.map(cloneDrawingPoint),
  }))
}

function emptyNotes(): number[][][] {
  return Array.from({length: 9}, () => Array.from({length: 9}, () => []))
}

export function emptyCellColors(): CellColorGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as string[]))
}

export function emptyCandidateColors(): CandidateColorGrid {
  return Array.from(
    { length: 9 },
    () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as string[])),
  )
}

export function emptyDrawingStrokes(): DrawingStrokes {
  return []
}

function normalizeColorValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }
  return typeof value === 'string' ? [value] : []
}

function normalizeCellColors(colors: unknown): CellColorGrid {
  if (!Array.isArray(colors) || colors.length !== 9) return emptyCellColors()
  return colors.map(row =>
    Array.isArray(row) && row.length === 9
      ? row.map(cell => normalizeColorValue(cell))
      : Array.from({ length: 9 }, () => [] as string[]),
  )
}

function normalizeCandidateCell(cell: unknown): CandidateColorCell {
  if (!Array.isArray(cell) || cell.length !== 9) {
    return Array.from({ length: 9 }, () => [] as string[])
  }
  return cell.map(candidate => normalizeColorValue(candidate))
}

function normalizeCandidateColors(colors: unknown): CandidateColorGrid {
  if (!Array.isArray(colors) || colors.length !== 9) return emptyCandidateColors()
  return colors.map(row =>
    Array.isArray(row) && row.length === 9
      ? row.map(cell => normalizeCandidateCell(cell))
      : Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as string[])),
  )
}

function normalizeDrawingPoint(point: unknown): DrawingPoint | null {
  if (!Array.isArray(point) || point.length !== 2) return null
  const [x, y] = point
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }
  return [
    Math.max(0, Math.min(1, x)),
    Math.max(0, Math.min(1, y)),
  ]
}

function normalizeDrawingStroke(stroke: unknown): DrawingStroke | null {
  if (!stroke || typeof stroke !== 'object') {
    return null
  }
  const candidate = stroke as { color?: unknown; points?: unknown }
  if (typeof candidate.color !== 'string' || !Array.isArray(candidate.points)) {
    return null
  }
  const points = candidate.points
    .map(point => normalizeDrawingPoint(point))
    .filter((point): point is DrawingPoint => point !== null)
  if (points.length === 0) return null
  return { color: candidate.color, points }
}

function normalizeDrawingStrokes(strokes: unknown): DrawingStrokes {
  if (!Array.isArray(strokes)) return emptyDrawingStrokes()
  return strokes
    .map(stroke => normalizeDrawingStroke(stroke))
    .filter((stroke): stroke is DrawingStroke => stroke !== null)
}

/** Read saved game. Returns null solution for legacy saves that predate V3. */
export function loadSaved(): {
  initial: Grid
  current: Grid
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  drawingStrokes: DrawingStrokes
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
          drawingStrokes: emptyDrawingStrokes(),
        }
      }
      if (parsed && typeof parsed === 'object') {
        if ((parsed.v === 7) && parsed.initial && parsed.current) {
          return {
            initial: cloneGrid(parsed.initial),
            current: cloneGrid(parsed.current),
            solution: parsed.solution ? cloneGrid(parsed.solution) : null,
            notes: parsed.notes ? cloneNotes(parsed.notes) : emptyNotes(),
            cellColors: parsed.cellColors ? normalizeCellColors(parsed.cellColors) : emptyCellColors(),
            candidateColors: parsed.candidateColors ? normalizeCandidateColors(parsed.candidateColors) : emptyCandidateColors(),
            drawingStrokes: parsed.drawingStrokes ? normalizeDrawingStrokes(parsed.drawingStrokes) : emptyDrawingStrokes(),
          }
        }
        if ((parsed.v === 6) && parsed.initial && parsed.current) {
          return {
            initial: cloneGrid(parsed.initial),
            current: cloneGrid(parsed.current),
            solution: parsed.solution ? cloneGrid(parsed.solution) : null,
            notes: parsed.notes ? cloneNotes(parsed.notes) : emptyNotes(),
            cellColors: parsed.cellColors ? normalizeCellColors(parsed.cellColors) : emptyCellColors(),
            candidateColors: parsed.candidateColors ? normalizeCandidateColors(parsed.candidateColors) : emptyCandidateColors(),
            drawingStrokes: emptyDrawingStrokes(),
          }
        }
        if ((parsed.v === 5) && parsed.initial && parsed.current) {
          return {
            initial: cloneGrid(parsed.initial),
          current: cloneGrid(parsed.current),
            solution: parsed.solution ? cloneGrid(parsed.solution) : null,
            notes: parsed.notes ? cloneNotes(parsed.notes) : emptyNotes(),
            cellColors: parsed.cellColors ? normalizeCellColors(parsed.cellColors) : emptyCellColors(),
            candidateColors: parsed.candidateColors ? normalizeCandidateColors(parsed.candidateColors) : emptyCandidateColors(),
            drawingStrokes: emptyDrawingStrokes(),
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
            drawingStrokes: emptyDrawingStrokes(),
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
            drawingStrokes: emptyDrawingStrokes(),
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
export const BRUSH_PREFS_KEY = 'sudoku-pwa-brush-prefs'

type BrushPrefs = {
  activeColors: string[]
  activeDrawingColors: string[]
  candidateMode: boolean
}

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

export function saveBrushPrefs(activeColors: string[], candidateMode: boolean, activeDrawingColors: string[]): void {
  try {
    const payload: BrushPrefs = {
      activeColors: [...activeColors],
      activeDrawingColors: [...activeDrawingColors],
      candidateMode,
    }
    localStorage.setItem(BRUSH_PREFS_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

export function loadBrushPrefs(): BrushPrefs | null {
  try {
    const s = localStorage.getItem(BRUSH_PREFS_KEY)
    if (!s) return null
    const parsed = JSON.parse(s)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.candidateMode === 'boolean'
    ) {
      const activeColors = Array.isArray(parsed.activeColors)
        ? parsed.activeColors.filter((entry): entry is string => typeof entry === 'string')
        : typeof parsed.activeColor === 'string'
          ? [parsed.activeColor]
          : []
      const activeDrawingColors = Array.isArray(parsed.activeDrawingColors)
        ? parsed.activeDrawingColors.filter((entry): entry is string => typeof entry === 'string')
        : typeof parsed.activeDrawingColor === 'string'
          ? [parsed.activeDrawingColor]
          : []

      return {
        activeColors,
        activeDrawingColors,
        candidateMode: parsed.candidateMode,
      }
    }
  } catch { /* ignore */ }
  return null
}

export function saveGame(
  initial: Grid,
  current: Grid,
  solution: Grid | null = null,
  notes: number[][][] = emptyNotes(),
  cellColors: CellColorGrid = emptyCellColors(),
  candidateColors: CandidateColorGrid = emptyCandidateColors(),
  drawingStrokes: DrawingStrokes = emptyDrawingStrokes(),
): void {
  try {
    const payload: SavedV7 = {
      v: V,
      initial: cloneGrid(initial),
      current: cloneGrid(current),
      solution: solution ? cloneGrid(solution) : null,
      notes: cloneNotes(notes),
      cellColors: cloneCellColors(cellColors),
      candidateColors: cloneCandidateColors(candidateColors),
      drawingStrokes: cloneDrawingStrokes(drawingStrokes),
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
