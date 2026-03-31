import type { Grid } from './sudoku_types'
import { generate, solve as libSolve } from '@starxmaker/sudoku.js'
import type { Difficulty as LibDifficulty } from '@starxmaker/sudoku.js'

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export function solveGrid(puzzle: Grid): Grid | null {
  return libSolve(puzzle) as Grid | null
}

export type { Grid }

/** Our app difficulty names. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'very-hard' | 'expert'

/** Maps our difficulty names to the library's named difficulty strings. */
const LIB_DIFFICULTY: Record<Difficulty, LibDifficulty> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  'very-hard': 'very-hard',
  expert: 'insane',
}

export async function generateGame(difficulty: Difficulty = 'medium'): Promise<{ puzzle: Grid; solution: Grid }> {
  const puzzle = (await generate(LIB_DIFFICULTY[difficulty])) as Grid
  const solution = libSolve(puzzle) as Grid | null
  if (!solution) throw new Error('Failed to solve generated puzzle')
  return { puzzle, solution }
}

/** No-op – kept for bootstrap call-site compatibility. */
export async function initSudoku(): Promise<void> {}
