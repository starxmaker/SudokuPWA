import { beforeEach, describe, expect, it, vi } from 'vitest'

const PUZZLE = '.'.repeat(81)
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('sudokuGenerator worker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('keeps the HoDoKu stream alive after posting a valid puzzle', async () => {
    const postMessage = vi.fn()
    let callbackResult: boolean | void = undefined

    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      value: {
        postMessage,
        onmessage: null,
      },
    })

    vi.doMock('./generators/hodoku', () => ({
      generate: vi.fn(async (_difficulty, onValidNewPuzzle: (rating: { puzzle: string; solution: string | null; score: number | null; difficulty: string | null }) => boolean | void) => {
        callbackResult = onValidNewPuzzle({
          puzzle: PUZZLE,
          solution: SOLUTION,
          difficulty: 'VERY_EASY',
          score: 100,
        })
      }),
    }))

    await import('./sudokuGenerator.worker')

    await (globalThis.self as { onmessage: ((event: { data: { type: 'stream-start'; difficulty: 'VERY_EASY' } }) => Promise<void>) | null }).onmessage?.({
      data: { type: 'stream-start', difficulty: 'VERY_EASY' },
    })

    expect(postMessage).toHaveBeenCalledWith({
      type: 'stream-puzzle',
      puzzle: Array.from({ length: 9 }, () => Array(9).fill(0)),
      solution: [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ],
      difficulty: 'VERY_EASY',
      score: 100,
    })
    expect(callbackResult).toBe(true)
  })
})
