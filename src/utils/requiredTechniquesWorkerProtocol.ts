import type { SudokuSolutionPathStep, HodokuDifficulty } from 'hodoku-core-js'

export type RequiredTechniquesResult = {
  difficulty: HodokuDifficulty
  score: number
  givenUp: boolean
  bruteForced: boolean
  unsolvable: boolean
  steps: SudokuSolutionPathStep[]
}

export type RequiredTechniquesWorkerRequest = {
  type: 'analyze'
  puzzle: string
}

export type RequiredTechniquesWorkerResponse =
  | {
      type: 'result'
      result: RequiredTechniquesResult | null
    }
  | {
      type: 'error'
      name: string
      message: string
    }
