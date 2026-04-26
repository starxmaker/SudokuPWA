import type { Grid } from './sudoku_types'

export type GenerateWorkerRequest = {
  type: 'generate'
  difficulty: string
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
