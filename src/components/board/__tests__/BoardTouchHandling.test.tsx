import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  PUZZLE,
  PUZZLE_WITH_7_REMAINING,
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

describe('Board numpad touch handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  function touchThenGhostClick(btn: HTMLElement) {
    fireEvent.pointerDown(btn, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.pointerUp(btn, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.click(btn)
  }

  it('applies a note exactly once when a touch pointerdown + ghost click arrive', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)

    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
  })

  it('toggling same note twice via touch removes it', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).toBeNull())
  })

  it('mouse click still works after a touch interaction', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())

    await user.click(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).toBeNull())
  })

  it('mouse click still works after a last-remaining touch digit entry', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2]).toHaveTextContent('4'))

    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    await waitFor(() => expect(cells[4]).toHaveTextContent('7'))
  })
})
