import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from './Board'
import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => localStorage.clear())

// A valid, fully-solved sudoku grid (Wikipedia example)
const SOLUTION: number[][] = [
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

// Puzzle: solution with cell [0][2] zeroed out (editable, answer = 4)
const PUZZLE: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 3, 0, 6, 7, 8, 9, 1, 2] : [...row]
)

// Almost-complete puzzle: only cell [8][8] is blank (answer = 9)
const ALMOST_DONE: number[][] = SOLUTION.map((row, r) =>
  r === 8 ? [...row.slice(0, 8), 0] : [...row]
)

async function waitForBoard() {
  await screen.findAllByRole('gridcell')
}

describe('Board component', () => {
  it('renders 81 cells and control buttons', async () => {
    render(<Board />)
    const cells = await screen.findAllByRole('gridcell')
    expect(cells.length).toBe(81)
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear cell/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle notes/i })).toBeInTheDocument()
  })

  it('renders number pad with buttons 1–9', async () => {
    render(<Board />)
    await waitForBoard()
    for (let d = 1; d <= 9; d++) {
      // aria-label is e.g. "3, 7 remaining" — anchor with leading digit + comma
      expect(screen.getByRole('button', { name: new RegExp(`^${d},`) })).toBeInTheDocument()
    }
  })

  it('selects a cell on click', async () => {
    render(<Board />)
    const cells = await screen.findAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    // after clicking, the cell should be marked selected
    expect(cells[0].getAttribute('aria-selected')).toBe('true')
  })

  it('undo button is disabled initially', async () => {
    render(<Board />)
    await waitForBoard()
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
  })

  it('renders pause button and timer', async () => {
    render(<Board />)
    await waitForBoard()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    // timer display should show a time string like 0:00
    const timerDisplay = document.querySelector('.timer-display')
    expect(timerDisplay).not.toBeNull()
    expect(timerDisplay!.textContent).toMatch(/\d+:\d\d/)
  })

  it('pause button toggles aria-label', async () => {
    render(<Board />)
    await waitForBoard()
    const user = userEvent.setup()
    const pauseBtn = screen.getByRole('button', { name: 'Pause' })
    await user.click(pauseBtn)
    // When paused there are two Resume buttons (timer row + overlay); click the timer-row one
    const resumeBtns = screen.getAllByRole('button', { name: 'Resume' })
    expect(resumeBtns.length).toBeGreaterThanOrEqual(1)
    const timerResumeBtn = resumeBtns.find(btn => btn.classList.contains('timer-pause'))
    await user.click(timerResumeBtn ?? resumeBtns[0])
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('notes toggle button changes aria-pressed state', async () => {
    render(<Board />)
    await waitForBoard()
    const user = userEvent.setup()
    const notesBtn = screen.getByRole('button', { name: /toggle notes/i })
    expect(notesBtn.getAttribute('aria-pressed')).toBe('false')
    await user.click(notesBtn)
    expect(notesBtn.getAttribute('aria-pressed')).toBe('true')
    await user.click(notesBtn)
    expect(notesBtn.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('Board with fixed puzzle', () => {
  it('enters a digit via numpad and shows it in the cell', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // cell [0][2] is at flat index 2, editable (value 0 in PUZZLE)
    await user.click(cells[2])
    expect(cells[2].getAttribute('aria-selected')).toBe('true')
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].textContent?.trim()).toBe('4')
  })

  it('enables undo after digit entry; undo reverts the cell', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    const undoBtn = screen.getByRole('button', { name: /undo/i })
    expect(undoBtn).toBeDisabled()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(undoBtn).not.toBeDisabled()
    await user.click(undoBtn)
    expect(undoBtn).toBeDisabled()
    expect(cells[2].textContent).toBe('\u00a0')
  })

  it('clears an entered digit using the eraser button', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].textContent?.trim()).toBe('4')
    await user.click(screen.getByRole('button', { name: /clear cell/i }))
    expect(cells[2].textContent).toBe('\u00a0')
  })

  it('adds a pencil note when notes mode is active', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()
  })

  it('handles digit entry via keyboard', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    fireEvent.keyDown(window, { key: '4' })
    await waitFor(() => expect(cells[2].textContent?.trim()).toBe('4'))
  })

  it('handles cell navigation via arrow keys', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Select first editable cell [0][2] (index 2)
    await user.click(cells[2])
    // Arrow down moves to [1][2]
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await waitFor(() => expect(cells[2 + 9].getAttribute('aria-selected')).toBe('true'))
  })

  it('shows victory overlay when puzzle is completed', async () => {
    render(<Board puzzle={ALMOST_DONE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // cell [8][8] is at flat index 80, blank in ALMOST_DONE, answer = 9
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
  })

  it('retry button on victory card resets the board', async () => {
    render(<Board puzzle={ALMOST_DONE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
    await user.click(screen.getByRole('button', { name: /retry/i }))
    // victory overlay gone, cell reverts to blank
    expect(screen.queryByText('Puzzle Complete!')).toBeNull()
    expect(cells[80].textContent).toBe('\u00a0')
  })
})
