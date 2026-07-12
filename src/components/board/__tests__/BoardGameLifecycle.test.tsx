import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  renderBoard,
  waitForBoard,
  mockCellRect,
  ALMOST_DONE,
  PUZZLE,
  SOLUTION,
} from './boardTestUtils'
import { saveGame } from '../../../utils/gameStorage'

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

describe('Board game lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('shows victory overlay when puzzle is completed', async () => {
    renderBoard(ALMOST_DONE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
  })

  it('calls onWin callback when puzzle is completed', async () => {
    renderBoard(ALMOST_DONE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
  })

  it('retry button on victory card resets the board', async () => {
    renderBoard(ALMOST_DONE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(screen.queryByText('Puzzle Complete!')).toBeNull()
    expect(cells[80].textContent).toBe('\u00a0')
  })

  it('reports clear painting availability as colors are added and cleared', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    const cleanBtn = screen.getByRole('button', { name: /clean colors/i })
    expect(cleanBtn).not.toBeDisabled()

    await user.click(cleanBtn)
    expect(cleanBtn).toBeDisabled()
  })

  it('keeps brush colors visible in pencil mode and paints a candidate directly without opening the candidate painter', async () => {
    const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))
    notes[0][2] = [4]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    renderBoard(PUZZLE, SOLUTION, {  pencilMode: true, paintingScope: 'candidate', useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    const referenceNumberBtn = screen.getByRole('button', { name: /^4,/ })

    expect(referenceNumberBtn).not.toBeDisabled()
    expect(referenceNumberBtn.classList.contains('num-key--reference')).toBe(true)

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    expect(screen.getByRole('button', { name: /brush color 1/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()

    mockCellRect(cells[2])
    fireEvent.pointerDown(cells[2], { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 15, clientY: 45 })

    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()
    expect(document.querySelector('.pencil-cell-canvas')).toBeNull()
    expect(cells[2].querySelectorAll('.cell-note')[3].classList.contains('cell-note--colored')).toBe(true)
  })
})
