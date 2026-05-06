import { get_candidates as libGetCandidates, solve as libSolve } from '@starxmaker/sudoku.js'
import type { Grid, Difficulty } from './sudoku_types'
import { generateForDifficulty } from './generators/orchestrator'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'
import { GameDifficulty } from './difficulties'

export type { Grid, Difficulty }

type GenerationWorkerFactory = () => Worker

const defaultGenerationWorkerFactory: GenerationWorkerFactory = () =>
  new Worker(new URL('./sudokuGenerator.worker.ts', import.meta.url), { type: 'module' })

let generationWorkerFactory: GenerationWorkerFactory = defaultGenerationWorkerFactory

function shouldUseGenerationWorker() {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined' && import.meta.env.MODE !== 'test'
}

function generateGameOnCurrentThread(
  difficulty: GameDifficulty,
  signal?: AbortSignal,
): Promise<{ puzzle: Grid; solution: Grid }> {
  return generateForDifficulty(difficulty, signal)
}

export function setGenerationWorkerFactoryForTests(factory: GenerationWorkerFactory | null) {
  generationWorkerFactory = factory ?? defaultGenerationWorkerFactory
}

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export function solveGrid(puzzle: Grid): Grid | null {
  return libSolve(puzzle) as Grid | null
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (a[r][c] !== b[r][c]) return false
    }
  }
  return true
}

export type CreatedPuzzleValidationResult =
  | { valid: true; solution: Grid }
  | { valid: false; message: string }

export function validateCreatedPuzzle(puzzle: Grid): CreatedPuzzleValidationResult {
  const clueCount = puzzle.flat().filter(value => value !== 0).length
  if (clueCount < 17) {
    return { valid: false, message: 'A created puzzle needs at least 17 clues.' }
  }

  if (libGetCandidates(puzzle) === null) {
    return { valid: false, message: 'This puzzle has conflicting givens.' }
  }

  try {
    const forwardSolution = libSolve(puzzle) as Grid | null
    const reverseSolution = libSolve(puzzle, true) as Grid | null

    if (!forwardSolution || !reverseSolution) {
      return { valid: false, message: 'This puzzle has no solution.' }
    }

    if (!gridsEqual(forwardSolution, reverseSolution)) {
      return { valid: false, message: 'This puzzle must have exactly one solution.' }
    }

    return { valid: true, solution: forwardSolution }
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : 'This puzzle could not be validated.'

    if (message.includes('Too few givens')) {
      return { valid: false, message: 'A created puzzle needs at least 17 clues.' }
    }

    return { valid: false, message: 'This puzzle could not be validated.' }
  }
}

export async function generateGame(
  difficulty: GameDifficulty = 'MEDIUM',
  signal?: AbortSignal,
): Promise<{ puzzle: Grid; solution: Grid }> {
  if (!shouldUseGenerationWorker()) {
    return generateGameOnCurrentThread(difficulty, signal)
  }

  return new Promise<{ puzzle: Grid; solution: Grid }>((resolve, reject) => {
    const worker = generationWorkerFactory()
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

    worker.onmessage = (event: MessageEvent<GenerateWorkerResponse>) => {
      if (settled) return
      const message = event.data
      if (message.type === 'stream-puzzle') {
        if (message.difficulty !== difficulty) return
        settled = true
        cleanup()
        worker.terminate()
        resolve({ puzzle: message.puzzle, solution: message.solution })
        return
      }
      const error = new Error(message.message)
      error.name = message.name ?? 'Error'
      settled = true
      cleanup()
      worker.terminate()
      reject(error)
    }

    worker.onerror = (event: ErrorEvent) => {
      finishWithError(
        event.error instanceof Error
          ? event.error
          : new Error(event.message || 'Failed to generate puzzle'),
      )
    }

    const request: GenerateWorkerRequest = {
      type: 'stream-start',
    }
    worker.postMessage(request)
  })
}

export async function initSudoku(): Promise<void> {
  if (!shouldUseGenerationWorker()) return
  const worker = generationWorkerFactory()
  worker.terminate()
}
