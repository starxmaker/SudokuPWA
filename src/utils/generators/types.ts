import type { Grid } from '../sudoku_types'

export enum QQWingDifficulty { UNKNOWN = 0, SIMPLE = 1, EASY = 2, INTERMEDIATE = 3, EXPERT = 4 }

export type GameDifficulty =
  | 'VERY_EASY'
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXPERT'
  | 'NIGHTMARE'
  | 'DIABOLICAL'


export type DifficultyConfiguration = {
  label: string,
  qqwingConstraint: QQWingConstraint
  hodokuConstraint?: HodokuConstraint
}

export type PuzzleSolutionPair = {
    puzzle: Grid,
    solution: Grid
}

export type HodokuDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'UNFAIR' | 'EXTREME'
export interface HodokuConstraint {
  difficulty: HodokuDifficulty
  minScore: number | null
  maxScore: number | null
}

export interface SolveRating {
  puzzle: string,
  difficulty: HodokuDifficulty,
  score: number
}

export interface QQWingConstraint {
  quantity?: number
  difficulty: QQWingDifficulty
}
