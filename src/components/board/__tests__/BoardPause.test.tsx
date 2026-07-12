import React from 'react'
import { screen, waitFor } from '@testing-library/react'
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

describe('Board pause display', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('pause button toggles aria-label', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    const user = userEvent.setup()
    const pauseBtn = screen.getByRole('button', { name: 'Pause' })
    await user.click(pauseBtn)
    const resumeBtns = screen.getAllByRole('button', { name: 'Resume' })
    expect(resumeBtns.length).toBeGreaterThanOrEqual(1)
    const timerResumeBtn = resumeBtns.find(btn => btn.classList.contains('timer-pause'))
    await user.click(timerResumeBtn ?? resumeBtns[0])
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('auto-pauses when window loses focus (blur)', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    window.dispatchEvent(new Event('blur'))
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Resume' }).length).toBeGreaterThanOrEqual(1)
    )
  })

  it('auto-pauses when tab becomes hidden (visibilitychange)', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Resume' }).length).toBeGreaterThanOrEqual(1)
    )
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  })

  it('does not auto-pause on focusout (mobile tap protection)', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    const editableCell = screen.getAllByRole('gridcell').find(c => !c.classList.contains('given'))!
    editableCell.dispatchEvent(new Event('focusout', { bubbles: true }))
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('removes user class from cells with user entries when paused', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[2].classList.contains('user')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('user')).toBe(false)
  })

  it('removes selected class when paused', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    expect(cells[2].classList.contains('selected')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('selected')).toBe(false)
  })

  it('removes same-digit class when paused', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[28].classList.contains('same-digit')).toBe(false)
  })

  it('removes cross class when paused', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[1].classList.contains('cross')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[1].classList.contains('cross')).toBe(false)
  })

  it('removes error class when paused', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { autoCheck: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[2].classList.contains('error')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('error')).toBe(false)
  })

  it('hides the first-color flag border when paused and restores it on resume', async () => {
    renderBoard(PUZZLE, SOLUTION, { firstColorFlag: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].querySelector('.cell-flag-border')).toBeNull()

    const resumeBtns = screen.getAllByRole('button', { name: 'Resume' })
    const timerResumeBtn = resumeBtns.find(btn => btn.classList.contains('timer-pause'))
    await user.click(timerResumeBtn ?? resumeBtns[0])
    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()
  })

  it('restores classes after resuming', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[2].classList.contains('user')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('user')).toBe(false)
    const resumeBtns = screen.getAllByRole('button', { name: 'Resume' })
    const timerResumeBtn = resumeBtns.find(btn => btn.classList.contains('timer-pause'))
    await user.click(timerResumeBtn ?? resumeBtns[0])
    expect(cells[2].classList.contains('user')).toBe(true)
  })
})
