import { DIFFICULTY_CONFIGURATIONS } from './generators/orchestrator'
import type { GameDifficulty, PuzzleSolutionPair } from './generators/types'
import { decodeGrid, encodeGrid } from './gameStorage'

const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIGURATIONS) as GameDifficulty[]

export const PUZZLE_QUEUE_TARGET_SIZE = 10
export const PUZZLE_QUEUE_STORAGE_KEY = 'puzzleQueue:v1'

export type PuzzleQueueAvailability = Record<GameDifficulty, number>

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type StoredPuzzle = { puzzle: string; solution: string }
type StoredPuzzleQueue = Record<GameDifficulty, StoredPuzzle[]>
type Listener = (availability: PuzzleQueueAvailability) => void

type CreatePuzzleQueueManagerOptions = {
  generatePuzzle: (difficulty: GameDifficulty, signal?: AbortSignal) => Promise<PuzzleSolutionPair>
  storage?: StorageLike | null
  storageKey?: string
  queueTargetSize?: number
}

function createEmptyQueue(): StoredPuzzleQueue {
  return Object.fromEntries(DIFFICULTIES.map(difficulty => [difficulty, []])) as StoredPuzzleQueue
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
    typeof (value as StoredPuzzle).solution === 'string'
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
  generatePuzzle,
  storage = getDefaultStorage(),
  storageKey = PUZZLE_QUEUE_STORAGE_KEY,
  queueTargetSize = PUZZLE_QUEUE_TARGET_SIZE,
}: CreatePuzzleQueueManagerOptions) {
  let loaded = false
  let started = false
  let pumping = false
  let queue = createEmptyQueue()
  let timer: ReturnType<typeof setTimeout> | null = null
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

  async function pumpOnce() {
    if (!started || pumping) return

    const difficulty = pickNextDifficulty()
    if (!difficulty) return

    pumping = true
    try {
      const generated = await generatePuzzle(difficulty)
      ensureLoaded()

      const encoded: StoredPuzzle = {
        puzzle: encodeGrid(generated.puzzle),
        solution: encodeGrid(generated.solution),
      }

      if (!queue[difficulty].some(entry => entry.puzzle === encoded.puzzle)) {
        queue[difficulty].push(encoded)
        persist()
        notify()
      }
    } catch {
      // Keep the daemon alive; a later cycle can retry.
    } finally {
      pumping = false
      if (started && pickNextDifficulty()) schedulePump()
    }
  }

  function schedulePump() {
    if (!started || pumping || timer !== null) return
    timer = setTimeout(() => {
      timer = null
      void pumpOnce()
    }, 0)
  }

  function start() {
    ensureLoaded()
    started = true
    notify()
    schedulePump()
  }

  function stop() {
    started = false
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function subscribe(listener: Listener) {
    ensureLoaded()
    listeners.add(listener)
    listener(getAvailability())
    return () => {
      listeners.delete(listener)
    }
  }

  async function take(difficulty: GameDifficulty): Promise<PuzzleSolutionPair | null> {
    ensureLoaded()

    while (queue[difficulty].length > 0) {
      const next = queue[difficulty].shift()
      persist()
      notify()
      schedulePump()

      if (!next) continue
      const puzzle = decodeGrid(next.puzzle)
      const solution = decodeGrid(next.solution)
      if (puzzle && solution) return { puzzle, solution }
    }

    persist()
    notify()
    schedulePump()
    return null
  }

  return {
    getAvailability,
    start,
    stop,
    subscribe,
    take,
  }
}
