import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from './Board'
import { describe, it, expect, beforeEach, vi } from 'vitest'

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
      const btn = screen.getByRole('button', { name: new RegExp(`^${d},`) })
      expect(btn).toBeInTheDocument()
      expect(btn.getAttribute('data-digit')).toBe(String(d))
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

  it('highlights matching note candidates when a filled cell with that digit is selected', async () => {
    // PUZZLE has cell [0][2] blank. Add note "3" there, then select cell [0][1]
    // which contains 3 in the puzzle — selectedDigit becomes 3, so the note should be bold.
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Enter note "3" in cell [0][2] (index 2)
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^3,/ }))
    // Now select cell [0][1] which holds digit 3 → selectedDigit === 3
    await user.click(cells[1])
    // The "3" note span inside cell 2 should have the highlight class
    const noteSpans = cells[2].querySelectorAll('.cell-note')
    // noteSpans[2] is the 3rd span (digit 3, index 2)
    expect(noteSpans[2].classList.contains('cell-note--highlight')).toBe(true)
    // Other note spans should not be highlighted
    expect(noteSpans[0].classList.contains('cell-note--highlight')).toBe(false)
  })

  it('removes note highlight when a non-matching cell is selected', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Add note "3" in the blank cell
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^3,/ }))
    // Select a cell with digit 5 (cell [0][0]) → selectedDigit === 5
    await user.click(cells[0])
    const noteSpans = cells[2].querySelectorAll('.cell-note')
    // digit-3 span should NOT be highlighted since selectedDigit is 5
    expect(noteSpans[2].classList.contains('cell-note--highlight')).toBe(false)
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

  it('calls onWin callback when puzzle is completed', async () => {
    const onWin = vi.fn()
    render(<Board puzzle={ALMOST_DONE} solution={SOLUTION} onWin={onWin} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[80])
    await user.click(screen.getByRole('button', { name: /^9,/ }))
    await screen.findByText('Puzzle Complete!')
    expect(onWin).toHaveBeenCalledTimes(1)
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

  it('applies cross class to cells in the same row and column as selected', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Select cell [0][0] (flat index 0)
    await user.click(cells[0])
    // Same row: [0][1..8] → flat indices 1-8
    expect(cells[1].classList.contains('cross')).toBe(true)
    expect(cells[8].classList.contains('cross')).toBe(true)
    // Same column: [1][0] → flat index 9, [8][0] → flat index 72
    expect(cells[9].classList.contains('cross')).toBe(true)
    expect(cells[72].classList.contains('cross')).toBe(true)
    // Selected cell itself should NOT have cross
    expect(cells[0].classList.contains('cross')).toBe(false)
  })

  it('applies cross class to cells in the same 3×3 box as selected', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Select cell [0][0] (flat index 0) — top-left box: rows 0-2, cols 0-2
    await user.click(cells[0])
    // [1][1] → flat index 10, [2][2] → flat index 20 — both in same box, same neither row nor col
    expect(cells[10].classList.contains('cross')).toBe(true)
    expect(cells[20].classList.contains('cross')).toBe(true)
    // [3][3] → flat index 30 — different box, different row & col → no cross
    expect(cells[30].classList.contains('cross')).toBe(false)
  })

  it('does not apply cross class to same-digit cells (they get same-digit instead)', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Select cell [0][0] which contains 5; other 5s should be same-digit, not cross
    await user.click(cells[0])
    // Find a cell with digit 5 that is not in same row/col/box
    // SOLUTION has 5 at [1][0]→index 9 (same col, so cross anyway), [3][1]→index 28
    // [3][1] has 5 in SOLUTION: different row/col/box from [0][0]
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    expect(cells[28].classList.contains('cross')).toBe(false)
  })
})

describe('Board haptic callbacks', () => {
  it('calls onTriggerHaptic when haptic=true and a cell is clicked', async () => {
    const onTriggerHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when haptic=true and a numpad button is clicked', async () => {
    const onTriggerHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    onTriggerHaptic.mockClear()
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('does not call onTriggerHaptic when haptic=false', async () => {
    const onTriggerHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic={false} onTriggerHaptic={onTriggerHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerHaptic).not.toHaveBeenCalled()
  })

  it('calls onTriggerErrorHaptic when haptic=true, autoCheck=true, and a wrong digit is entered', async () => {
    const onTriggerErrorHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic autoCheck onTriggerErrorHaptic={onTriggerErrorHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2]) // blank cell, answer = 4
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit
    expect(onTriggerErrorHaptic).toHaveBeenCalledTimes(1)
  })

  it('does not call onTriggerErrorHaptic for a correct digit', async () => {
    const onTriggerErrorHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic autoCheck onTriggerErrorHaptic={onTriggerErrorHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2]) // blank cell, answer = 4
    await user.click(screen.getByRole('button', { name: /^4,/ })) // correct digit
    expect(onTriggerErrorHaptic).not.toHaveBeenCalled()
  })

  it('does not call onTriggerErrorHaptic when autoCheck=false even if digit is wrong', async () => {
    const onTriggerErrorHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic autoCheck={false} onTriggerErrorHaptic={onTriggerErrorHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong, but autoCheck off
    expect(onTriggerErrorHaptic).not.toHaveBeenCalled()
  })
})

describe('Board numpad touch handling', () => {
  // Simulate what iOS does: fire pointerdown (touch) then a ghost click on the same button.
  function touchThenGhostClick(btn: HTMLElement) {
    fireEvent.pointerDown(btn, { pointerType: 'touch', bubbles: true })
    fireEvent.click(btn)
  }

  it('applies a note exactly once when a touch pointerdown + ghost click arrive', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2]) // select blank cell

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)

    // Note should be present (added once, not toggled off by ghost click)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
  })

  it('toggling same note twice via touch removes it', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4) // first touch: adds note
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
    touchThenGhostClick(btn4) // second touch: removes note
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).toBeNull())
  })

  it('mouse click still works after a touch interaction', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])

    const btn4 = screen.getByRole('button', { name: /^4,/ })
    // Simulate one touch tap (pointerdown applies + stores result, ghost click fires haptic + clears ref)
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())

    // Now a plain mouse click (from userEvent) should toggle it off
    await user.click(btn4)
    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).toBeNull())
  })
})

describe('Board pause display', () => {
  it('removes user class from cells with user entries when paused', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit, no auto-win
    expect(cells[2].classList.contains('user')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('user')).toBe(false)
  })

  it('removes selected class when paused', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    expect(cells[2].classList.contains('selected')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('selected')).toBe(false)
  })

  it('removes same-digit class when paused', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    // Select cell [0][0] which has digit 5; other 5s get same-digit
    await user.click(cells[0])
    // cells[28] = [3][1] has digit 5, not in same row/col/box → same-digit
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[28].classList.contains('same-digit')).toBe(false)
  })

  it('removes cross class when paused', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    expect(cells[1].classList.contains('cross')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[1].classList.contains('cross')).toBe(false)
  })

  it('removes error class when paused', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} autoCheck />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit
    expect(cells[2].classList.contains('error')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('error')).toBe(false)
  })

  it('restores classes after resuming', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit, no auto-win
    expect(cells[2].classList.contains('user')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('user')).toBe(false)
    const resumeBtns = screen.getAllByRole('button', { name: 'Resume' })
    const timerResumeBtn = resumeBtns.find(btn => btn.classList.contains('timer-pause'))
    await user.click(timerResumeBtn ?? resumeBtns[0])
    expect(cells[2].classList.contains('user')).toBe(true)
  })
})
