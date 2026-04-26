import type { Grid } from './sudoku_types'
import type { GameDifficulty } from './generators/types'

export type GenerateWorkerRequest = {
  type: 'generate'
  difficulty: GameDifficulty
}

export type GenerateWorkerResponse =
  | {
      type: 'result'
      puzzle: Grid
      solution: Grid
    }
  | {
      type: 'error'
      name?: string
      message: string
    }
