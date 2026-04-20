import { solve as libSolve } from '@starxmaker/sudoku.js'
import type { Grid, Difficulty } from './sudoku_types'
import { getGenerator, DEFAULT_GENERATOR_ID } from './generators'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'

export type { Grid, Difficulty }

type GenerationWorkerFactory = () => Worker

const defaultGenerationWorkerFactory: GenerationWorkerFactory = () =>
  new Worker(new URL('./sudokuGenerator.worker.ts', import.meta.url), { type: 'module' })

let generationWorkerFactory: GenerationWorkerFactory = defaultGenerationWorkerFactory

function shouldUseGenerationWorker() {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined' && import.meta.env.MODE !== 'test'
}

function generateGameOnCurrentThread(
  difficulty: string,
  generatorId: string,
  signal?: AbortSignal,
) {
  return getGenerator(generatorId).generate(difficulty, signal)
}

export function setGenerationWorkerFactoryForTests(factory: GenerationWorkerFactory | null) {
  generationWorkerFactory = factory ?? defaultGenerationWorkerFactory
}

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export function solveGrid(puzzle: Grid): Grid | null {
  return libSolve(puzzle) as Grid | null
}

export async function generateGame(
  difficulty: string = 'MEDIUM',
  generatorId: string = DEFAULT_GENERATOR_ID,
  signal?: AbortSignal,
): Promise<{ puzzle: Grid; solution: Grid }> {
  if (!shouldUseGenerationWorker()) {
    return generateGameOnCurrentThread(difficulty, generatorId, signal)
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
      settled = true
      cleanup()
      worker.terminate()
      const message = event.data
      if (message.type === 'result') {
        resolve({ puzzle: message.puzzle, solution: message.solution })
        return
      }
      const error = new Error(message.message)
      error.name = message.name ?? 'Error'
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
      type: 'generate',
      difficulty,
      generatorId,
    }
    worker.postMessage(request)
  })
}

export async function initSudoku(): Promise<void> {
  if (!shouldUseGenerationWorker()) return
  const worker = generationWorkerFactory()
  worker.terminate()
}
