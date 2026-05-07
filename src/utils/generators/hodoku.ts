import { rateSudokus, HodokuDifficulty } from 'hodoku-core-js'
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


export const HODOKU_ESTIMATIONS: Record<GameDifficulty, HodokuEstimation> = {
  VERY_EASY: {
    difficulty: 'Easy',
    maxScore: 300,
  },
  EASY: {
    difficulty: 'Easy',
    minScore: 300,
    maxScore: 800,
  },
  MEDIUM: {
    difficulty: 'Medium',
    maxScore: 1000,
  },
  HARD: {
    difficulty: 'Hard',
    maxScore: 1600,
  },
  VERY_HARD: {
    difficulty: 'Unfair',
    maxScore: 1800,
  },
  EXPERT: {
    difficulty: 'Extreme',
    maxScore: 5000,
  },
  NIGHTMARE: {
    difficulty: 'Extreme',
    minScore: 5000,
    maxScore: 10000,
  },
  DIABOLICAL: {
    difficulty: 'Extreme',
    minScore: 10000
  },
}

export async function evaluate(
  puzzles: string[],
  onValidNewPuzzle?: (rating: SolveRating) => boolean,
  signal?: AbortSignal
): Promise<SolveRating[]> {
  const results: SolveRating[] = []
  await rateSudokus({
    puzzles,
    includeSolution: true
  }, (rating, control) => {
    if (signal?.aborted) {
      control.cancel()
      return
    }
    const solution = rating.solution ?? null
    const validSolution = !rating.givenUp && !rating.unsolvable && !!solution
    const result : SolveRating = {
        puzzle: rating.puzzle,
        solution : validSolution ? solution : null,
        difficulty: validSolution ? getMatchingDifficulty(rating.score, rating.difficulty) : null,
        score: validSolution ? rating.score : null,
      }
    if (onValidNewPuzzle && validSolution) {
      const continueProcessing = onValidNewPuzzle(result)
      if (!continueProcessing) {
        control.cancel()
        return
      }
    }
    results.push(result)
  })
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
