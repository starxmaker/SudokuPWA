import type { Grid, Difficulty } from './sudoku_types'
import { decodeGrid } from './gameStorage'
import { generate } from './generators/hodoku'
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

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row])
}

function hasDuplicates(values: number[]) {
  const seen = new Set<number>()
  for (const value of values) {
    if (value === 0) continue
    if (seen.has(value)) return true
    seen.add(value)
  }
  return false
}

function hasConflictingGivens(grid: Grid) {
  for (let index = 0; index < 9; index++) {
    const row = grid[index]
    const column = grid.map(r => r[index])
    if (hasDuplicates(row) || hasDuplicates(column)) return true
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn++) {
      const box: number[] = []
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
        for (let column = boxColumn * 3; column < boxColumn * 3 + 3; column++) {
          box.push(grid[row][column])
        }
      }
      if (hasDuplicates(box)) return true
    }
  }

  return false
}

function getCandidates(grid: Grid, row: number, column: number) {
  const used = new Set<number>()

  for (let index = 0; index < 9; index++) {
    used.add(grid[row][index])
    used.add(grid[index][column])
  }

  const boxRowStart = Math.floor(row / 3) * 3
  const boxColumnStart = Math.floor(column / 3) * 3
  for (let r = boxRowStart; r < boxRowStart + 3; r++) {
    for (let c = boxColumnStart; c < boxColumnStart + 3; c++) {
      used.add(grid[r][c])
    }
  }

  const candidates: number[] = []
  for (let digit = 1; digit <= 9; digit++) {
    if (!used.has(digit)) candidates.push(digit)
  }
  return candidates
}

function findNextEmptyCell(grid: Grid) {
  let best: { row: number; column: number; candidates: number[] } | null = null

  for (let row = 0; row < 9; row++) {
    for (let column = 0; column < 9; column++) {
      if (grid[row][column] !== 0) continue
      const candidates = getCandidates(grid, row, column)
      if (candidates.length === 0) {
        return { row, column, candidates }
      }
      if (!best || candidates.length < best.candidates.length) {
        best = { row, column, candidates }
        if (candidates.length === 1) return best
      }
    }
  }

  return best
}

function collectSolutions(
  grid: Grid,
  solutions: Grid[],
  limit: number,
  reverse = false,
): void {
  if (solutions.length >= limit) return

  const next = findNextEmptyCell(grid)
  if (!next) {
    solutions.push(cloneGrid(grid))
    return
  }

  if (next.candidates.length === 0) return

  const orderedCandidates = reverse ? [...next.candidates].reverse() : next.candidates
  for (const candidate of orderedCandidates) {
    grid[next.row][next.column] = candidate
    collectSolutions(grid, solutions, limit, reverse)
    if (solutions.length >= limit) {
      grid[next.row][next.column] = 0
      return
    }
  }

  grid[next.row][next.column] = 0
}

function generateGameOnCurrentThread(
  difficulty: GameDifficulty,
  signal?: AbortSignal,
): Promise<{ puzzle: Grid; solution: Grid }> {
  return new Promise<{ puzzle: Grid; solution: Grid }>((resolve, reject) => {
    const controller = new AbortController()
    let settled = false

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort)
    }

    const finishWithError = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (!controller.signal.aborted) {
        controller.abort()
      }
      reject(error)
    }

    const finishWithResult = (result: { puzzle: Grid; solution: Grid }) => {
      if (settled) return
      settled = true
      cleanup()
      if (!controller.signal.aborted) {
        controller.abort()
      }
      resolve(result)
    }

    const handleAbort = () => {
      finishWithError(new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })

    void generate(difficulty, (rating) => {
      if (!rating.solution) return true
      const puzzle = decodeGrid(rating.puzzle)
      const solution = decodeGrid(rating.solution)
      if (!puzzle || !solution) return true
      finishWithResult({ puzzle, solution })
      return false
    }, controller.signal).catch((error) => {
      finishWithError(
        error instanceof Error
          ? error
          : new Error('Failed to generate puzzle'),
      )
    })
  })
}

export function setGenerationWorkerFactoryForTests(factory: GenerationWorkerFactory | null) {
  generationWorkerFactory = factory ?? defaultGenerationWorkerFactory
}

/** Solve a puzzle and return the completed grid, or null if unsolvable. Synchronous. */
export type CreatedPuzzleValidationMessageKey =
  | 'needs17Clues'
  | 'conflictingGivens'
  | 'noSolution'
  | 'multipleSolutions'

export type CreatedPuzzleValidationResult =
  | { valid: true; solution: Grid }
  | { valid: false; messageKey: CreatedPuzzleValidationMessageKey }

export function validateCreatedPuzzle(puzzle: Grid): CreatedPuzzleValidationResult {
  const clueCount = puzzle.flat().filter(value => value !== 0).length
  if (clueCount < 17) {
    return { valid: false, messageKey: 'needs17Clues' }
  }

  if (hasConflictingGivens(puzzle)) {
    return { valid: false, messageKey: 'conflictingGivens' }
  }

  const solutions: Grid[] = []
  collectSolutions(cloneGrid(puzzle), solutions, 2)

  if (solutions.length === 0) {
    return { valid: false, messageKey: 'noSolution' }
  }

  if (solutions.length > 1) {
    return { valid: false, messageKey: 'multipleSolutions' }
  }

  return { valid: true, solution: solutions[0] }
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
      difficulty,
    }
    worker.postMessage(request)
  })
}

export async function initSudoku(): Promise<void> {
  if (!shouldUseGenerationWorker()) return
  const worker = generationWorkerFactory()
  worker.terminate()
}
