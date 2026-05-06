import { createRuntime } from 'hodoku-core-js'
import type { SolveRating } from './types'
import { GameDifficulty } from '../difficulties'
import type { Grid } from '../sudoku_types'
import { decodeGrid, encodeGrid } from '../gameStorage'

type PuzzleLine = {
  puzzleNumber: number
  solution: string
  difficulty: HodokuDifficulty
  score: number
  givenUp: boolean
}

type HodokuEstimation = {
  difficulty: HodokuDifficulty
  minScore?: number
  maxScore?: number
}

type HodokuDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'UNFAIR' | 'EXTREME'


let runtimeWarmupPromise: Promise<boolean> | null = null

export function warmupHodoku(): Promise<boolean> {
  if (!runtimeWarmupPromise) {
    runtimeWarmupPromise = (async (): Promise<boolean> => {
      try {
        const pool = createRuntime()
        try {
          const samplePuzzle = '.................................................................................'
          await pool.executeCommand(['/o', 'stdout', samplePuzzle])
          return true
        } finally {
          pool.dispose()
        }
      } catch {
        return false
      }
    })()
  }
  return runtimeWarmupPromise
}

export const HODOKU_ESTIMATIONS: Record<GameDifficulty, HodokuEstimation> = {
  VERY_EASY: {
    difficulty: 'EASY',
    maxScore: 300,
  },
  EASY: {
    difficulty: 'EASY',
    minScore: 300,
    maxScore: 800,
  },
  MEDIUM: {
    difficulty: 'MEDIUM',
    maxScore: 1000,
  },
  HARD: {
    difficulty: 'HARD',
    maxScore: 1600,
  },
  VERY_HARD: {
    difficulty: 'UNFAIR',
    maxScore: 1800,
  },
  EXPERT: {
    difficulty: 'EXTREME',
    maxScore: 5000,
  },
  NIGHTMARE: {
    difficulty: 'EXTREME',
    minScore: 5000,
    maxScore: 10000,
  },
  DIABOLICAL: {
    difficulty: 'EXTREME',
    minScore: 10000
  },
}

export async function evaluate(
  puzzles: string[],
  onValidNewPuzzle?: (rating: SolveRating) => boolean,
  signal?: AbortSignal
): Promise<SolveRating[]> {
  const results: SolveRating[] = []
  const args = ['/o', 'stdout', '/vs', ...puzzles]
  const pool = createRuntime()
  await pool.executeCommand(args, line => {
    if (signal?.aborted) {
      return false
    }
    const puzzleLine = map(line)
    if (puzzleLine) {
      const solution = puzzleLine.solution
      const puzzle = puzzles[puzzleLine.puzzleNumber - 1]
      const validSolution = !puzzleLine.givenUp && isValidSudokuSolution(solution)
      const result : SolveRating = {
        puzzle,
        solution : validSolution ? solution : null,
        difficulty: validSolution ? getMatchingDifficulty(puzzleLine.score, puzzleLine.difficulty) : null,
        score: validSolution ? puzzleLine.score : null,
      }
      if (onValidNewPuzzle && validSolution) {
        const continueProcessing = onValidNewPuzzle(result)
        if (!continueProcessing) {
          return false
        }
      }
      results.push(result)
    }
  })
  pool.dispose()
  return results
}

export type VerifiedPuzzle = {
  solution: Grid
  difficulty: GameDifficulty | null
  score: number | null
}

export async function verifyPuzzle(puzzle: Grid, signal?: AbortSignal): Promise<VerifiedPuzzle | null> {
  const [rating] = await evaluate([encodeGrid(puzzle)], undefined, signal)
  if (!rating?.solution) {
    return null
  }

  const solution = decodeGrid(rating.solution)
  if (!solution) {
    return null
  }

  return {
    solution,
    difficulty: rating.difficulty,
    score: rating.score ?? null,
  }
}

const regex =
  /^([\.0-9]{81})\s+#(\d+)\s+(Easy|Medium|Hard|Unfair|Extreme)\s+\((\d+)\)$/

export const map = (line: string): PuzzleLine | null => {
  const match = line.trim().match(regex)
  if (match) {
    return {
      solution: match[1],
      puzzleNumber: Number(match[2]),
      difficulty: match[3].toUpperCase() as HodokuDifficulty,
      score: Number(match[4]),
      givenUp: line.includes('gu'),
    }
  }
  return null
}


function isValidSudokuSolution(solution : string) : boolean {
  if (!/^[1-9]{81}$/.test(solution)) return false;

  const grid = solution.split('').map(Number);

  const isSetValid = (nums: number[]) => {
    const seen = new Set(nums);
    return seen.size === 9 && nums.every(n => n >= 1 && n <= 9);
  };

  // Rows
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(grid[r * 9 + c]);
    }
    if (!isSetValid(row)) return false;
  }

  // Columns
  for (let c = 0; c < 9; c++) {
    const col = [];
    for (let r = 0; r < 9; r++) {
      col.push(grid[r * 9 + c]);
    }
    if (!isSetValid(col)) return false;
  }

  // 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const box = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r;
          const col = boxCol * 3 + c;
          box.push(grid[row * 9 + col]);
        }
      }
      if (!isSetValid(box)) return false;
    }
  }

  return true;
}

function getMatchingDifficulty (score: number, difficulty: HodokuDifficulty): GameDifficulty | null {
  for (const [gameDifficulty, estimation] of Object.entries(HODOKU_ESTIMATIONS) as [GameDifficulty, HodokuEstimation][]) {
    if (matchesHodokuEstimation(difficulty, score, estimation)) {
      return gameDifficulty
    }
  }
  return null
}

function matchesHodokuEstimation(
  difficulty: HodokuDifficulty,
  score: number,
  estimation: HodokuEstimation,
) {
  if (difficulty !== estimation.difficulty) return false
  if (estimation.minScore !== undefined && score < estimation.minScore) return false
  if (estimation.maxScore !== undefined && score >= estimation.maxScore) return false
  return true
}
