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

const MAX_ATTEMPTS = 200

export const hodokuGenerator: PuzzleGenerator = {
  id: 'hodoku',
  label: 'Hodoku',
  difficulties: DIFFICULTIES,
  defaultDifficulty: 'MEDIUM',

  async generate(difficulty: string, signal?: AbortSignal) {
    const targetDifficulty = difficulty as DifficultyType
    const qqwingTargets = QQWING_PREFILTER[difficulty] ?? []

    const q = new qqwingLib()
    q.setLogHistory(false)
    q.setRecordHistory(false)
    q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)

    let lastPuzzle: Grid | null = null
    let lastSolution: Grid | null = null

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      // Yield every 5 attempts to keep the UI responsive and allow abort checks
      if (attempt > 0 && attempt % 5 === 0) {
        await new Promise<void>(r => setTimeout(r, 0))
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      }

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

      lastPuzzle = puzzle
      lastSolution = solution

      if (rating.difficulty === targetDifficulty) {
        return { puzzle, solution }
      }
    }

    // Fallback: return last valid puzzle even if hodoku difficulty didn't match exactly
    if (lastPuzzle && lastSolution) {
      return { puzzle: lastPuzzle, solution: lastSolution }
    }

    throw new Error('Failed to generate a valid puzzle')
  },
}
