import qqwingLib from 'qqwing'
import { solve as sudokujsSolve } from '@starxmaker/sudoku.js'
import { SudokuSolver, type DifficultyType } from 'hodoku-difficulty-rating-ts'
import type { Grid } from '../sudoku_types'
import type { PuzzleGenerator, DifficultyOption } from './types'

const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'EASY',    label: 'Easy' },
  { id: 'MEDIUM',  label: 'Medium' },
  { id: 'HARD',    label: 'Hard' },
  { id: 'UNFAIR',  label: 'Unfair' },
  { id: 'EXTREME', label: 'Extreme' },
]

/**
 * Pre-filter map: hodoku target difficulty → qqwing difficulty values that are
 * considered a plausible match, so we skip hodoku's expensive rating on obviously
 * wrong puzzles.
 *
 * Mapping: simple → EASY, easy → EASY, intermediate → MEDIUM, expert → HARD/UNFAIR/EXTREME
 */
const QQWING_PREFILTER: Record<string, number[]> = {
  EASY:    [qqwingLib.Difficulty.SIMPLE, qqwingLib.Difficulty.EASY],
  MEDIUM:  [qqwingLib.Difficulty.INTERMEDIATE],
  HARD:    [qqwingLib.Difficulty.EXPERT],
  UNFAIR:  [qqwingLib.Difficulty.EXPERT],
  EXTREME: [qqwingLib.Difficulty.EXPERT],
}

function parseGrid(str: string): Grid {
  const flat = str.replace(/[^1-9.]/g, '')
  const grid: Grid = []
  for (let r = 0; r < 9; r++) {
    const row: number[] = []
    for (let c = 0; c < 9; c++) {
      const ch = flat[r * 9 + c]
      row.push(ch === '.' ? 0 : parseInt(ch, 10))
    }
    grid.push(row)
  }
  return grid
}

function gridToString(grid: Grid): string {
  return grid.flat().map(v => v === 0 ? '.' : String(v)).join('')
}

export const hodokuGenerator: PuzzleGenerator = {
  id: 'hodoku',
  label: 'Hodoku',
  difficulties: DIFFICULTIES,
  defaultDifficulty: 'MEDIUM',

  async generate(difficulty: string, signal?: AbortSignal) {
    const targetDifficulty = difficulty as DifficultyType
    const qqwingTargets = QQWING_PREFILTER[difficulty] ?? []
    if (qqwingTargets.length === 0) {
      throw new Error(`Unsupported difficulty: ${difficulty}`)
    }

    const q = new qqwingLib()
    q.setLogHistory(false)
    q.setRecordHistory(false)
    q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)

    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      if (!q.generatePuzzle()) continue

      // Pre-filter with qqwing's own difficulty rating (cheap)
      q.setRecordHistory(true)
      q.solve()
      q.setRecordHistory(false)
      if (!qqwingTargets.includes(q.getDifficulty())) continue

      const puzzle = parseGrid(q.getPuzzleString())

      // Verify solvability with sudokujs
      const solution = sudokujsSolve(puzzle) as Grid | null
      if (!solution) continue

      // Confirm difficulty with hodoku rating (expensive, only reached after qqwing pre-filter)
      const rating = SudokuSolver.rate(gridToString(puzzle))
      if (!rating.solved) continue

      if (rating.difficulty === targetDifficulty) {
        return { puzzle, solution }
      }
    }
  },
}
