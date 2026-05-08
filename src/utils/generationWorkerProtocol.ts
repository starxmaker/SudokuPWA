import type { Grid } from './sudoku_types'
import type { GameDifficulty } from './difficulties'

export type GenerateWorkerRequest = {
  type: 'stream-start'
  difficulty: GameDifficulty
}

export type GenerateWorkerResponse =
  | {
      type: 'stream-puzzle'
      puzzle: Grid
      solution: Grid
      difficulty: GameDifficulty
      score: number | null
    }
  | {
      type: 'error'
      name?: string
      message: string
    }
