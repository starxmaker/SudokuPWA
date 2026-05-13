import {
  rateSudoku,
  rateSudokus,
  generateSudokus,
  HodokuDifficulty,
} from 'hodoku-core-js'
import type { SolveRating } from './types'
import { GameDifficulty } from '../difficulties'
import type { Grid } from '../sudoku_types'
import { decodeGrid, encodeGrid, encodeGridWithCandidates } from '../gameStorage'
import type {
  RequiredTechniquesResult,
  RequiredTechniquesWorkerRequest,
  RequiredTechniquesWorkerResponse,
} from '../requiredTechniquesWorkerProtocol'

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

export async function generate(difficulty : GameDifficulty, onValidNewPuzzle: (puzzle: SolveRating) => boolean, signal?: AbortSignal): Promise<void> {
  const constraints = HODOKU_ESTIMATIONS[difficulty]
  await generateSudokus({
    difficulty: constraints.difficulty,
    minScore: constraints.minScore,
    maxScore: constraints.maxScore,
    signal
  }, (puzzle, control) => {
    if (signal?.aborted) {
      control.cancel()
      return
    }
    const valid = !puzzle.unsolvable && !puzzle.givenUp && !!puzzle.solution
    const result: SolveRating = {
      puzzle: puzzle.puzzle,
      solution: puzzle.solution ?? null,
      difficulty: getMatchingDifficulty(puzzle.score, puzzle.difficulty),
      score: puzzle.score ?? null,
    }
    if (valid) {
      const continueProcessing = onValidNewPuzzle(result)
      if (!continueProcessing) {
        control.cancel()
        return
      }
    }
  })
}

export async function evaluate(
  puzzles: string[],
  onValidNewPuzzle?: (rating: SolveRating) => boolean,
  signal?: AbortSignal
): Promise<SolveRating[]> {
  const results: SolveRating[] = []
  await rateSudokus({
    puzzles,
    includeSolution: true,
    signal
  }, (rating, control) => {
    if (signal?.aborted) {
      control.cancel()
      return
    }
    const solution = rating.solution ?? null
    const validSolution = !rating.givenUp && !rating.unsolvable && !!solution
    const result: SolveRating = {
      puzzle: rating.puzzle,
      solution: validSolution ? solution : null,
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

export type RequiredTechniques = RequiredTechniquesResult

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

function shouldUseRequiredTechniquesWorker() {
  return typeof Worker !== 'undefined'
}

async function analyzeRequiredTechniquesOnCurrentThread(
  puzzleString: string,
  signal?: AbortSignal,
): Promise<RequiredTechniques | null> {
  const rating = await rateSudoku({
    puzzle: puzzleString,
    includePath: true,
    signal,
  })
  if (rating === null) {
    return null
  }

  return {
    difficulty: rating.difficulty,
    score: rating.score,
    givenUp: rating.givenUp,
    bruteForced: rating.bruteForced,
    unsolvable: rating.unsolvable,
    steps: rating.steps ?? [],
  }
}

function requiredTechniquesWorkerFactory() {
  return new Worker(new URL('../requiredTechniques.worker.ts', import.meta.url), { type: 'module' })
}

async function analyzeRequiredTechniquesInWorker(
  puzzleString: string,
  signal?: AbortSignal,
): Promise<RequiredTechniques | null> {
  return new Promise<RequiredTechniques | null>((resolve, reject) => {
    const worker = requiredTechniquesWorkerFactory()
    let settled = false

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      signal?.removeEventListener('abort', handleAbort)
    }

    const finishWithError = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      worker.terminate()
      reject(error)
    }

    const handleAbort = () => {
      finishWithError(new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })

    worker.onmessage = (event: MessageEvent<RequiredTechniquesWorkerResponse>) => {
      if (settled) return
      const message = event.data
      if (message.type === 'result') {
        settled = true
        cleanup()
        worker.terminate()
        resolve(message.result)
        return
      }

      const error = new Error(message.message)
      error.name = message.name ?? 'Error'
      finishWithError(error)
    }

    worker.onerror = (event: ErrorEvent) => {
      finishWithError(
        event.error instanceof Error
          ? event.error
          : new Error(event.message || 'Failed to analyze required techniques'),
      )
    }

    const request: RequiredTechniquesWorkerRequest = {
      type: 'analyze',
      puzzle: puzzleString,
    }
    worker.postMessage(request)
  })
}

export async function analyzeRequiredTechniques(
  puzzle: Grid,
  notes?: number[][][],
  signal?: AbortSignal,
): Promise<RequiredTechniques | null> {
  const puzzleString = notes ? encodeGridWithCandidates(puzzle, notes) : encodeGrid(puzzle)
  if (!shouldUseRequiredTechniquesWorker()) {
    return analyzeRequiredTechniquesOnCurrentThread(puzzleString, signal)
  }
  return analyzeRequiredTechniquesInWorker(puzzleString, signal)
}

const regex =
  /^([.0-9]{81})\s+#(\d+)\s+(Easy|Medium|Hard|Unfair|Extreme)\s+\((\d+)\)$/

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
