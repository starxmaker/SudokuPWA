import qqwingLib from 'qqwing'
import { solve as sudokujsSolve } from '@starxmaker/sudoku.js'
import { SudokuSolver, type DifficultyType, type SolveRating } from 'hodoku-difficulty-rating-ts'
import type { Grid } from '../sudoku_types'
import type { PuzzleGenerator, DifficultyOption } from './types'

export type HodokuEstimationId =
  | 'VERY_EASY'
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXPERT'
  | 'NIGHTMARE'
  | 'DIABOLICAL'

type HodokuEstimation = {
  label: string
  difficulty: DifficultyType
  minScore: number | null
  maxScore: number | null
  qqwingTargets: number[]
}

export const HODOKU_ESTIMATIONS: Record<HodokuEstimationId, HodokuEstimation> = {
  VERY_EASY: {
    label: 'Very Easy',
    difficulty: 'EASY',
    minScore: null,
    maxScore: 300,
    qqwingTargets: [qqwingLib.Difficulty.SIMPLE, qqwingLib.Difficulty.EASY],
  },
  EASY: {
    label: 'Easy',
    difficulty: 'EASY',
    minScore: 300,
    maxScore: 800,
    qqwingTargets: [qqwingLib.Difficulty.SIMPLE, qqwingLib.Difficulty.EASY],
  },
  MEDIUM: {
    label: 'Medium',
    difficulty: 'MEDIUM',
    minScore: null,
    maxScore: 1000,
    qqwingTargets: [qqwingLib.Difficulty.INTERMEDIATE],
  },
  HARD: {
    label: 'Hard',
    difficulty: 'HARD',
    minScore: null,
    maxScore: 1600,
    qqwingTargets: [qqwingLib.Difficulty.EXPERT],
  },
  VERY_HARD: {
    label: 'Very Hard',
    difficulty: 'UNFAIR',
    minScore: null,
    maxScore: 1800,
    qqwingTargets: [qqwingLib.Difficulty.EXPERT],
  },
  EXPERT: {
    label: 'Expert',
    difficulty: 'EXTREME',
    minScore: null,
    maxScore: 5000,
    qqwingTargets: [qqwingLib.Difficulty.EXPERT],
  },
  NIGHTMARE: {
    label: 'Nightmare',
    difficulty: 'EXTREME',
    minScore: 5000,
    maxScore: 10000,
    qqwingTargets: [qqwingLib.Difficulty.EXPERT],
  },
  DIABOLICAL: {
    label: 'Diabolical',
    difficulty: 'EXTREME',
    minScore: 10000,
    maxScore: null,
    qqwingTargets: [qqwingLib.Difficulty.EXPERT],
  },
}

const DIFFICULTIES: readonly DifficultyOption[] = (
  Object.entries(HODOKU_ESTIMATIONS) as [HodokuEstimationId, HodokuEstimation][]
).map(([id, estimation]) => ({
  id,
  label: estimation.label,
}))

export function matchesHodokuEstimation(
  rating: Pick<SolveRating, 'difficulty' | 'score'>,
  estimation: Pick<HodokuEstimation, 'difficulty' | 'minScore' | 'maxScore'>,
) {
  if (rating.difficulty !== estimation.difficulty) return false
  if (estimation.minScore !== null && rating.score < estimation.minScore) return false
  if (estimation.maxScore !== null && rating.score > estimation.maxScore) return false
  return true
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
    const config = HODOKU_ESTIMATIONS[difficulty as HodokuEstimationId]
    if (!config) {
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
      if (!config.qqwingTargets.includes(q.getDifficulty())) continue

      const puzzle = parseGrid(q.getPuzzleString())

      // Verify solvability with sudokujs
      const solution = sudokujsSolve(puzzle) as Grid | null
      if (!solution) continue

      // Stop early when the puzzle exceeds the requested score ceiling.
      const puzzleString = gridToString(puzzle)
      const rating = config.maxScore === null
        ? SudokuSolver.rateByScore(puzzleString)
        : SudokuSolver.rateByScore(puzzleString, config.maxScore)
      if (!rating.solved) continue

      if (matchesHodokuEstimation(rating, config)) {
        return { puzzle, solution }
      }
    }
  },
}
