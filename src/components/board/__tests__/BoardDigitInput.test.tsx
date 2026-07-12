import React from 'react'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  openHistoryToolsFromMore,
  PUZZLE,
  PUZZLE_WITH_7_REMAINING,
  PUZZLE_WITH_3_REMAINING,
  PUZZLE_WITH_MULTIPLE_CANDIDATES,
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

describe('Board digit input', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('enters a digit via numpad and shows it in the cell', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    expect(cells[2].getAttribute('aria-selected')).toBe('true')
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].textContent?.trim()).toBe('4')
  })

  it('enables undo after digit entry; undo and redo update the cell', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    await openHistoryToolsFromMore(user)
    const historyToolbar = screen.getByRole('toolbar', { name: /history actions/i })
    const undoBtn = within(historyToolbar).getByRole('button', { name: /^undo$/i })
    const redoBtn = within(historyToolbar).getByRole('button', { name: /redo/i })
    expect(undoBtn).not.toBeDisabled()
    expect(redoBtn).toBeDisabled()
    await user.click(undoBtn)
    expect(cells[2].textContent).toBe('\u00a0')
    expect(redoBtn).not.toBeDisabled()
    await user.click(redoBtn)
    expect(cells[2].textContent?.trim()).toBe('7')
  })

  it('clears an entered digit using the eraser button', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[2].textContent?.trim()).toBe('7')
    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(cells[2])
    expect(cells[2].textContent).toBe('\u00a0')
  })

  it('adds a pencil note when notes mode is active', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()
  })

  it('blocks digit entry in brush mode', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))

    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()

    fireEvent.keyDown(window, { key: '4' })
    expect(cells[2].textContent).toBe('\u00a0')
  })

  it('restores candidates on first undo after a wrong entry', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[2].textContent?.trim()).toBe('7')

    await openHistoryToolsFromMore(user)
    const undoBtn = within(screen.getByRole('toolbar', { name: /history actions/i })).getByRole('button', { name: /^undo$/i })
    await user.click(undoBtn)
    expect(cells[2].classList.contains('user')).toBe(false)
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()
  })

  it('keeps peer candidates on wrong entry when auto-check and auto-remove are enabled', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { autoCheck: true, autoRemove: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()
  })

  it('removes peer candidates on correct entry when auto-check and auto-remove are enabled', async () => {
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, { autoCheck: true, autoRemove: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[4].querySelector('.cell-notes')).toBeNull()
  })

  it('disables exhausted digit buttons in entry and notes mode', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    const sevenBtn = screen.getByRole('button', { name: /^7,/ })

    expect(sevenBtn).toBeDisabled()
    await user.click(cells[2])
    await user.click(sevenBtn)
    expect(cells[2].textContent).toBe('\u00a0')

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    expect(sevenBtn).toBeDisabled()
    await user.click(sevenBtn)
    expect(cells[2].querySelector('.cell-notes')).toBeNull()
  })

  it('selects given digits in pencil mode', async () => {
    renderBoard(PUZZLE, SOLUTION, { pencilMode: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[0])

    expect(cells[0].classList.contains('selected')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
  })

  it('handles digit entry via keyboard', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    fireEvent.keyDown(window, { key: '4' })
    await waitFor(() => expect(cells[2].textContent?.trim()).toBe('4'))
  })

  it('handles cell navigation via arrow keys', async () => {
    renderBoard(PUZZLE, SOLUTION)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await waitFor(() => expect(cells[2 + 9].getAttribute('aria-selected')).toBe('true'))
  })

  it('keeps icons in the main tool tray', async () => {
    renderBoard(PUZZLE, SOLUTION)
    await waitForBoard()

    const toolbar = screen.getByRole('toolbar', { name: /game tools/i })
    expect(within(toolbar).getByRole('button', { name: /^undo$/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /eraser mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle notes mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle brush mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle candidate tools/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle more tools/i }).querySelector('svg')).not.toBeNull()
  })
})
