import React from 'react'
import { screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  PUZZLE_WITH_7_REMAINING,
  SOLUTION,
} from './boardTestUtils'
import { clearAllColors } from '../../../store/gameSlice'

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

describe('Board first color flag', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('persists the first color flag toggle and keeps the first colored cell flagged', async () => {
    const user = userEvent.setup()
    const firstRender = renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { firstColorFlag: true })
    const cells = screen.getAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    await user.click(cells[4])

    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(cells[4].querySelector('.cell-flag-border')).toBeNull()

    firstRender.unmount()

    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { firstColorFlag: true, useLocalStorage: true })
    await waitForBoard()
    const rerenderedCells = screen.getAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    expect(rerenderedCells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(rerenderedCells[4].querySelector('.cell-flag-border')).toBeNull()
  })

  it('clears and resets the first color flag when board colors are removed', async () => {
    const view = renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { firstColorFlag: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    await user.click(cells[4])

    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(cells[4].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(cells[2])

    expect(cells[2].querySelector('.cell-flag-border')).toBeNull()
    expect(cells[4].querySelector('.cell-flag-border')).toBeNull()

    await act(async () => { view.store.dispatch(clearAllColors()) })
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[4])

    expect(cells[4].querySelector('.cell-flag-border')).not.toBeNull()
  })

  it('removes the cell brush color when a number is entered', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
    expect(cells[2].textContent?.trim()).toBe('4')
  })
})
