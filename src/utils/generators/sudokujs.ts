import { generate, solve as libSolve } from '@starxmaker/sudoku.js'
import type { Difficulty as LibDifficulty } from '@starxmaker/sudoku.js'
import type { Grid } from '../sudoku_types'
import type { PuzzleGenerator, DifficultyOption } from './types'

const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'easy',      label: 'Easy' },
  { id: 'medium',    label: 'Medium' },
  { id: 'hard',      label: 'Hard' },
  { id: 'very-hard', label: 'Very Hard' },
  { id: 'expert',    label: 'Expert' },
]

const LIB_DIFFICULTY: Record<string, LibDifficulty> = {
  easy:        'easy',
  medium:      'medium',
  hard:        'hard',
  'very-hard': 'very-hard',
  expert:      'insane',
}

export const sudokujsGenerator: PuzzleGenerator = {
  id: 'starxmaker',
  label: 'SudokuJS',
  difficulties: DIFFICULTIES,
  defaultDifficulty: 'medium',

  async generate(difficulty: string, signal?: AbortSignal) {
    const libDiff = LIB_DIFFICULTY[difficulty] ?? 'medium'
    const puzzle = (await generate(libDiff)) as Grid
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const solution = libSolve(puzzle) as Grid | null
    if (!solution) throw new Error('Failed to solve generated puzzle')
    return { puzzle, solution }
  },
}
