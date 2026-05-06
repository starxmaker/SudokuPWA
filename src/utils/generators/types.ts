import { GameDifficulty } from '../difficulties'
import type { Grid } from '../sudoku_types'

export type SolvablePuzzle = {
  puzzle: Grid,
  solution: Grid
  difficulty: GameDifficulty
  score: number | null
}

export interface SolveRating {
  puzzle: string,
  solution: string | null,
  difficulty: GameDifficulty | null,
  score: number | null
}
