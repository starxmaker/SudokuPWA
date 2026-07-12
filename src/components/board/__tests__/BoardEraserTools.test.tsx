import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {renderBoard,
  waitForBoard,
  mockCellRect,
  emptyNotesGrid,
  PUZZLE,
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

describe('Board eraser tools', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('shows eraser-mode clear actions instead of numbers or colors', async () => {
    renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    await waitForBoard()
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /^4,/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))

    expect(screen.getByRole('button', { name: /clean colors/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /brush color 1/i })).toBeNull()
  })

  it('clears loaded colors from the eraser action bar', async () => {
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

    const view = renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    await waitForBoard()
    const user = userEvent.setup()

    expect(view.container.querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(screen.getByRole('button', { name: /clean colors/i }))
    await waitFor(() => expect(view.container.querySelector('.cell-color-layer')).toBeNull())
  })

  it('shows remove all candidates button in eraser mode disabled when no notes exist', async () => {
    renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    await waitForBoard()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))

    const removeCandidatesBtn = screen.getByRole('button', { name: /remove all candidates/i })
    expect(removeCandidatesBtn).toBeInTheDocument()
    expect(removeCandidatesBtn).toBeDisabled()
  })

  it('enables and clears all notes when remove all candidates is clicked', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [1, 2, 3]
    notes[4][4] = [5, 9]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    const view = renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    await waitForBoard()
    const user = userEvent.setup()

    expect(view.container.querySelectorAll('.cell-note').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    const removeCandidatesBtn = screen.getByRole('button', { name: /remove all candidates/i })
    expect(removeCandidatesBtn).toBeEnabled()

    await user.click(removeCandidatesBtn)
    await waitFor(() => expect(view.container.querySelectorAll('.cell-note').length).toBe(0))
  })

  it('undo restores notes cleared by remove all candidates', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [1, 2, 3]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    const view = renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    await waitForBoard()
    const user = userEvent.setup()

    const initialNoteCount = view.container.querySelectorAll('.cell-note').length
    expect(initialNoteCount).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(screen.getByRole('button', { name: /remove all candidates/i }))
    await waitFor(() => expect(view.container.querySelectorAll('.cell-note').length).toBe(0))

    await user.click(screen.getByRole('button', { name: /^undo$/i }))
    await waitFor(() => expect(view.container.querySelectorAll('.cell-note').length).toBe(initialNoteCount))
  })

  it('opens the candidate overlay in eraser mode and removes only the selected candidate', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4, 7]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    mockCellRect(cells[2])
    await user.click(cells[2])

    expect(screen.getByRole('dialog', { name: /candidate eraser/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /erase candidate 7/i }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /candidate eraser/i })).toBeNull())
    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[3].textContent).toBe('4')
    expect(noteSpans[6].textContent).toBe('')
  })

  it('removes a touched candidate directly in stylus eraser mode without opening the overlay', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4, 7]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    renderBoard(PUZZLE, SOLUTION, {  pencilMode: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    mockCellRect(cells[2])
    fireEvent.pointerDown(cells[2], { pointerId: 3, pointerType: 'touch', button: 0, clientX: 15, clientY: 75 })

    expect(screen.queryByRole('dialog', { name: /candidate eraser/i })).toBeNull()

    await waitFor(() => {
      const noteSpans = cells[2].querySelectorAll('.cell-note')
      expect(noteSpans[3].textContent).toBe('4')
      expect(noteSpans[6].textContent).toBe('')
    })
  })

  it('does not highlight matching digits when previewing a candidate in the eraser overlay', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4, 7]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    renderBoard(PUZZLE, SOLUTION, {  useLocalStorage: true , useLocalStorage: true })
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    mockCellRect(cells[2])
    await user.click(cells[2])

    const candidateButton = screen.getByRole('button', { name: /erase candidate 4/i })
    fireEvent.pointerMove(candidateButton)

    expect(cells[33].classList.contains('same-digit')).toBe(false)
    expect(cells[2].querySelectorAll('.cell-note')[3].classList.contains('cell-note--highlight')).toBe(false)
  })
})
