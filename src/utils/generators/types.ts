import type { Grid } from '../sudoku_types'

export interface DifficultyOption {
  id: string
  label: string
}

export interface PuzzleGenerator {
  readonly id: string
  readonly label: string
  readonly difficulties: readonly DifficultyOption[]
  readonly defaultDifficulty: string
  generate(difficulty: string, signal?: AbortSignal): Promise<{ puzzle: Grid; solution: Grid }>
}
