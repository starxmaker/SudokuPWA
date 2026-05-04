import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { GameDifficulty, PuzzleSolutionPair } from './generators/types'
import { createPuzzleQueueManager, PUZZLE_QUEUE_STORAGE_KEY } from './puzzleQueue'
import { encodeGrid } from './gameStorage'

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
        [{ puzzle: encodeGrid(pair.puzzle), solution: encodeGrid(pair.solution) }],
      ]
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('puzzle queue', () => {
  it('fills missing difficulties in the background', async () => {
    const generated: GameDifficulty[] = []
    const manager = createPuzzleQueueManager({
      generatePuzzle: vi.fn(async (difficulty: GameDifficulty) => {
        generated.push(difficulty)
        return createPair(generated.length)
      }),
      storage: localStorage,
      storageKey: `${PUZZLE_QUEUE_STORAGE_KEY}:fill`,
      queueTargetSize: 1,
    })

    manager.start()
    await vi.waitFor(() => {
      expect(Object.values(manager.getAvailability()).every(count => count === 1)).toBe(true)
    })

    expect(generated).toEqual([
      'VERY_EASY',
      'EASY',
      'MEDIUM',
      'HARD',
      'VERY_HARD',
      'EXPERT',
      'NIGHTMARE',
      'DIABOLICAL',
    ])
    manager.stop()
  })

  it('takes a queued puzzle and immediately schedules a refill for that difficulty', async () => {
    localStorage.setItem(
      `${PUZZLE_QUEUE_STORAGE_KEY}:take`,
      JSON.stringify(createStoredQueue()),
    )

    const generatePuzzle = vi.fn(async () => createPair(4))
    const manager = createPuzzleQueueManager({
      generatePuzzle,
      storage: localStorage,
      storageKey: `${PUZZLE_QUEUE_STORAGE_KEY}:take`,
      queueTargetSize: 1,
    })

    manager.start()
    const taken = await manager.take('MEDIUM')

    expect(taken?.puzzle[0][2]).toBe(0)
    expect(manager.getAvailability().MEDIUM).toBe(0)

    await vi.waitFor(() => {
      expect(generatePuzzle).toHaveBeenCalledWith('MEDIUM')
      expect(manager.getAvailability().MEDIUM).toBe(1)
    })

    manager.stop()
  })

  it('persists generated puzzles to localStorage and restores them on a new manager', async () => {
    const storageKey = `${PUZZLE_QUEUE_STORAGE_KEY}:persist`
    const generatePuzzle = vi.fn(async (difficulty: GameDifficulty) => {
      const index = [
        'VERY_EASY',
        'EASY',
        'MEDIUM',
        'HARD',
        'VERY_HARD',
        'EXPERT',
        'NIGHTMARE',
        'DIABOLICAL',
      ].indexOf(difficulty)
      return createPair(Math.max(index, 0))
    })

    const manager = createPuzzleQueueManager({
      generatePuzzle,
      storageKey,
      queueTargetSize: 1,
    })

    manager.start()

    await vi.waitFor(() => {
      expect(Object.values(manager.getAvailability()).every(count => count === 1)).toBe(true)
      expect(localStorage.getItem(storageKey)).not.toBeNull()
    })

    const stored = JSON.parse(localStorage.getItem(storageKey)!)
    expect(stored.MEDIUM).toHaveLength(1)
    expect(stored.MEDIUM[0].puzzle).toMatch(/^[1-9.]{81}$/)
    manager.stop()

    const restoredGeneratePuzzle = vi.fn(async () => createPair(8))
    const restoredManager = createPuzzleQueueManager({
      generatePuzzle: restoredGeneratePuzzle,
      storageKey,
      queueTargetSize: 1,
    })

    expect(restoredManager.getAvailability().MEDIUM).toBe(1)
    expect(await restoredManager.take('MEDIUM')).not.toBeNull()
    expect(restoredGeneratePuzzle).not.toHaveBeenCalled()
  })
})
