import type { Grid } from './sudoku_types'
import { generate, solve as libSolve } from '@starxmaker/sudoku.js'

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export function solveGrid(puzzle: Grid): Grid | null {
  return libSolve(puzzle) as Grid | null
}

export type { Grid }

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const DIFFICULTY_GIVENS: Record<Difficulty, number> = {
  easy: 38,
  medium: 30,
  hard: 28,
  expert: 23,
}

export async function generateGame(difficulty: Difficulty = 'medium'): Promise<{ puzzle: Grid; solution: Grid }> {
  const puzzle = (await generate(DIFFICULTY_GIVENS[difficulty])) as Grid
  const solution = libSolve(puzzle) as Grid | null
  if (!solution) throw new Error('Failed to solve generated puzzle')
  return { puzzle, solution }
}

/** No-op – kept for bootstrap call-site compatibility. */
export async function initSudoku(): Promise<void> {}
