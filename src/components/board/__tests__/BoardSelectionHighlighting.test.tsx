import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  PUZZLE,
  SOLUTION,
} from './boardTestUtils'

const clipboardMocks = vi.hoisted(() => ({
  writeClipboardText: vi.fn(),
}))

vi.mock('../../../utils/sudoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/sudoku')>()
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
  ]
  const PUZZLE = SOLUTION.map((row, r) =>
    r === 0 ? [5, 3, 0, 6, 7, 8, 9, 1, 2] : [...row]
  )
  return {
    ...actual,
    generateGame: vi.fn().mockResolvedValue({ puzzle: PUZZLE, solution: SOLUTION }),
  }
})

vi.mock('../../../utils/generators/hodoku', () => ({
  analyzeRequiredTechniques: vi.fn(),
}))

vi.mock('../../../utils/clipboard', () => ({
  writeClipboardText: clipboardMocks.writeClipboardText,
}))

describe('Board selection highlighting', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('applies cross class to cells in the same row and column as selected', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[1].classList.contains('cross')).toBe(true)
    expect(cells[8].classList.contains('cross')).toBe(true)
    expect(cells[9].classList.contains('cross')).toBe(true)
    expect(cells[72].classList.contains('cross')).toBe(true)
    expect(cells[0].classList.contains('cross')).toBe(false)
  })

  it('applies cross class to cells in the same 3×3 box as selected', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[10].classList.contains('cross')).toBe(true)
    expect(cells[20].classList.contains('cross')).toBe(true)
    expect(cells[30].classList.contains('cross')).toBe(false)
  })

  it('does not apply cross class to same-digit cells (they get same-digit instead)', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    expect(cells[28].classList.contains('cross')).toBe(false)
  })
})
