import React from 'react'
import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  openHistoryToolsFromMore,
  mockCellRect,
  PUZZLE,
  PUZZLE_WITH_3_REMAINING,
  PUZZLE_WITH_MULTIPLE_CANDIDATES,
  SOLUTION,
} from './boardTestUtils'
import { fillAllCandidates } from '../../../store/gameSlice'

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

describe('Board notes and candidates', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('notes toggle button changes aria-pressed state', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    const user = userEvent.setup()
    const notesBtn = screen.getByRole('button', { name: /toggle notes mode/i })
    expect(notesBtn.getAttribute('aria-pressed')).toBe('false')
    await user.click(notesBtn)
    expect(notesBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /toggle more tools/i })).toBeInTheDocument()
    await user.click(notesBtn)
    expect(notesBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('candidate tool shows the basic candidates action and fills candidates', async () => {
    renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION)
    await waitForBoard()
    const user = userEvent.setup()

    const cells = screen.getAllByRole('gridcell')
    expect(cells[2].querySelector('.cell-notes')).toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /show all basic candidates/i }))

    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
  })

  it('candidate tool promotes single candidates to digits', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    const user = userEvent.setup()

    const cells = screen.getAllByRole('gridcell')
    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /show all basic candidates/i }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /single candidate to digit/i }))
    await waitFor(() => expect(cells[2]).toHaveTextContent('4'))
  })

  it('fills simple candidates for all empty cells', async () => {
    const view = renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION)
    const cells = screen.getAllByRole('gridcell')

    await act(async () => { view.store.dispatch(fillAllCandidates()) })

    const cell02Notes = cells[2].querySelectorAll('.cell-note')
    expect(cell02Notes[3].textContent).toBe('4')
    expect(cell02Notes[6].textContent).toBe('7')

    const cell04Notes = cells[4].querySelectorAll('.cell-note')
    expect(cell04Notes[6].textContent).toBe('7')
    expect(cell04Notes[3].textContent).toBe('')

    const cell10Notes = cells[10].querySelectorAll('.cell-note')
    expect(cell10Notes[6].textContent).toBe('7')

    const cell74Notes = cells[65].querySelectorAll('.cell-note')
    expect(cell74Notes[6].textContent).toBe('7')
  })

  it('disables fill-all when there are no empty cells', async () => {
    const FULL_GRID_NO_EMPTY = SOLUTION.map((row, r) =>
      r === 0 ? [5, 5, 4, 6, 7, 8, 9, 1, 2] : [...row]
    )
    renderBoard(FULL_GRID_NO_EMPTY, SOLUTION)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    const fillBtn = screen.getByRole('button', { name: /show all basic candidates/i })
    expect(fillBtn).toBeDisabled()
  })

  it('does not replace existing candidates when filling all empty cells', async () => {
    const view = renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    await act(async () => { view.store.dispatch(fillAllCandidates()) })

    const cell02Notes = cells[2].querySelectorAll('.cell-note')
    expect(cell02Notes[3].textContent).toBe('4')
    expect(cell02Notes[6].textContent).toBe('')

    const cell04Notes = cells[4].querySelectorAll('.cell-note')
    expect(cell04Notes[6].textContent).toBe('7')
  })

  it('highlights matching note candidates when a filled cell with that digit is selected', async () => {
    renderBoard(PUZZLE_WITH_3_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^3,/ }))
    await user.click(cells[1])
    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[2].classList.contains('cell-note--highlight')).toBe(true)
    expect(noteSpans[0].classList.contains('cell-note--highlight')).toBe(false)
  })

  it('highlights the entered note digit in pencil mode', async () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
    } as unknown as CanvasRenderingContext2D)

    renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION, { pencilMode: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    mockCellRect(cells[2])
    fireEvent.pointerDown(cells[2], { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 15, clientY: 15 })
    fireEvent.keyDown(window, { key: '4' })

    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[3].classList.contains('cell-note--highlight')).toBe(true)
    expect(cells[16].classList.contains('same-digit')).toBe(true)

    getContextSpy.mockRestore()
  })

  it('removes note highlight when a non-matching cell is selected', async () => {
    renderBoard(PUZZLE_WITH_3_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^3,/ }))
    await user.click(cells[0])
    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[2].classList.contains('cell-note--highlight')).toBe(false)
  })

  it('keeps selected reference digits active while history tools are toggled', async () => {
    renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION, { pencilMode: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[1])
    const referenceNumberBtn = screen.getByRole('button', { name: /^5,/ })
    await user.click(referenceNumberBtn)

    expect(referenceNumberBtn).toHaveAttribute('aria-pressed', 'true')
    expect(cells[0].classList.contains('same-digit')).toBe(true)

    await openHistoryToolsFromMore(user)

    expect(referenceNumberBtn).toHaveAttribute('aria-pressed', 'true')
    expect(cells[0].classList.contains('same-digit')).toBe(true)

    await openHistoryToolsFromMore(user)

    expect(referenceNumberBtn).toHaveAttribute('aria-pressed', 'true')
    expect(cells[0].classList.contains('same-digit')).toBe(true)
  })
})
