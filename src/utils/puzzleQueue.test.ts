import { describe, it, expect, beforeEach } from 'vitest'
import type { SolvablePuzzle } from './generators/types'
import { createPuzzleQueueManager, PUZZLE_QUEUE_STORAGE_KEY } from './puzzleQueue'
import { encodeGrid } from './gameStorage'
import type { GameDifficulty } from './difficulties'

const SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
] as const

function createPair(seed: number): PuzzleSolutionPair {
  const puzzle = SOLUTION.map((row, r) => row.map((value, c) => (r === 0 && c === seed ? 0 : value)))
  return {
    puzzle,
    solution: SOLUTION.map(row => [...row]),
  }
}

function createCalibratedPair(seed: number, difficulty: GameDifficulty): SolvablePuzzle {
  return {
    ...createPair(seed),
    difficulty,
    score: 1200,
  }
}

function createStoredQueue() {
  const difficulties: GameDifficulty[] = [
    'VERY_EASY',
    'EASY',
    'MEDIUM',
    'HARD',
    'VERY_HARD',
    'EXPERT',
    'NIGHTMARE',
    'DIABOLICAL',
  ]

  return Object.fromEntries(
    difficulties.map((difficulty, index) => {
      const pair = createPair(index)
      return [
        difficulty,
        [{ puzzle: encodeGrid(pair.puzzle), solution: encodeGrid(pair.solution), score: 1200 }],
      ]
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('puzzle queue', () => {
  it('enqueues calibrated puzzles until each difficulty is full', () => {
    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey: `${PUZZLE_QUEUE_STORAGE_KEY}:fill`,
      queueTargetSize: 1,
    })

    const difficulties: GameDifficulty[] = [
      'VERY_EASY',
      'EASY',
      'MEDIUM',
      'HARD',
      'VERY_HARD',
      'EXPERT',
      'NIGHTMARE',
      'DIABOLICAL',
    ]

    difficulties.forEach((difficulty, index) => {
      expect(manager.enqueue(createCalibratedPair(index, difficulty))).toBe(true)
      expect(manager.enqueue(createCalibratedPair(index + 1, difficulty))).toBe(false)
    })

    expect(Object.values(manager.getAvailability()).every(count => count === 1)).toBe(true)
    expect(manager.hasCapacity()).toBe(false)
  })

  it('prioritizes lower difficulties when multiple queues are below target', () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:priority`
    localStorage.setItem(storageKey, JSON.stringify({
      VERY_EASY: [],
      EASY: [{ puzzle: encodeGrid(createPair(1).puzzle), solution: encodeGrid(createPair(1).solution), score: 1200 }],
      MEDIUM: [],
      HARD: [],
      VERY_HARD: [],
      EXPERT: [],
      NIGHTMARE: [],
      DIABOLICAL: [],
    }))

    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey,
      queueTargetSize: 2,
    })

    expect(manager.getNextDifficulty()).toBe('VERY_EASY')
  })

  it('updates the target size at runtime, including disabling generation', () => {
    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey: `${PUZZLE_QUEUE_STORAGE_KEY}:dynamic-target`,
      queueTargetSize: 1,
    })

    expect(manager.getNextDifficulty()).toBe('VERY_EASY')

    manager.setQueueTargetSize(0)

    expect(manager.hasCapacity()).toBe(false)
    expect(manager.getNextDifficulty()).toBeNull()
    expect(manager.enqueue(createCalibratedPair(0, 'VERY_EASY'))).toBe(false)

    manager.setQueueTargetSize(2)

    expect(manager.getNextDifficulty()).toBe('VERY_EASY')
    expect(manager.enqueue(createCalibratedPair(0, 'VERY_EASY'))).toBe(true)
  })

  it('takes a queued puzzle and updates availability for that difficulty', async () => {
    localStorage.setItem(
      `${PUZZLE_QUEUE_STORAGE_KEY}:take`,
      JSON.stringify(createStoredQueue()),
    )

    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey: `${PUZZLE_QUEUE_STORAGE_KEY}:take`,
      queueTargetSize: 1,
    })

    manager.start()
    const taken = await manager.take('MEDIUM')

    expect(taken?.puzzle[0][2]).toBe(0)
    expect(manager.getAvailability().MEDIUM).toBe(0)
    expect(manager.hasCapacity()).toBe(true)
  })

  it('persists generated puzzles to localStorage and restores them on a new manager', async () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:persist`
    const manager = createPuzzleQueueManager({
      storageKey,
      queueTargetSize: 1,
    })

    expect(manager.enqueue(createCalibratedPair(2, 'MEDIUM'))).toBe(true)
    expect(localStorage.getItem(storageKey)).not.toBeNull()

    const stored = JSON.parse(localStorage.getItem(storageKey)!)
    expect(stored.MEDIUM).toHaveLength(1)
    expect(stored.MEDIUM[0].puzzle).toMatch(/^[1-9.]{81}$/)

    const restoredManager = createPuzzleQueueManager({
      storageKey,
      queueTargetSize: 1,
    })

    expect(restoredManager.getAvailability().MEDIUM).toBe(1)
    expect(await restoredManager.take('MEDIUM')).not.toBeNull()
  })

  it('persists optional hodoku evaluation details with queued puzzles', async () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:metadata`
    const manager = createPuzzleQueueManager({
      storageKey,
      queueTargetSize: 1,
    })

    expect(manager.enqueue({
      ...createPair(3),
      difficulty: 'VERY_HARD',
      score: 1700,
    })).toBe(true)

    const restoredManager = createPuzzleQueueManager({
      storageKey,
      queueTargetSize: 1,
    })
    const taken = await restoredManager.take('VERY_HARD')

    expect(taken?.score).toBe(1700)
  })

  it('restores legacy queued puzzles without a stored score', async () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:legacy`
    const pair = createPair(4)
    localStorage.setItem(storageKey, JSON.stringify({
      VERY_EASY: [],
      EASY: [],
      MEDIUM: [{ puzzle: encodeGrid(pair.puzzle), solution: encodeGrid(pair.solution) }],
      HARD: [],
      VERY_HARD: [],
      EXPERT: [],
      NIGHTMARE: [],
      DIABOLICAL: [],
    }))

    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey,
      queueTargetSize: 1,
    })

    const taken = await manager.take('MEDIUM')

    expect(taken?.puzzle[0][4]).toBe(0)
    expect(taken?.score).toBeNull()
  })

  it('resets queued puzzles and availability', async () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:reset`
    const manager = createPuzzleQueueManager({
      storage: localStorage,
      storageKey,
      queueTargetSize: 1,
    })

    expect(manager.enqueue(createCalibratedPair(2, 'MEDIUM'))).toBe(true)
    expect(manager.getAvailability().MEDIUM).toBe(1)

    manager.reset()

    expect(manager.getAvailability().MEDIUM).toBe(0)
    expect(JSON.parse(localStorage.getItem(storageKey)!).MEDIUM).toEqual([])
    expect(await manager.take('MEDIUM')).toBeNull()
  })
})
