import type { PuzzleGenerator, DifficultyOption } from './types'
import { hodokuGenerator } from './hodoku'

export type { PuzzleGenerator, DifficultyOption }

export const GENERATORS: readonly PuzzleGenerator[] = [
  hodokuGenerator,
]

export const DEFAULT_GENERATOR_ID = 'hodoku'

export function getGenerator(_id?: string): PuzzleGenerator {
  return hodokuGenerator
}
