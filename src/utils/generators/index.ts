import type { PuzzleGenerator, DifficultyOption } from './types'
import { qqwingGenerator } from './qqwing'
import { sudokujsGenerator } from './sudokujs'

export type { PuzzleGenerator, DifficultyOption }

/**
 * All registered puzzle generators, in display order.
 * To add a new generator: import it and append it to this array.
 */
export const GENERATORS: readonly PuzzleGenerator[] = [
  qqwingGenerator,
  sudokujsGenerator,
]

export const DEFAULT_GENERATOR_ID = 'qqwing'

export function getGenerator(id: string): PuzzleGenerator {
  return GENERATORS.find(g => g.id === id) ?? qqwingGenerator
}
