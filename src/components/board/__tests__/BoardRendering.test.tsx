import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  renderBoard,
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

describe('Board rendering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders 81 cells and control buttons', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = await screen.findAllByRole('gridcell', undefined, { timeout: 10000 })
    expect(cells.length).toBe(81)
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eraser mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle notes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle brush mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle candidate tools/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle more tools/i })).toBeInTheDocument()
  })

  it('renders number pad with buttons 1–9', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    for (let d = 1; d <= 9; d++) {
      const btn = screen.getByRole('button', { name: new RegExp(`^${d},`) })
      expect(btn).toBeInTheDocument()
      expect(btn.getAttribute('data-digit')).toBe(String(d))
    }
  })

  it('does not render coordinate labels by default', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    expect(screen.queryByTestId('board-coordinate-columns')).toBeNull()
    expect(screen.queryByTestId('board-coordinate-rows')).toBeNull()
  })

  it('renders coordinate labels when enabled', async () => {
    renderBoard(PUZZLE, SOLUTION, { coordinateLabels: 'row-number-column-letter' })
    await waitForBoard()
    expect(screen.getByTestId('board-coordinate-columns')).toHaveTextContent('ABCDEFGHI')
    expect(screen.getByTestId('board-coordinate-rows')).toHaveTextContent('123456789')
  })

  it('renders numeric row and column coordinate labels', async () => {
    renderBoard(PUZZLE, SOLUTION, { coordinateLabels: 'row-number-column-number' })
    await waitForBoard()
    expect(screen.getByTestId('board-coordinate-columns')).toHaveTextContent('123456789')
    expect(screen.getByTestId('board-coordinate-rows')).toHaveTextContent('123456789')
  })

  it('uses puzzle metadata difficulty when no explicit difficulty prop is provided', async () => {
    renderBoard(PUZZLE, SOLUTION, { puzzleMetadata: { source: 'created', difficultyLabel: 'Very Hard', score: 1700 } })
    await waitForBoard()
    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
  })

  it('renders pause button and timer', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    const timerDisplay = document.querySelector('.timer-display')
    expect(timerDisplay).not.toBeNull()
    expect(timerDisplay!.textContent).toMatch(/\d+:\d\d/)
  })
})
