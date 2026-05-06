import { DIFFICULTY_LABELS, GameDifficulty } from './difficulties'
import { decodeGrid, encodeGrid } from './gameStorage'
import type { SolvablePuzzle } from './generators/types'

const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]

export const PUZZLE_QUEUE_TARGET_SIZE = 10
export const PUZZLE_QUEUE_STORAGE_KEY = 'puzzleQueue:v1'

export type PuzzleQueueAvailability = Record<GameDifficulty, number>

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type StoredPuzzle = {
  puzzle: string
  solution: string
  score?: number | null
}
type StoredPuzzleQueue = Record<GameDifficulty, StoredPuzzle[]>
type Listener = (availability: PuzzleQueueAvailability) => void

type CreatePuzzleQueueManagerOptions = {
  storage?: StorageLike | null
  storageKey?: string
  queueTargetSize?: number
}

function createEmptyQueue(): StoredPuzzleQueue {
  return Object.fromEntries(DIFFICULTIES.map(difficulty => [difficulty, []])) as unknown as StoredPuzzleQueue
}

function createAvailabilitySnapshot(queue: StoredPuzzleQueue): PuzzleQueueAvailability {
  return Object.fromEntries(
    DIFFICULTIES.map(difficulty => [difficulty, queue[difficulty].length]),
  ) as PuzzleQueueAvailability
}

function isStoredPuzzle(value: unknown): value is StoredPuzzle {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as StoredPuzzle).puzzle === 'string' &&
    typeof (value as StoredPuzzle).solution === 'string' &&
    (
      (value as StoredPuzzle).score === undefined ||
      (value as StoredPuzzle).score === null ||
      (typeof (value as StoredPuzzle).score === 'number' && Number.isFinite((value as StoredPuzzle).score))
    )
  )
}

function normalizeStoredQueue(value: unknown): StoredPuzzleQueue {
  const queue = createEmptyQueue()
  if (!value || typeof value !== 'object') return queue

  for (const difficulty of DIFFICULTIES) {
    const seen = new Set<string>()
    const entries = (value as Record<string, unknown>)[difficulty]
    if (!Array.isArray(entries)) continue

    for (const entry of entries) {
      if (!isStoredPuzzle(entry)) continue
      if (seen.has(entry.puzzle)) continue
      if (!decodeGrid(entry.puzzle) || !decodeGrid(entry.solution)) continue

      queue[difficulty].push(entry)
      seen.add(entry.puzzle)
    }
  }

  return queue
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function createPuzzleQueueManager({
  storage = getDefaultStorage(),
  storageKey = PUZZLE_QUEUE_STORAGE_KEY,
  queueTargetSize = PUZZLE_QUEUE_TARGET_SIZE,
}: CreatePuzzleQueueManagerOptions) {
  let loaded = false
  let queue = createEmptyQueue()
  const listeners = new Set<Listener>()

  function ensureLoaded() {
    if (loaded) return
    loaded = true

    if (!storage) {
      queue = createEmptyQueue()
      return
    }

    try {
      const raw = storage.getItem(storageKey)
      queue = raw ? normalizeStoredQueue(JSON.parse(raw)) : createEmptyQueue()
    } catch {
      queue = createEmptyQueue()
    }
  }

  function persist() {
    if (!storage) return
    try {
      storage.setItem(storageKey, JSON.stringify(queue))
    } catch {}
  }

  function getAvailability(): PuzzleQueueAvailability {
    ensureLoaded()
    return createAvailabilitySnapshot(queue)
  }

  function notify() {
    const snapshot = getAvailability()
    for (const listener of listeners) listener(snapshot)
  }

  function pickNextDifficulty(): GameDifficulty | null {
    const availability = getAvailability()
    let candidate: GameDifficulty | null = null
    let lowestCount = Number.POSITIVE_INFINITY

    for (const difficulty of DIFFICULTIES) {
      const count = availability[difficulty]
      if (count >= queueTargetSize) continue
      if (count < lowestCount) {
        candidate = difficulty
        lowestCount = count
      }
    }

    return candidate
  }

  function start() {
    ensureLoaded()
    notify()
  }

  function stop() {
    // Queue persistence is independent from the daemon lifecycle.
  }

  function subscribe(listener: Listener) {
    ensureLoaded()
    listeners.add(listener)
    listener(getAvailability())
    return () => {
      listeners.delete(listener)
    }
  }

  function hasCapacity() {
    return pickNextDifficulty() !== null
  }

  function enqueue(generated: SolvablePuzzle) {
    ensureLoaded()

    const difficulty = generated.difficulty
    if (queue[difficulty].length >= queueTargetSize) return false

    const encoded: StoredPuzzle = {
      puzzle: encodeGrid(generated.puzzle),
      solution: encodeGrid(generated.solution),
      score: generated.score,
    }

    if (queue[difficulty].some(entry => entry.puzzle === encoded.puzzle)) return false

    queue[difficulty].push(encoded)
    persist()
    notify()
    return true
  }

  async function take(difficulty: GameDifficulty): Promise<SolvablePuzzle | null> {
    ensureLoaded()

    while (queue[difficulty].length > 0) {
      const next = queue[difficulty].shift()
      persist()
      notify()

      if (!next) continue
      const puzzle = decodeGrid(next.puzzle)
      const solution = decodeGrid(next.solution)
      const score = next.score ?? null
      if (puzzle && solution) {
        return {
          puzzle,
          solution,
          difficulty,
          score,
        }
      }
    }

    persist()
    notify()
    return null
  }

  return {
    enqueue,
    getAvailability,
    hasCapacity,
    start,
    stop,
    subscribe,
    take,
  }
}
