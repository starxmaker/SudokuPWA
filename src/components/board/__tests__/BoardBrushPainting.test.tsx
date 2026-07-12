import React from 'react'
import { screen, waitFor, act, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  mockCellRect,
  openHistoryToolsFromMore,
  PUZZLE,
  PUZZLE_WITH_7_REMAINING,
  PUZZLE_WITH_MULTIPLE_CANDIDATES,
  SOLUTION,
} from './boardTestUtils'
import { clearAllColors } from '../../../store/gameSlice'
import { setPaintingScope } from '../../../store/settingsSlice'

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

describe('Board brush painting', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('brush toggle shows and hides brush colors', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()
    const user = userEvent.setup()
    const brushBtn = screen.getByRole('button', { name: /toggle brush mode/i })
    const notesBtn = screen.getByRole('button', { name: /toggle notes mode/i })

    expect(brushBtn.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: /brush color 1/i })).toBeNull()
    expect(screen.getByRole('button', { name: /^4,/ })).toBeInTheDocument()

    await user.click(brushBtn)
    expect(brushBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /brush color remover/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /brush color 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /brush color 8/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /brush color 9/i })).toBeNull()
    expect(screen.getByRole('button', { name: /toggle more tools/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /brush color 1/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /brush color remover/i }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()
    const brushColors = screen.getByRole('toolbar', { name: /brush colors/i })
    const colorButtons = within(brushColors).getAllByRole('button', { name: /brush color/i })
    expect(colorButtons.at(-1)).toHaveAccessibleName(/brush color remover/i)

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(notesBtn)
    expect(notesBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: /brush color 1/i })).toBeNull()
    expect(screen.getByRole('button', { name: /^4,/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle notes mode/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    const brushBtnAgain = screen.getByRole('button', { name: /toggle brush mode/i })
    const notesBtnAgain = screen.getByRole('button', { name: /toggle notes mode/i })
    await user.click(brushBtnAgain)
    expect(brushBtnAgain.getAttribute('aria-pressed')).toBe('true')
    expect(notesBtnAgain.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /brush color 1/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    const brushBtnFinal = screen.getByRole('button', { name: /toggle brush mode/i })
    expect(brushBtnFinal.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: /brush color 1/i })).toBeNull()
    expect(screen.getByRole('button', { name: /^4,/ })).toBeInTheDocument()
  })

  it('applies a brush color layer to a cell on quick tap', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(cells[2].classList.contains('selected-brush')).toBe(true)
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()
  })

  it('highlights matching givens when selecting a filled cell in brush mode', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[0])

    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    expect(cells[0].querySelector('.cell-color-layer')).toBeNull()
  })

  it('highlights matching user entries when selecting a filled cell in brush mode', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])

    expect(cells[2].classList.contains('selected-brush')).toBe(true)
    expect(cells[10].classList.contains('same-digit')).toBe(true)
    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
  })

  it('restores brush painting state after toggling history tools off', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[0])

    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)

    await openHistoryToolsFromMore(user)

    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)

    await openHistoryToolsFromMore(user)

    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
  })

  it('accumulates brush colors on a cell across multiple paint passes', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    await user.click(cells[2])

    const colorLayer = cells[2].querySelector('.cell-color-layer')
    expect(colorLayer).not.toBeNull()
    expect(colorLayer?.getAttribute('style')).toContain('linear-gradient')
    expect(colorLayer?.getAttribute('style')).toContain('var(--brush-fill-rose)')
    expect(colorLayer?.getAttribute('style')).toContain('var(--brush-fill-orange)')
    expect(screen.getByRole('button', { name: /brush color 1/i }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /brush color 2/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('opens the candidate overlay when candidate painting mode is enabled and paints an existing candidate', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(screen.getByRole('dialog', { name: /candidate painter/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    expect(screen.getByRole('dialog', { name: /candidate painter/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /paint candidate 4/i }))
    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()

    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[3].classList.contains('cell-note--colored')).toBe(true)
    expect(noteSpans[0].classList.contains('cell-note--colored')).toBe(false)
    expect(noteSpans[3].textContent).toBe('4')
    expect(noteSpans[0].textContent).toBe('')
    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
  })

  it('keeps highlighting a filled cell in candidate coloring mode without allowing coloring', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[0])

    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()
    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    expect(cells[0].querySelector('.cell-color-layer')).toBeNull()
  })

  it('closes the candidate overlay when clicking outside it', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(screen.getByRole('dialog', { name: /candidate painter/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close candidate painter/i }))
    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()
  })

  it('highlights matching digits in the board when previewing a candidate in the overlay', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    const candidateButton = screen.getByRole('button', { name: /paint candidate 4/i })
    fireEvent.pointerMove(candidateButton)

    expect(cells[33].classList.contains('same-digit')).toBe(true)
    expect(cells[33].classList.contains('cross')).toBe(false)
    expect(cells[2].querySelectorAll('.cell-note')[3].classList.contains('cell-note--highlight')).toBe(true)

    await user.click(screen.getByRole('button', { name: /close candidate painter/i }))
    expect(cells[33].classList.contains('same-digit')).toBe(false)
  })

  it('keeps matching digits highlighted after painting a candidate from the overlay', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /paint candidate 4/i }))

    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()
    expect(cells[33].classList.contains('same-digit')).toBe(true)
    expect(cells[2].querySelectorAll('.cell-note')[3].classList.contains('cell-note--highlight')).toBe(true)

    await user.click(cells[4])
    expect(cells[33].classList.contains('same-digit')).toBe(false)
  })

  it('does not preview a candidate just because an overlay button receives focus', async () => {
    renderBoard(PUZZLE, SOLUTION, { paintingScope: 'candidate' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    const candidateButton = screen.getByRole('button', { name: /paint candidate 4/i })
    fireEvent.focus(candidateButton)

    expect(cells[33].classList.contains('same-digit')).toBe(false)
    expect(cells[2].querySelectorAll('.cell-note')[3].classList.contains('cell-note--highlight')).toBe(false)
  })

  it('clear cell removes selected brush colors', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
  })

  it('clears all brush colors', async () => {
    const view = renderBoard(PUZZLE_WITH_MULTIPLE_CANDIDATES, SOLUTION, { paintingScope: 'digit' })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /^7,/ }))

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()

    view.store.dispatch(setPaintingScope('candidate'))

    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /paint candidate 7/i }))
    expect(cells[4].querySelector('.cell-note--colored')).not.toBeNull()

    await act(async () => { view.store.dispatch(clearAllColors()) })

    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
    expect(cells[4].querySelector('.cell-note--colored')).toBeNull()
  })
})
