import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from './Board'
import { formatPromptPuzzleState } from './board/TechniquesSidebar'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { emptyCandidateColors, emptyCellColors, saveGame } from '../utils/gameStorage'
import { analyzeRequiredTechniques } from '../utils/generators/hodoku'
import { LocalizationProvider, LANGUAGE_STORAGE_KEY } from '../utils/i18n'

const clipboardMocks = vi.hoisted(() => ({
  writeClipboardText: vi.fn(),
}))

// Mock generateGame so Board tests don't run the real (slow) hodoku generator
vi.mock('../utils/sudoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/sudoku')>()
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

vi.mock('../utils/generators/hodoku', () => ({
  analyzeRequiredTechniques: vi.fn(),
}))

vi.mock('../utils/clipboard', () => ({
  writeClipboardText: clipboardMocks.writeClipboardText,
}))

const mockedAnalyzeRequiredTechniques = vi.mocked(analyzeRequiredTechniques)
const EMPTY_NOTES = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  mockedAnalyzeRequiredTechniques.mockReset()
  clipboardMocks.writeClipboardText.mockReset()
})

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

// Two editable cells so digit 7 still has one remaining and can be used as a wrong entry.
const PUZZLE_WITH_7_REMAINING: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 3, 0, 6, 0, 8, 9, 1, 2] : [...row]
)

// Keep cell [0][2] editable while leaving one digit 3 available for notes tests.
const PUZZLE_WITH_3_REMAINING: number[][] = SOLUTION.map((row, r) => {
  if (r === 0) return [5, 3, 0, 6, 7, 8, 9, 1, 2]
  if (r === 1) return [6, 7, 2, 1, 9, 5, 0, 4, 8]
  return [...row]
})

const PUZZLE_WITH_MULTIPLE_CANDIDATES: number[][] = SOLUTION.map((row, r) => {
  if (r === 0) return [5, 3, 0, 6, 0, 8, 9, 1, 2]
  if (r === 1) return [6, 0, 2, 1, 9, 5, 3, 4, 8]
  if (r === 7) return [2, 8, 0, 4, 1, 9, 6, 3, 5]
  return [...row]
})

const FULL_GRID_NO_EMPTY: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 5, 4, 6, 7, 8, 9, 1, 2] : [...row]
)

// Almost-complete puzzle: only cell [8][8] is blank (answer = 9)
const ALMOST_DONE: number[][] = SOLUTION.map((row, r) =>
  r === 8 ? [...row.slice(0, 8), 0] : [...row]
)

async function waitForBoard() {
  await screen.findAllByRole('gridcell')
}

async function openMoreTools(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /toggle more tools/i }))
}

async function openHistoryToolsFromMore(user: ReturnType<typeof userEvent.setup>) {
  await openMoreTools(user)
  await user.click(screen.getByRole('button', { name: /^history$/i }))
}

function mockCellRect(cell: Element, size = 90, left = 0, top = 0) {
  Object.defineProperty(cell, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: left,
      y: top,
      top,
      left,
      width: size,
      height: size,
      right: left + size,
      bottom: top + size,
      toJSON: () => ({}),
    }),
  })
}

function emptyNotesGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))
}

function mockLandscapeOrientation(matches: boolean) {
  const originalMatchMedia = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(orientation: landscape)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  }
}

describe('Board component', () => {
  it('renders 81 cells and control buttons', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    for (let d = 1; d <= 9; d++) {
      // aria-label is e.g. "3, 7 remaining" — anchor with leading digit + comma
      const btn = screen.getByRole('button', { name: new RegExp(`^${d},`) })
      expect(btn).toBeInTheDocument()
      expect(btn.getAttribute('data-digit')).toBe(String(d))
    }
  })

  it('does not render coordinate labels by default', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    expect(screen.queryByTestId('board-coordinate-columns')).toBeNull()
    expect(screen.queryByTestId('board-coordinate-rows')).toBeNull()
  })

  it('renders coordinate labels when enabled', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} coordinateLabels="row-number-column-letter" />)
    await waitForBoard()
    expect(screen.getByTestId('board-coordinate-columns')).toHaveTextContent('ABCDEFGHI')
    expect(screen.getByTestId('board-coordinate-rows')).toHaveTextContent('123456789')
  })

  it('renders numeric row and column coordinate labels', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} coordinateLabels="row-number-column-number" />)
    await waitForBoard()
    expect(screen.getByTestId('board-coordinate-columns')).toHaveTextContent('123456789')
    expect(screen.getByTestId('board-coordinate-rows')).toHaveTextContent('123456789')
  })

  it('selects a cell on click', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = await screen.findAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[0])
    // after clicking, the cell should be marked selected
    expect(cells[0].getAttribute('aria-selected')).toBe('true')
  })

  it('history actions are disabled initially', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled()

    const user = userEvent.setup()
    await openHistoryToolsFromMore(user)
    const historyToolbar = screen.getByRole('toolbar', { name: /history actions/i })
    expect(within(historyToolbar).getByRole('button', { name: /^undo$/i })).toBeDisabled()
    expect(within(historyToolbar).getByRole('button', { name: /redo/i })).toBeDisabled()
  })

  it('renders pause button and timer', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    // timer display should show a time string like 0:00
    const timerDisplay = document.querySelector('.timer-display')
    expect(timerDisplay).not.toBeNull()
    expect(timerDisplay!.textContent).toMatch(/\d+:\d\d/)
  })

  it('uses puzzle metadata difficulty when no explicit difficulty prop is provided', async () => {
    render(
      <Board
        puzzle={PUZZLE}
        solution={SOLUTION}
        puzzleMetadata={{ source: 'created', difficultyLabel: 'Very Hard', score: 1700 }}
      />,
    )
    await waitForBoard()
    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
  })

  it('pause button toggles aria-label', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('auto-pauses when window loses focus (blur)', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    window.dispatchEvent(new Event('blur'))
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Resume' }).length).toBeGreaterThanOrEqual(1)
    )
  })

  it('auto-pauses when tab becomes hidden (visibilitychange)', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    // The old implementation used document focusout which caused mobile taps to pause.
    // Verify focusout alone no longer triggers pause.
    const editableCell = screen.getAllByRole('gridcell').find(c => !c.classList.contains('given'))!
    fireEvent.focusOut(editableCell)
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('notes toggle button changes aria-pressed state', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('brush toggle shows and hides brush colors', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('candidate tool shows the basic candidates action and fills candidates', async () => {
    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} />)
    await waitForBoard()
    const user = userEvent.setup()

    const cells = screen.getAllByRole('gridcell')
    expect(cells[2].querySelector('.cell-notes')).toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /show all basic candidates/i }))

    await waitFor(() => expect(cells[2].querySelector('.cell-notes')).not.toBeNull())
  })

  it('candidate tool promotes single candidates to digits', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    const user = userEvent.setup()

    const cells = screen.getAllByRole('gridcell')
    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /show all basic candidates/i }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /single candidate to digit/i }))
    await waitFor(() => expect(cells[2]).toHaveTextContent('4'))
  })

  it('shows the next required technique in portrait and opens the sidebar on demand', async () => {
    clipboardMocks.writeClipboardText.mockResolvedValue(undefined)
    const open = vi.fn().mockReturnValue(null)
    vi.spyOn(window, 'open').mockImplementation(open as typeof window.open)
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 3018,
      givenUp: false,
      bruteForced: false,
      unsolvable: false,
      steps: [
        { stepNumber: 1, technique: 'Hidden Single', notation: 'r5c5=9' },
        { stepNumber: 2, technique: 'XYZ-Wing', notation: '4/7/8 in r56c6,r6c1 => r6c5<>4' },
      ],
    })

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    render(
      <LocalizationProvider>
        <Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />
      </LocalizationProvider>
    )
    await waitForBoard()
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    const expectedPuzzleState = PUZZLE_WITH_7_REMAINING.map(row => [...row])
    expectedPuzzleState[0][2] = 4
    const expectedNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    await waitFor(() => {
      expect(mockedAnalyzeRequiredTechniques).toHaveBeenCalledWith(expectedPuzzleState, expect.any(Array), expect.any(AbortSignal))
    })

    expect(screen.queryByRole('dialog', { name: /required techniques/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /show all basic candidates/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /single candidate to digit/i })).toBeNull()
    expect(screen.getByText('Next technique')).toBeInTheDocument()
    expect(screen.getByText('Hidden Single')).toBeInTheDocument()
    expect(screen.getByText('r5c5=9')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to tools/i }))

    expect(screen.getByRole('button', { name: /show all basic candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /single candidate to digit/i })).toBeInTheDocument()
    expect(screen.queryByText('Next technique')).toBeNull()

    await user.click(screen.getByRole('button', { name: /see required techniques/i }))
    await screen.findByText('Next technique')
    await user.click(screen.getByRole('button', { name: /see remaining techniques/i }))

    const sidebar = await screen.findByRole('dialog', { name: /required techniques/i })
    expect(within(sidebar).getByText('2 techniques')).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: /1\.\s*hidden single/i })).toHaveAttribute('aria-expanded', 'false')
    expect(within(sidebar).queryByText('r5c5=9')).toBeNull()
    expect(within(sidebar).queryByRole('button', { name: /open on chatgpt/i })).toBeNull()

    await user.click(within(sidebar).getByRole('button', { name: /1\.\s*hidden single/i }))

    expect(within(sidebar).getByText('r5c5=9')).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: /1\.\s*hidden single/i })).toHaveAttribute('aria-expanded', 'true')
    expect(within(sidebar).queryAllByRole('button', { name: /copy prompt/i })).toHaveLength(1)
    expect(within(sidebar).queryAllByRole('button', { name: /open on chatgpt/i })).toHaveLength(1)

    await user.click(within(sidebar).getByRole('button', { name: /copy prompt/i }))

    const expectedPrompt = [
      'Explain how to apply this Sudoku technique to the current puzzle state. Focus only on this step, not the full solve.',
      '',
      'Current puzzle state (cell-by-cell listing):',
      formatPromptPuzzleState(expectedPuzzleState, expectedNotes),
      '',
      'Technique:',
      'Hidden Single',
      '',
      'Notation:',
      'r5c5=9',
      '',
      'In this notation, filled cells are shown as rNcM=value, and values inside {} represent candidate values for a cell. This is custom notation and may differ from standard Sudoku notation.',
      '',
      'Please explain it visually and step by step. Point out the relevant cells, rows, columns, and boxes, describe which candidates or digits change, and make the explanation easy to follow directly on the board.',
    ].join('\n')

    await waitFor(() => expect(clipboardMocks.writeClipboardText).toHaveBeenCalledWith(expectedPrompt))
    expect(open).not.toHaveBeenCalled()

    clipboardMocks.writeClipboardText.mockClear()

    await user.click(within(sidebar).getByRole('button', { name: /open on chatgpt/i }))

    await waitFor(() => {
      expect(clipboardMocks.writeClipboardText).toHaveBeenCalledWith(expectedPrompt)
      expect(open).toHaveBeenCalledWith(
        `https://chatgpt.com/?prompt=${encodeURIComponent(expectedPrompt)}`,
        '_blank',
        'noopener,noreferrer'
      )
    })
    expect(screen.queryByText(/failed to open chatgpt with the hint prompt/i)).toBeNull()
  })

  it('opens ChatGPT before clipboard copying settles', async () => {
    let resolveClipboardWrite: (() => void) | null = null
    clipboardMocks.writeClipboardText.mockImplementation(() => new Promise<void>(resolve => {
      resolveClipboardWrite = resolve
    }))
    const open = vi.fn().mockReturnValue(null)
    vi.spyOn(window, 'open').mockImplementation(open as typeof window.open)
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 3018,
      givenUp: false,
      bruteForced: false,
      unsolvable: false,
      steps: [
        { stepNumber: 1, technique: 'Hidden Single', notation: 'r5c5=9' },
      ],
    })

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    render(
      <LocalizationProvider>
        <Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />
      </LocalizationProvider>
    )
    await waitForBoard()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    await user.click(await screen.findByRole('button', { name: /see remaining techniques/i }))

    const sidebar = await screen.findByRole('dialog', { name: /required techniques/i })
    await user.click(within(sidebar).getByRole('button', { name: /1\.\s*hidden single/i }))

    const expectedPrompt = [
      'Explain how to apply this Sudoku technique to the current puzzle state. Focus only on this step, not the full solve.',
      '',
      'Current puzzle state (cell-by-cell listing):',
      formatPromptPuzzleState(PUZZLE_WITH_7_REMAINING, EMPTY_NOTES),
      '',
      'Technique:',
      'Hidden Single',
      '',
      'Notation:',
      'r5c5=9',
      '',
      'In this notation, filled cells are shown as rNcM=value, and values inside {} represent candidate values for a cell. This is custom notation and may differ from standard Sudoku notation.',
      '',
      'Please explain it visually and step by step. Point out the relevant cells, rows, columns, and boxes, describe which candidates or digits change, and make the explanation easy to follow directly on the board.',
    ].join('\n')

    await user.click(within(sidebar).getByRole('button', { name: /open on chatgpt/i }))

    expect(open).toHaveBeenCalledWith(
      `https://chatgpt.com/?prompt=${encodeURIComponent(expectedPrompt)}`,
      '_blank',
      'noopener,noreferrer'
    )
    expect(clipboardMocks.writeClipboardText).toHaveBeenCalledWith(expectedPrompt)

    await act(async () => {
      resolveClipboardWrite?.()
    })
  })

  it('reuses cached required techniques until the board changes', async () => {
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 3018,
      givenUp: false,
      bruteForced: false,
      unsolvable: false,
      steps: [
        { stepNumber: 1, technique: 'Hidden Single', notation: 'r1c3=4' },
      ],
    })

    render(
      <LocalizationProvider>
        <Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />
      </LocalizationProvider>
    )
    await waitForBoard()
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    const initialPuzzleState = PUZZLE_WITH_7_REMAINING.map(row => [...row])
    const updatedPuzzleState = PUZZLE_WITH_7_REMAINING.map(row => [...row])
    updatedPuzzleState[0][2] = 4

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    await screen.findByRole('button', { name: /see remaining techniques/i })
    expect(mockedAnalyzeRequiredTechniques).toHaveBeenCalledTimes(1)
    expect(mockedAnalyzeRequiredTechniques).toHaveBeenLastCalledWith(initialPuzzleState, expect.any(Array), expect.any(AbortSignal))

    await user.click(screen.getByRole('button', { name: /see remaining techniques/i }))

    await screen.findByRole('dialog', { name: /required techniques/i })
    expect(mockedAnalyzeRequiredTechniques).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /close required techniques/i }))
    await user.click(cells[2])
    fireEvent.keyDown(window, { key: '4' })
    await waitFor(() => expect(screen.getByRole('button', { name: /see required techniques/i })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    await screen.findByRole('button', { name: /see remaining techniques/i })
    expect(mockedAnalyzeRequiredTechniques).toHaveBeenCalledTimes(2)
    expect(mockedAnalyzeRequiredTechniques).toHaveBeenLastCalledWith(updatedPuzzleState, expect.any(Array), expect.any(AbortSignal))
  })

  it('disables the see required techniques button while the sidebar is open', async () => {
    const restoreMatchMedia = mockLandscapeOrientation(true)
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 3018,
      givenUp: false,
      bruteForced: false,
      unsolvable: false,
      steps: [
        { stepNumber: 1, technique: 'Hidden Single', notation: 'r1c3=4' },
      ],
    })

    render(
      <LocalizationProvider>
        <Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />
      </LocalizationProvider>
    )
    await waitForBoard()
    const user = userEvent.setup()

    try {
      await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
      const seeRequiredTechniquesButton = screen.getByRole('button', { name: /see required techniques/i })

      expect(seeRequiredTechniquesButton).toBeEnabled()

      await user.click(seeRequiredTechniquesButton)

      await screen.findByRole('dialog', { name: /required techniques/i })
      expect(screen.getByRole('button', { name: /see required techniques/i })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: /close required techniques/i }))

      await waitFor(() => expect(screen.getByRole('button', { name: /see required techniques/i })).toBeEnabled())
    } finally {
      restoreMatchMedia()
    }
  })

  it('shows an error when hodoku reports the current board is unsolvable', async () => {
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 0,
      givenUp: false,
      bruteForced: false,
      unsolvable: true,
      steps: [],
    })

    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    const sidebar = await screen.findByRole('dialog', { name: /required techniques/i })
    expect(within(sidebar).getByText(/this puzzle is not solvable/i)).toBeInTheDocument()
  })

  it('shows copy errors inside the required techniques sidebar', async () => {
    clipboardMocks.writeClipboardText.mockRejectedValue(new Error('copy failed'))
    mockedAnalyzeRequiredTechniques.mockResolvedValue({
      difficulty: 'Extreme',
      score: 3018,
      givenUp: false,
      bruteForced: false,
      unsolvable: false,
      steps: [
        { stepNumber: 1, technique: 'Hidden Single', notation: 'r5c5=9' },
      ],
    })

    render(
      <LocalizationProvider>
        <Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />
      </LocalizationProvider>
    )
    await waitForBoard()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    await user.click(screen.getByRole('button', { name: /see required techniques/i }))

    await user.click(await screen.findByRole('button', { name: /see remaining techniques/i }))

    const sidebar = await screen.findByRole('dialog', { name: /required techniques/i })
    await user.click(within(sidebar).getByRole('button', { name: /1\.\s*hidden single/i }))
    await user.click(within(sidebar).getByRole('button', { name: /copy prompt/i }))

    expect(await within(sidebar).findByText(/failed to copy the hint prompt/i)).toBeInTheDocument()
  })

  it('shows eraser-mode clear actions instead of numbers or colors', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

    const view = render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()
    const user = userEvent.setup()

    expect(view.container.querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(screen.getByRole('button', { name: /clean colors/i }))
    await waitFor(() => expect(view.container.querySelector('.cell-color-layer')).toBeNull())
  })

  it('keeps icons in the main tool tray', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    await waitForBoard()

    const toolbar = screen.getByRole('toolbar', { name: /game tools/i })
    expect(within(toolbar).getByRole('button', { name: /^undo$/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /eraser mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle notes mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle brush mode/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle candidate tools/i }).querySelector('svg')).not.toBeNull()
    expect(within(toolbar).getByRole('button', { name: /toggle more tools/i }).querySelector('svg')).not.toBeNull()
  })

  it('keeps brush colors visible in pencil mode and paints a candidate directly without opening the candidate painter', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    render(<Board puzzle={PUZZLE} solution={SOLUTION} pencilMode paintingScope="candidate" />)
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

  it('highlights matching digits when a reference number is clicked in pencil mode', async () => {
    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} pencilMode />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[1])
    expect(cells[1].getAttribute('aria-selected')).toBe('true')

    const referenceNumberBtn = screen.getByRole('button', { name: /^5,/ })
    await user.click(referenceNumberBtn)

    expect(referenceNumberBtn.getAttribute('aria-pressed')).toBe('true')
    expect(cells[1].getAttribute('aria-selected')).toBe('false')
    expect(cells[0].classList.contains('same-digit')).toBe(true)

    await user.click(referenceNumberBtn)

    expect(referenceNumberBtn.getAttribute('aria-pressed')).toBe('false')
    expect(cells[0].classList.contains('same-digit')).toBe(false)
  })

  it('selects given digits in pencil mode', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} pencilMode />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[0])

    expect(cells[0].classList.contains('selected')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
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

  it('enables undo after digit entry; undo and redo update the cell', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit, won't complete puzzle
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit, won't complete puzzle
    expect(cells[2].textContent?.trim()).toBe('7')
    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(cells[2])
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

  it('applies a brush color layer to a cell on quick tap', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(cells[2].classList.contains('selected-brush')).toBe(true)
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()
  })

  it('highlights matching givens when selecting a filled cell in brush mode', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[0])

    expect(cells[0].classList.contains('selected-brush')).toBe(true)
    expect(cells[28].classList.contains('same-digit')).toBe(true)
    expect(cells[0].querySelector('.cell-color-layer')).toBeNull()
  })

  it('highlights matching user entries when selecting a filled cell in brush mode', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('persists the first color flag toggle and keeps the first colored cell flagged', async () => {
    const user = userEvent.setup()
    const firstRender = render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} firstColorFlag />)
    const cells = screen.getAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    await user.click(cells[4])

    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(cells[4].querySelector('.cell-flag-border')).toBeNull()

    firstRender.unmount()

    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} firstColorFlag />)
    await waitForBoard()
    const rerenderedCells = screen.getAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    expect(rerenderedCells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(rerenderedCells[4].querySelector('.cell-flag-border')).toBeNull()
  })

  it('clears and resets the first color flag when board colors are removed', async () => {
    const clearColorsRef: React.MutableRefObject<(() => void) | null> = { current: null }
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} firstColorFlag clearColorsRef={clearColorsRef} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    await user.click(cells[4])

    expect(cells[2].querySelector('.cell-flag-border')).not.toBeNull()
    expect(cells[4].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    await user.click(cells[2])

    expect(cells[2].querySelector('.cell-flag-border')).toBeNull()
    expect(cells[4].querySelector('.cell-flag-border')).toBeNull()

    await act(async () => { clearColorsRef.current?.() })
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(cells[4])

    expect(cells[4].querySelector('.cell-flag-border')).not.toBeNull()
  })

  it('removes the cell brush color when a number is entered', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
    expect(cells[2].textContent?.trim()).toBe('4')
  })

  it('opens the candidate overlay when candidate painting mode is enabled and paints an existing candidate', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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

  it('opens the candidate overlay in eraser mode and removes only the selected candidate', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4, 7]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

    render(<Board puzzle={PUZZLE} solution={SOLUTION} pencilMode />)
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

  it('does not open the candidate overlay when candidate painting mode is enabled but the cell has no candidates', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(screen.queryByRole('dialog', { name: /candidate painter/i })).toBeNull()
    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
  })

  it('keeps highlighting a filled cell in candidate coloring mode without allowing coloring', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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

  it('does not highlight matching digits when previewing a candidate in the eraser overlay', async () => {
    const notes = emptyNotesGrid()
    notes[0][2] = [4, 7]
    saveGame(PUZZLE, PUZZLE, SOLUTION, notes)

    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('does not preview a candidate just because an overlay button receives focus', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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

  it('keeps matching digits highlighted after painting a candidate from the overlay', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} paintingScope="candidate" />)
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

  it('blocks digit entry in brush mode', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))

    expect(screen.queryByRole('button', { name: /^4,/ })).toBeNull()

    fireEvent.keyDown(window, { key: '4' })
    expect(cells[2].textContent).toBe('\u00a0')
  })

  it('remover swatch clears the selected cell color without changing the active color', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    expect(cells[2].querySelector('.cell-color-layer')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /brush color remover/i }))
    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
    expect(screen.getByRole('button', { name: /brush color 1/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('clear cell removes selected brush colors', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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
    const clearColorsRef: React.MutableRefObject<(() => void) | null> = { current: null }
    const view = render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} clearColorsRef={clearColorsRef} paintingScope="digit" />)
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

    view.rerender(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} clearColorsRef={clearColorsRef} paintingScope="candidate" />)

    await user.click(screen.getByRole('button', { name: /brush color 2/i }))
    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /paint candidate 7/i }))
    expect(cells[4].querySelector('.cell-note--colored')).not.toBeNull()

    await act(async () => { clearColorsRef.current?.() })

    expect(cells[2].querySelector('.cell-color-layer')).toBeNull()
    expect(cells[4].querySelector('.cell-note--colored')).toBeNull()
  })

  it('reports clear painting availability as colors are added and cleared', async () => {
    const onClearPaintingAvailabilityChange = vi.fn()
    const clearColorsRef: React.MutableRefObject<(() => void) | null> = { current: null }
    render(
      <Board
        puzzle={PUZZLE}
        solution={SOLUTION}
        clearColorsRef={clearColorsRef}
        onClearPaintingAvailabilityChange={onClearPaintingAvailabilityChange}
      />
    )
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    expect(onClearPaintingAvailabilityChange).toHaveBeenLastCalledWith(false)

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])
    await waitFor(() => expect(onClearPaintingAvailabilityChange).toHaveBeenLastCalledWith(true))

    await act(async () => { clearColorsRef.current?.() })
    await waitFor(() => expect(onClearPaintingAvailabilityChange).toHaveBeenLastCalledWith(false))
  })

  it('fills simple candidates for all empty cells', async () => {
    const identifyCandidatesRef: React.MutableRefObject<(() => void) | null> = { current: null }
    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} identifyCandidatesRef={identifyCandidatesRef} />)
    const cells = screen.getAllByRole('gridcell')

    await act(async () => { identifyCandidatesRef.current?.() })

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
    const onIdentifyCandidatesAvailabilityChange = vi.fn()
    render(
      <Board
        puzzle={FULL_GRID_NO_EMPTY}
        solution={null}
        onIdentifyCandidatesAvailabilityChange={onIdentifyCandidatesAvailabilityChange}
      />
    )

    expect(onIdentifyCandidatesAvailabilityChange).toHaveBeenLastCalledWith(false)
  })

  it('does not replace existing candidates when filling all empty cells', async () => {
    const identifyCandidatesRef: React.MutableRefObject<(() => void) | null> = { current: null }
    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} identifyCandidatesRef={identifyCandidatesRef} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    await act(async () => { identifyCandidatesRef.current?.() })

    const cell02Notes = cells[2].querySelectorAll('.cell-note')
    expect(cell02Notes[3].textContent).toBe('4')
    expect(cell02Notes[6].textContent).toBe('')

    const cell04Notes = cells[4].querySelectorAll('.cell-note')
    expect(cell04Notes[6].textContent).toBe('7')
  })

  it('keeps selected reference digits active while history tools are toggled', async () => {
    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} pencilMode />)
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

  it('restores candidates on first undo after a wrong entry', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit
    expect(cells[2].textContent?.trim()).toBe('7')

    await openHistoryToolsFromMore(user)
    const undoBtn = within(screen.getByRole('toolbar', { name: /history actions/i })).getByRole('button', { name: /^undo$/i })
    await user.click(undoBtn)
    expect(cells[2].classList.contains('user')).toBe(false)
    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()
  })

  it('keeps peer candidates on wrong entry when auto-check and auto-remove are enabled', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} autoCheck autoRemove />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[4]) // [0][4]
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2]) // [0][2], correct digit is 4
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()
  })

  it('removes peer candidates on correct entry when auto-check and auto-remove are enabled', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} autoCheck autoRemove />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    await user.click(cells[4]) // [0][4]
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(cells[4].querySelector('.cell-notes')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(cells[2]) // [0][2], correct digit is 4
    await user.click(screen.getByRole('button', { name: /^4,/ })) // correct digit
    expect(cells[4].querySelector('.cell-notes')).toBeNull()
  })

  it('disables exhausted digit buttons in entry and notes mode', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} />)
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

  it('highlights matching note candidates when a filled cell with that digit is selected', async () => {
    // PUZZLE has cell [0][2] blank. Add note "3" there, then select cell [0][1]
    // which contains 3 in the puzzle — selectedDigit becomes 3, so the note should be bold.
    render(<Board puzzle={PUZZLE_WITH_3_REMAINING} solution={SOLUTION} />)
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

    render(<Board puzzle={PUZZLE_WITH_MULTIPLE_CANDIDATES} solution={SOLUTION} pencilMode />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /toggle notes/i }))
    mockCellRect(cells[2])
    fireEvent.pointerDown(cells[2], { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 15, clientY: 15 })
    fireEvent.keyDown(window, { key: '4' })

    const noteSpans = cells[2].querySelectorAll('.cell-note')
    expect(noteSpans[3].classList.contains('cell-note--highlight')).toBe(true)
    expect(cells[16].classList.contains('same-digit')).toBe(true)

    getContextSpy.mockRestore()
  })

  it('removes note highlight when a non-matching cell is selected', async () => {
    render(<Board puzzle={PUZZLE_WITH_3_REMAINING} solution={SOLUTION} />)
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

  it('calls onTriggerHaptic once for a regular touch digit entry', async () => {
    const onTriggerHaptic = vi.fn()
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    onTriggerHaptic.mockClear()

    await user.click(screen.getByRole('button', { name: /clean colors/i }))
    expect(onTriggerHaptic).toHaveBeenCalledTimes(1)
  })

  it('calls onTriggerHaptic when candidate subtools are pressed', async () => {
    const onTriggerHaptic = vi.fn()
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic onTriggerHaptic={onTriggerHaptic} />)
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
    render(<Board puzzle={PUZZLE} solution={SOLUTION} haptic={false} onTriggerHaptic={onTriggerHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^4,/ }))
    expect(onTriggerHaptic).not.toHaveBeenCalled()
  })

  it('calls onTriggerErrorHaptic when haptic=true, autoCheck=true, and a wrong digit is entered', async () => {
    const onTriggerErrorHaptic = vi.fn()
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic autoCheck onTriggerErrorHaptic={onTriggerErrorHaptic} />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} haptic autoCheck={false} onTriggerErrorHaptic={onTriggerErrorHaptic} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong, but autoCheck off
    expect(onTriggerErrorHaptic).not.toHaveBeenCalled()
  })
})

describe('Board numpad touch handling', () => {
  // Simulate what iOS does: fire pointerdown/pointerup (touch) then a ghost click on the same button.
  function touchThenGhostClick(btn: HTMLElement) {
    fireEvent.pointerDown(btn, { pointerType: 'touch', pointerId: 1, bubbles: true })
    fireEvent.pointerUp(btn, { pointerType: 'touch', pointerId: 1, bubbles: true })
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

  it('mouse click still works after a last-remaining touch digit entry', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()

    await user.click(cells[2])
    const btn4 = screen.getByRole('button', { name: /^4,/ })
    touchThenGhostClick(btn4)
    await waitFor(() => expect(cells[2]).toHaveTextContent('4'))

    await user.click(cells[4])
    await user.click(screen.getByRole('button', { name: /^7,/ }))
    await waitFor(() => expect(cells[4]).toHaveTextContent('7'))
  })
})

describe('Board pause display', () => {
  it('removes user class from cells with user entries when paused', async () => {
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} autoCheck />)
    const cells = screen.getAllByRole('gridcell')
    const user = userEvent.setup()
    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /^7,/ })) // wrong digit
    expect(cells[2].classList.contains('error')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(cells[2].classList.contains('error')).toBe(false)
  })

  it('hides the first-color flag border when paused and restores it on resume', async () => {
    render(<Board puzzle={PUZZLE} solution={SOLUTION} firstColorFlag />)
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
    render(<Board puzzle={PUZZLE_WITH_7_REMAINING} solution={SOLUTION} />)
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
