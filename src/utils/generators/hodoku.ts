import { createRuntimePool } from 'hodoku-core-js'
import type { GameDifficulty, HodokuConstraint, HodokuDifficulty, SolveRating } from './types'

export type HodokuEstimationId = GameDifficulty

type HodokuEstimation = {
  label: string
  difficulty: HodokuDifficulty
  minScore: number | null
  maxScore: number | null
}

export const HODOKU_ESTIMATIONS: Record<HodokuEstimationId, HodokuEstimation> = {
  VERY_EASY: {
    label: 'Very Easy',
    difficulty: 'EASY',
    minScore: null,
    maxScore: 300,
  },
  EASY: {
    label: 'Easy',
    difficulty: 'EASY',
    minScore: 300,
    maxScore: 800,
  },
  MEDIUM: {
    label: 'Medium',
    difficulty: 'MEDIUM',
    minScore: null,
    maxScore: 1000,
  },
  HARD: {
    label: 'Hard',
    difficulty: 'HARD',
    minScore: null,
    maxScore: 1600,
  },
  VERY_HARD: {
    label: 'Very Hard',
    difficulty: 'UNFAIR',
    minScore: null,
    maxScore: 1800,
  },
  EXPERT: {
    label: 'Expert',
    difficulty: 'EXTREME',
    minScore: null,
    maxScore: 5000,
  },
  NIGHTMARE: {
    label: 'Nightmare',
    difficulty: 'EXTREME',
    minScore: 3000,
    maxScore: 7000,
  },
  DIABOLICAL: {
    label: 'Diabolical',
    difficulty: 'EXTREME',
    minScore: 7000,
    maxScore: null,
  },
}

export function matchesHodokuEstimation(
  rating: Pick<SolveRating, 'difficulty' | 'score'>,
  estimation: Pick<HodokuEstimation, 'difficulty' | 'minScore' | 'maxScore'>,
) {
  if (rating.difficulty !== estimation.difficulty) return false
  if (estimation.minScore !== null && rating.score < estimation.minScore) return false
  if (estimation.maxScore !== null && rating.score > estimation.maxScore) return false
  return true
}

export async function findComplaint(
  puzzles: string[],
  constraints: HodokuConstraint,
  signal?: AbortSignal,
): Promise<string | null> {
  return await new Promise(async (resolve) => {
    await evaluate(
      puzzles,
      rating => {
        if (signal?.aborted) {
          resolve(null)
          return false
        }
        if (matchesHodokuEstimation(rating, constraints)) {
          resolve(rating.puzzle)
          return false
        }
        return true
      },
      signal,
    )
    resolve(null)
  })
}

export async function evaluate(
  puzzles: string[],
  onNewPuzzle?: (rating: SolveRating) => boolean,
  signal?: AbortSignal,
): Promise<SolveRating[]> {
  const results: SolveRating[] = []
  const args = ['/o', 'stdout', ...puzzles]
  const pool = createRuntimePool()
  await pool.executeCommand(args, line => {
    if (signal?.aborted) {
      return false
    }
    const result = map(line)
    if (result) {
      if (onNewPuzzle) {
        const continueProcessing = onNewPuzzle(result)
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

const regex =
  /^([\.0-9]{81})\s+#\d+\s+(Easy|Medium|Hard|Unfair|Extreme)\s+\((\d+)\)$/

export const map = (line: string): SolveRating | null => {
  const match = line.trim().match(regex)
  if (match) {
    return {
      puzzle: match[1],
      difficulty: match[2].toUpperCase() as HodokuDifficulty,
      score: Number(match[3]),
    }
  }
  return null
}
