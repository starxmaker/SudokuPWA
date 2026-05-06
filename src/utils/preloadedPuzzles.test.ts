import { describe, expect, it, vi } from 'vitest'
import { getPreloadedPuzzleAvailability, takePreloadedPuzzle } from './preloadedPuzzles'
import type { GameDifficulty } from './difficulties'

const DIFFICULTIES: GameDifficulty[] = [
  'VERY_EASY',
  'EASY',
  'MEDIUM',
  'HARD',
  'VERY_HARD',
  'EXPERT',
  'NIGHTMARE',
  'DIABOLICAL',
]

describe('preloadedPuzzles', () => {
  it('has offline fallback puzzles for every supported difficulty', () => {
    const availability = getPreloadedPuzzleAvailability()

    for (const difficulty of DIFFICULTIES) {
      expect(availability[difficulty]).toBeGreaterThan(0)
    }
  })

  it('returns a random puzzle from the requested difficulty', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const puzzle = takePreloadedPuzzle('DIABOLICAL')

    expect(puzzle).not.toBeNull()
    expect(puzzle?.difficulty).toBe('DIABOLICAL')
    expect(puzzle?.score).not.toBeNull()
    expect(puzzle?.puzzle.flat().includes(0)).toBe(true)

    randomSpy.mockRestore()
  })
})
