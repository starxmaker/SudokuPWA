import { createRuntime } from 'hodoku-core-js'
import type { GameDifficulty, HodokuConstraint, HodokuDifficulty, SolveRating } from './types'

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
    minScore: 5000,
    maxScore: 10000,
  },
  DIABOLICAL: {
    label: 'Diabolical',
    difficulty: 'EXTREME',
    minScore: 10000,
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
      constraints
    )
    resolve(null)
  })
}

export async function evaluate(
  puzzles: string[],
  onNewPuzzle?: (rating: SolveRating) => boolean,
  signal?: AbortSignal,
  constraints?: HodokuConstraint,
): Promise<SolveRating[]> {
  const results: SolveRating[] = []
  const args = ['/o', 'stdout', ...puzzles]
  if (constraints && constraints.maxScore) {
    args.push('/ms', String(constraints.maxScore))
  }
  const pool = createRuntime()
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
  if (line.includes('gu')) return null // hodoku gave up due to constraint
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
