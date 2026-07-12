import React from 'react'
import { screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  openHistoryToolsFromMore,
  emptyNotesGrid,
  PUZZLE,
  PUZZLE_WITH_7_REMAINING,
  SOLUTION,
} from './boardTestUtils'
import { saveGame, emptyCellColors, emptyCandidateColors } from '../../../utils/gameStorage'

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

describe('Board haptic callbacks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('calls onTriggerHaptic when haptic=true and a cell is clicked', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when haptic=true and a numpad button is clicked', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    onTriggerHaptic.mockClear()
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic once for a regular touch digit entry', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, onTriggerHaptic, autoCheck: false, useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    onTriggerHaptic.mockClear()

    const btn7 = screen.getByRole('button', { name: /^7,/ })
    fireEvent.pointerDown(btn7, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.pointerUp(btn7, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.click(btn7)

    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic on touch when entering the last remaining digit', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    onTriggerHaptic.mockClear()

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    fireEvent.pointerDown(btn4, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.pointerUp(btn4, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.click(btn4)

    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when erasing a cell via eraser mode', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    onTriggerHaptic.mockClear()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    onTriggerHaptic.mockClear()
    await user.click(cells[2])

    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when main tool buttons are pressed', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')

    for (const name of [
      /eraser mode/i,
      /toggle notes mode/i,
      /toggle brush mode/i,
      /toggle candidate tools/i,
      /toggle more tools/i,
    ]) {
      onTriggerHaptic.mockClear()
      await user.click(screen.getByRole('button', { name }))
      expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
    }

    await user.click(screen.getByRole('button', { name: /toggle more tools/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    onTriggerHaptic.mockClear()
    await user.click(screen.getByRole('button', { name: /^undo$/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)

    onTriggerHaptic.mockClear()
    const notesButton = screen.getByRole('button', { name: /toggle notes mode/i })
    await user.click(notesButton)
    await user.click(notesButton)
    expect(onTriggerHaptic).toHaveBeenCalledTimes(2)
  })

  it('calls onTriggerHaptic when history subtools are pressed', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    await openHistoryToolsFromMore(user)
    const historyToolbar = screen.getByRole('toolbar', { name: /history actions/i })
    onTriggerHaptic.mockClear()

    await user.click(within(historyToolbar).getByRole('button', { name: /^undo$/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)

    onTriggerHaptic.mockClear()
    await user.click(within(historyToolbar).getByRole('button', { name: /redo/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when eraser subtools are pressed', async () => {
    const onTriggerHaptic = vi.fn()
    const cellColors = emptyCellColors()
    cellColors[0][2] = ['rose']
    saveGame(
      PUZZLE,
      PUZZLE,
      SOLUTION,
      emptyNotesGrid(),
      cellColors,
      emptyCandidateColors()
    )
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    onTriggerHaptic.mockClear()

    await user.click(screen.getByRole('button', { name: /clean colors/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when candidate subtools are pressed', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    onTriggerHaptic.mockClear()

    await user.click(screen.getByRole('button', { name: /show all basic candidates/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()

    onTriggerHaptic.mockClear()
    await user.click(screen.getByRole('button', { name: /single candidate to digit/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('does not call onTriggerHaptic when haptic=false', async () => {
    const onTriggerHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: false, onTriggerHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerHaptic).not.toHaveBeenCalled()
  })

  it('calls onTriggerErrorHaptic when haptic=true, autoCheck=true, and a wrong digit is entered', async () => {
    const onTriggerErrorHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, autoCheck: true, onTriggerHaptic: vi.fn(), onTriggerErrorHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(onTriggerErrorHaptic).toHaveBeenCalledTimes(1)
  })

  it('does not call onTriggerErrorHaptic for a correct digit', async () => {
    const onTriggerErrorHaptic = vi.fn()
    renderBoard(PUZZLE, SOLUTION, {  haptic: true, autoCheck: true, onTriggerHaptic: vi.fn(), onTriggerErrorHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerErrorHaptic).not.toHaveBeenCalled()
  })

  it('does not call onTriggerErrorHaptic when autoCheck=false even if digit is wrong', async () => {
    const onTriggerErrorHaptic = vi.fn()
    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION, {  haptic: true, autoCheck: false, onTriggerErrorHaptic , useLocalStorage: true })
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(onTriggerErrorHaptic).not.toHaveBeenCalled()
  })
})
