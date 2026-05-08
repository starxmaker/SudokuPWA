import { decodeGrid } from './gameStorage'
import { generate } from './generators/hodoku'
import type { SolveRating, SolvablePuzzle } from './generators/types'
import { createPuzzleQueueManager } from './puzzleQueue'
import type { PuzzleQueueAvailability } from './puzzleQueue'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'
import { DIFFICULTY_LABELS, type GameDifficulty } from './difficulties'

export type PuzzleQueueDebugStatus = {
  status: 'stopped' | 'scheduled' | 'running' | 'idle' | 'waiting'
  daemonStarted: boolean
  isGenerating: boolean
  isGenerationScheduled: boolean
  hasCapacity: boolean
  availability: PuzzleQueueAvailability
  generatedCounts: PuzzleQueueAvailability
  totalGenerated: number
}

declare global {
  interface Window {
    __sudokuGeneratorStatus?: () => PuzzleQueueDebugStatus
  }
}

const manager = createPuzzleQueueManager({})
let daemonStarted = false
let stopActiveGeneration: (() => void) | null = null
let activeGenerationDifficulty: GameDifficulty | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null
let generatedCounts = createEmptyDifficultyCounts()
let totalGenerated = 0

function createEmptyDifficultyCounts(): PuzzleQueueAvailability {
  return Object.fromEntries(
    (Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]).map(difficulty => [difficulty, 0]),
  ) as PuzzleQueueAvailability
}

function resetGeneratedCounts() {
  generatedCounts = createEmptyDifficultyCounts()
  totalGenerated = 0
}

function getGeneratorStatus(
  daemonStarted: boolean,
  isGenerating: boolean,
  isGenerationScheduled: boolean,
  hasCapacity: boolean,
): PuzzleQueueDebugStatus['status'] {
  if (!daemonStarted) return 'stopped'
  if (isGenerating) return 'running'
  if (isGenerationScheduled) return 'scheduled'
  if (!hasCapacity) return 'idle'
  return 'waiting'
}

function recordGeneratedPuzzle(puzzle: SolvablePuzzle) {
  generatedCounts[puzzle.difficulty] += 1
  totalGenerated += 1
}

function toSolvablePuzzle(rating: SolveRating, requestedDifficulty: GameDifficulty): SolvablePuzzle | null {
  if (!rating.solution) return null
  const puzzle = decodeGrid(rating.puzzle)
  const solution = decodeGrid(rating.solution)
  if (!puzzle || !solution) return null
  return {
    puzzle,
    solution,
    difficulty: requestedDifficulty,
    score: rating.score ?? null,
  }
}

function clearRestartTimer() {
  if (restartTimer !== null) {
    clearTimeout(restartTimer)
    restartTimer = null
  }
}

function hasAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function shouldUseGenerationWorker() {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined' && import.meta.env.MODE !== 'test'
}

function shouldGenerate() {
  return daemonStarted && manager.hasCapacity()
}

function getNextDifficultyToGenerate() {
  return daemonStarted ? manager.getNextDifficulty() : null
}

function stopCurrentGeneration() {
  const stop = stopActiveGeneration
  stopActiveGeneration = null
  activeGenerationDifficulty = null
  stop?.()
}

function scheduleGeneration() {
  if (!shouldGenerate() || stopActiveGeneration || restartTimer !== null) return

  restartTimer = setTimeout(() => {
    restartTimer = null
    startGenerationLoop()
  }, 0)
}

function finishGenerationLoop(stop: () => void, error?: unknown) {
  if (stopActiveGeneration !== stop) return
  stopActiveGeneration = null
  activeGenerationDifficulty = null

  if (error && !hasAbortError(error)) {
    console.error('Puzzle queue generator failed:', error)
  }

  syncGenerationLoop()
}

function shouldContinueGenerating(difficulty: GameDifficulty) {
  return getNextDifficultyToGenerate() === difficulty
}

function startCurrentThreadGenerationStream(difficulty: GameDifficulty) {
  const controller = new AbortController()
  const stop = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  void generate(difficulty, (rating) => {
    if (!daemonStarted || controller.signal.aborted) return false
    const generated = toSolvablePuzzle(rating, difficulty)
    if (!generated) return true
    recordGeneratedPuzzle(generated)
    manager.enqueue(generated)

    return shouldContinueGenerating(difficulty)
  }, controller.signal)
    .catch((error) => {
      finishGenerationLoop(stop, error)
    })
    .finally(() => {
      finishGenerationLoop(stop)
    })

  return stop
}

function startWorkerGenerationStream(difficulty: GameDifficulty) {
  const worker = new Worker(new URL('./sudokuGenerator.worker.ts', import.meta.url), { type: 'module' })
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    worker.terminate()
  }

  worker.onmessage = (event: MessageEvent<GenerateWorkerResponse>) => {
    const message = event.data
    if (message.type === 'stream-puzzle') {
      const generated: SolvablePuzzle = {
        puzzle: message.puzzle,
        solution: message.solution,
        difficulty: message.difficulty,
        score: message.score,
      }

      if (!daemonStarted) return
      recordGeneratedPuzzle(generated)
      manager.enqueue(generated)

      if (!shouldContinueGenerating(difficulty)) {
        stop()
        finishGenerationLoop(stop)
      }
      return
    }

    if (message.type === 'error') {
      const error = new Error(message.message)
      error.name = message.name ?? 'Error'
      stop()
      finishGenerationLoop(stop, error)
    }
  }

  worker.onerror = (event: ErrorEvent) => {
    const error =
      event.error instanceof Error
        ? event.error
        : new Error(event.message || 'Failed to generate puzzle stream')
    stop()
    finishGenerationLoop(stop, error)
  }

  const request: GenerateWorkerRequest = { type: 'stream-start', difficulty }
  worker.postMessage(request)
  return stop
}

function syncGenerationLoop() {
  const nextDifficulty = getNextDifficultyToGenerate()

  if (!nextDifficulty) {
    clearRestartTimer()
    stopCurrentGeneration()
    return
  }

  if (activeGenerationDifficulty && activeGenerationDifficulty !== nextDifficulty) {
    stopCurrentGeneration()
  }

  scheduleGeneration()
}

function startGenerationLoop() {
  const difficulty = getNextDifficultyToGenerate()
  if (!difficulty || stopActiveGeneration) return
  activeGenerationDifficulty = difficulty
  stopActiveGeneration = shouldUseGenerationWorker()
    ? startWorkerGenerationStream(difficulty)
    : startCurrentThreadGenerationStream(difficulty)
}

export function getPuzzleQueueAvailability(): PuzzleQueueAvailability {
  return manager.getAvailability()
}

export function getPuzzleQueueDebugStatus(): PuzzleQueueDebugStatus {
  const availability = manager.getAvailability()
  const hasCapacity = manager.hasCapacity()
  const isGenerating = stopActiveGeneration !== null
  const isGenerationScheduled = restartTimer !== null
  return {
    status: getGeneratorStatus(daemonStarted, isGenerating, isGenerationScheduled, hasCapacity),
    daemonStarted,
    isGenerating,
    isGenerationScheduled,
    hasCapacity,
    availability,
    generatedCounts: { ...generatedCounts },
    totalGenerated,
  }
}

export function subscribePuzzleQueueAvailability(
  listener: (availability: PuzzleQueueAvailability) => void,
) {
  return manager.subscribe(listener)
}

export function startPuzzleQueueDaemon() {
  manager.start()
  daemonStarted = true
  syncGenerationLoop()
}

export function stopPuzzleQueueDaemon() {
  daemonStarted = false
  clearRestartTimer()
  stopCurrentGeneration()
  manager.stop()
}

export function resetPuzzleQueueDaemon() {
  const wasRunning = daemonStarted
  stopPuzzleQueueDaemon()
  manager.reset()
  resetGeneratedCounts()
  if (wasRunning) {
    startPuzzleQueueDaemon()
  }
}

export function takeQueuedGame(difficulty: GameDifficulty): Promise<SolvablePuzzle | null> {
  return manager.take(difficulty).then((puzzle) => {
    if (daemonStarted) {
      syncGenerationLoop()
    }
    return puzzle
  })
}

if (typeof window !== 'undefined') {
  window.__sudokuGeneratorStatus = getPuzzleQueueDebugStatus
}
