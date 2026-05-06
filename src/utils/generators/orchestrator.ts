import * as qqwing from './qqwing'
import { Grid } from '../sudoku_types'
import * as hodoku from './hodoku'
import { SolvablePuzzle, SolveRating } from './types'
import { GameDifficulty } from '../difficulties'

const QQWING_PUZZLE_BATCHES = 10

function parseGrid(str: string): Grid {
  const flat = str.replace(/[^1-9.]/g, '')
  const grid: Grid = []
  for (let r = 0; r < 9; r++) {
    const row: number[] = []
    for (let c = 0; c < 9; c++) {
      const ch = flat[r * 9 + c]
      row.push(ch === '.' ? 0 : parseInt(ch, 10))
    }
    grid.push(row)
  }
  return grid
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

export async function generateForDifficulty(
  targetDifficulty: GameDifficulty,
  signal?: AbortSignal,
): Promise<SolvablePuzzle> {
  while (true) {
    throwIfAborted(signal)

    let puzzles = qqwing.generate(QQWING_PUZZLE_BATCHES, signal)
    if (puzzles.length === 0) continue

    let matched: SolvablePuzzle | null = null
    await hodoku.evaluate(puzzles, rating => {
      const potential = parsePuzzle(rating)
      if (!potential) return true
      if (potential.difficulty !== targetDifficulty) return true
      matched = potential
      return false
    }, signal)

    if (matched) return matched
  }
}

function parsePuzzle(rating : SolveRating) : SolvablePuzzle  | null {
  if (rating.difficulty === null || rating.solution === null || rating.score === null) return null
  return {
    puzzle: parseGrid(rating.puzzle),
    solution: parseGrid(rating.solution),
    difficulty: rating.difficulty,
    score: rating.score
  }
}

export async function generateContinuously(
  onGenerate: (puzzle: SolvablePuzzle) => boolean | void,
  signal?: AbortSignal,
): Promise<void> {
  while (true) {
    throwIfAborted(signal)

    // generation
    let puzzles = qqwing.generate(QQWING_PUZZLE_BATCHES, signal)
    if (puzzles.length === 0) continue

    // Calibrate difficulty by human techniques 
      await hodoku.evaluate(puzzles, rating => {
      const potential = parsePuzzle(rating)
      if (!potential) return true
      const result = onGenerate(potential)
      return result !== false
    }, signal)

    throwIfAborted(signal)
  }
}
