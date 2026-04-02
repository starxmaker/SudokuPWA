import { solve as libSolve } from '@starxmaker/sudoku.js'
import type { Grid, Difficulty } from './sudoku_types'
import { getGenerator, DEFAULT_GENERATOR_ID } from './generators'

export type { Grid, Difficulty }

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export function solveGrid(puzzle: Grid): Grid | null {
  return libSolve(puzzle) as Grid | null
}

export async function generateGame(
  difficulty: string = 'easy',
  generatorId: string = DEFAULT_GENERATOR_ID,
  signal?: AbortSignal,
): Promise<{ puzzle: Grid; solution: Grid }> {
  return getGenerator(generatorId).generate(difficulty, signal)
}

/** No-op – kept for bootstrap call-site compatibility. */
export async function initSudoku(): Promise<void> {}
