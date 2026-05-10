import React from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { renderWithProvider as render } from './testUtils'
import { saveGame, saveElapsed, saveCompleted, ELAPSED_KEY, COMPLETED_KEY, encodeGrid } from './utils/gameStorage'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const appPuzzleQueueMocks = vi.hoisted(() => {
  const availability = {
    VERY_EASY: 1,
    EASY: 1,
    MEDIUM: 1,
    HARD: 1,
    VERY_HARD: 1,
    EXPERT: 1,
    NIGHTMARE: 1,
    DIABOLICAL: 1,
  }
  return {
    availability,
    getPuzzleQueueAvailability: vi.fn(() => availability),
    resetPuzzleQueueDaemon: vi.fn(),
    startPuzzleQueueDaemon: vi.fn(),
    subscribePuzzleQueueAvailability: vi.fn((listener: (availability: typeof availability) => void) => {
      listener(availability)
      return vi.fn()
    }),
    takeQueuedGame: vi.fn(),
  }
})

const hodokuMocks = vi.hoisted(() => ({
  evaluate: vi.fn(),
  verifyPuzzle: vi.fn(),
}))

vi.mock('./utils/sudoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/sudoku')>()
  const solution = [
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
  const puzzle = [
    [5, 3, 0, 6, 0, 8, 9, 1, 2],
    [0, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ]
  return {
    ...actual,
    generateGame: vi.fn().mockResolvedValue({ puzzle, solution }),
  }
})

vi.mock('./utils/appPuzzleQueue', () => ({
  getPuzzleQueueAvailability: appPuzzleQueueMocks.getPuzzleQueueAvailability,
  resetPuzzleQueueDaemon: appPuzzleQueueMocks.resetPuzzleQueueDaemon,
  startPuzzleQueueDaemon: appPuzzleQueueMocks.startPuzzleQueueDaemon,
  subscribePuzzleQueueAvailability: appPuzzleQueueMocks.subscribePuzzleQueueAvailability,
  takeQueuedGame: appPuzzleQueueMocks.takeQueuedGame,
}))

vi.mock('./utils/generators/hodoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/generators/hodoku')>()
  return {
    ...actual,
    evaluate: hodokuMocks.evaluate,
    verifyPuzzle: hodokuMocks.verifyPuzzle,
  }
})

const GRID: number[][] = [
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

const PUZZLE_WITH_GAPS: number[][] = [
  [5, 3, 0, 6, 0, 8, 9, 1, 2],
  [0, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  Object.assign(appPuzzleQueueMocks.availability, {
    VERY_EASY: 1,
    EASY: 1,
    MEDIUM: 1,
    HARD: 1,
    VERY_HARD: 1,
    EXPERT: 1,
    NIGHTMARE: 1,
    DIABOLICAL: 1,
  })
  const solution = [
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
  const puzzle = [
    [5, 3, 0, 6, 0, 8, 9, 1, 2],
    [0, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ]
  appPuzzleQueueMocks.getPuzzleQueueAvailability.mockReturnValue(appPuzzleQueueMocks.availability)
  appPuzzleQueueMocks.subscribePuzzleQueueAvailability.mockImplementation((listener: (availability: typeof appPuzzleQueueMocks.availability) => void) => {
    listener(appPuzzleQueueMocks.availability)
    return vi.fn()
  })
  appPuzzleQueueMocks.takeQueuedGame.mockResolvedValue({ puzzle, solution, score: null, difficulty: 'MEDIUM' })
  appPuzzleQueueMocks.resetPuzzleQueueDaemon.mockClear()
  appPuzzleQueueMocks.startPuzzleQueueDaemon.mockClear()
  hodokuMocks.evaluate.mockReset()
  hodokuMocks.evaluate.mockResolvedValue([{
    puzzle: encodeGrid(puzzle),
    solution: encodeGrid(solution),
    difficulty: 'VERY_HARD',
    score: 1700,
  }])
  hodokuMocks.verifyPuzzle.mockReset()
  hodokuMocks.verifyPuzzle.mockResolvedValue({
    solution,
    difficulty: 'VERY_HARD',
    score: 1700,
  })
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  window.history.replaceState(null, '', '/')
})

describe('App', () => {
  it('shows Home page on first load', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^new game$/i })).toBeInTheDocument()
  })

  it('does not show Continue when no saved game', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull()
  })

  it('shows Continue button when a saved game exists', () => {
    saveGame(GRID, GRID, GRID)
    render(<App />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('opens settings dialog when settings button clicked', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /painting scope/i })).toBeInTheDocument()
  })

  it('closes settings dialog when Close clicked', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('applies dark mode when toggled in settings', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('resets settings and restarts queue generation from settings', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    await user.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(screen.getByRole('button', { name: /reset settings/i }))

    expect(appPuzzleQueueMocks.resetPuzzleQueueDaemon).toHaveBeenCalledOnce()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(screen.queryByRole('dialog', { name: /settings/i })).toBeNull()
    expect(screen.getByText('Settings reset.')).toBeInTheDocument()
  })

  it('opens new game modal when New Game clicked', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: /^new game$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // modal heading is an h2 inside the dialog
    expect(screen.getByRole('heading', { name: /^new game$/i })).toBeInTheDocument()
  })

  it('keeps New Game available when the live queue is empty but preloaded puzzles exist', async () => {
    Object.assign(appPuzzleQueueMocks.availability, {
      VERY_EASY: 0,
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
      VERY_HARD: 0,
      EXPERT: 0,
      NIGHTMARE: 0,
      DIABOLICAL: 0,
    })
    appPuzzleQueueMocks.takeQueuedGame.mockResolvedValue(null)

    render(<App />)

    expect(await screen.findByRole('button', { name: /^new game$/i })).toBeEnabled()
  })

  it('opens the created puzzle creator when Create game is clicked', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /create game/i }))
    expect(screen.getByRole('grid', { name: /created puzzle grid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm created puzzle/i })).toBeInTheDocument()
  })

  it('cancels new game modal on Cancel click', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^new game$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('navigates to board when Continue clicked with saved game', async () => {
    saveGame(GRID, GRID, GRID)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    const cells = await screen.findAllByRole('gridcell')
    expect(cells.length).toBe(81)
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('navigates back to Home when Back clicked', async () => {
    saveGame(GRID, GRID, GRID)
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findAllByRole('gridcell')
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
  })

  it('identifies candidates from the wand toolbar on the board', async () => {
    saveGame(PUZZLE_WITH_GAPS, PUZZLE_WITH_GAPS, GRID)
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /continue/i }))
    const cells = await screen.findAllByRole('gridcell', undefined, { timeout: 10000 })

    await user.click(screen.getByRole('button', { name: /toggle candidate tools/i }))
    const identifyButton = screen.getByRole('button', { name: /show all basic candidates/i })
    expect(identifyButton).toBeEnabled()
    await user.click(identifyButton)

    expect(cells[2].querySelector('.cell-notes')).not.toBeNull()
  })

  it('disables clean colors and clean drawings when there is nothing to clear', async () => {
    saveGame(PUZZLE_WITH_GAPS, PUZZLE_WITH_GAPS, GRID)
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findAllByRole('gridcell')

    await user.click(screen.getByRole('button', { name: /eraser mode/i }))
    expect(screen.getByRole('button', { name: /clean colors/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clean drawings/i })).toBeDisabled()
  })

  it('toggles painting scope from settings and enables candidate painting', async () => {
    saveGame(PUZZLE_WITH_GAPS, PUZZLE_WITH_GAPS, GRID)
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /continue/i }))
    const cells = await screen.findAllByRole('gridcell')

    await user.click(cells[2])
    await user.click(screen.getByRole('button', { name: /toggle notes mode/i }))
    await user.click(screen.getByRole('button', { name: /^4,/ }))

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /candidates/i }))
    await user.click(screen.getByRole('button', { name: /close/i }))

    await user.click(screen.getByRole('button', { name: /toggle brush mode/i }))
    await user.click(screen.getByRole('button', { name: /brush color 1/i }))
    await user.click(cells[2])

    expect(await screen.findByRole('dialog', { name: /candidate painter/i }, { timeout: 10000 })).toBeInTheDocument()
  })

  it('shows coordinate labels when enabled from settings', async () => {
    saveGame(PUZZLE_WITH_GAPS, PUZZLE_WITH_GAPS, GRID)
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findAllByRole('gridcell')
    expect(screen.queryByTestId('board-coordinate-columns')).toBeNull()

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    await user.click(screen.getByRole('switch', { name: /coordinate labels/i }))

    expect(screen.getByTestId('board-coordinate-columns')).toHaveTextContent('123456789')
    expect(screen.getByTestId('board-coordinate-rows')).toHaveTextContent('ABCDEFGHI')
    expect(localStorage.getItem('coordinateLabels')).toBe('true')
  })

  it('clears elapsed time when starting a new game so the clock resets to 0:00', async () => {
    saveGame(GRID, GRID, GRID)
    saveElapsed(300) // simulate 5 minutes elapsed on the previous game
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^new game$/i }))
    await user.click(screen.getByRole('button', { name: /^start$/i }))
    await screen.findAllByRole('gridcell')
    // clearElapsed() must have been called — localStorage key should be gone
    expect(localStorage.getItem(ELAPSED_KEY)).toBeNull()
    // The timer display should show 0:00 (not the previous 5:00)
    const timerDisplay = document.querySelector('.timer-display')
    expect(timerDisplay?.textContent).toBe('00:00')
  })

  it('saves autoCheck preference to localStorage via settings', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    const toggle = screen.getByRole('switch', { name: /auto-check/i })
    // default is true (enabled), clicking turns it off
    await user.click(toggle)
    expect(localStorage.getItem('autoCheck')).toBe('false')
  })

  it('saves theme preference to localStorage', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    await user.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('restores dark theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('restores light theme from localStorage even when system prefers dark', () => {
    // Simulate system preferring dark but user explicitly saved 'light'
    localStorage.setItem('theme', 'light')
    // Override matchMedia to return prefers-dark = true
    const original = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    Object.defineProperty(window, 'matchMedia', { writable: true, value: original })
  })

  it('toggling dark off persists light to localStorage', async () => {
    localStorage.setItem('theme', 'dark')
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    // Currently dark — toggle off
    await user.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('does not show Continue when saved game is marked as completed', () => {
    saveGame(GRID, GRID, GRID)
    saveCompleted()
    render(<App />)
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull()
  })

  it('shows Continue again after starting a new game clears the completed flag', async () => {
    saveGame(GRID, GRID, GRID)
    saveCompleted()
    render(<App />)
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull()
    // Start a new game — clears the completed flag
    await userEvent.click(await screen.findByRole('button', { name: /^new game$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^start$/i }))
    await screen.findAllByRole('gridcell')
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull()
  })

  it('opens puzzle info for generated games from the menu', async () => {
    appPuzzleQueueMocks.takeQueuedGame.mockResolvedValueOnce({
      puzzle: PUZZLE_WITH_GAPS,
      solution: GRID,
      difficulty: 'VERY_HARD',
      score: 1700,
    })
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^new game$/i }))
    await user.click(screen.getByRole('button', { name: /^very hard$/i }))
    await user.click(screen.getByRole('button', { name: /^start$/i }))
    await screen.findAllByRole('gridcell')
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /info/i }))
    const dialog = screen.getByRole('dialog', { name: /puzzle info/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Generated')).toBeInTheDocument()
    expect(within(dialog).getByText('Very Hard')).toBeInTheDocument()
    expect(within(dialog).getByText(/1[.,]?700/)).toBeInTheDocument()
  })

  it('starts a preloaded puzzle when the selected difficulty queue is empty', async () => {
    Object.assign(appPuzzleQueueMocks.availability, {
      VERY_EASY: 0,
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
      VERY_HARD: 0,
      EXPERT: 0,
      NIGHTMARE: 0,
      DIABOLICAL: 0,
    })
    appPuzzleQueueMocks.takeQueuedGame.mockResolvedValue(null)

    render(<App />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /^new game$/i }))
    await user.click(screen.getByRole('button', { name: /^hard$/i }))
    await user.click(screen.getByRole('button', { name: /^start$/i }))

    await screen.findAllByRole('gridcell')

    expect(appPuzzleQueueMocks.takeQueuedGame).toHaveBeenCalledWith('HARD')
    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Hard')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /info/i }))

    const dialog = screen.getByRole('dialog', { name: /puzzle info/i })
    expect(within(dialog).getByText('Pre-loaded')).toBeInTheDocument()
    expect(within(dialog).getByText('Hard')).toBeInTheDocument()
  })

  it('evaluates imported puzzles and shows their info', async () => {
    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)
    render(<App />)
    const user = userEvent.setup()
    await screen.findAllByRole('gridcell')
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /info/i }))
    expect(hodokuMocks.verifyPuzzle).toHaveBeenCalledOnce()
    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
    const dialog = screen.getByRole('dialog', { name: /puzzle info/i })
    expect(await within(dialog).findByText('Imported')).toBeInTheDocument()
    expect(within(dialog).getByText('Very Hard')).toBeInTheDocument()
    expect(within(dialog).getByText(/1[.,]?700/)).toBeInTheDocument()
  })

  it('keeps valid imported puzzles through StrictMode remount while cleaning the URL', async () => {
    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )

    await screen.findAllByRole('gridcell')

    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
    expect(screen.queryByRole('heading', { name: /welcome/i })).toBeNull()
  })

  it('ignores stale strict-mode verification results when an earlier run resolves null', async () => {
    const neverSettles = new Promise<never>(() => {})
    hodokuMocks.verifyPuzzle
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        solution: GRID,
        difficulty: 'VERY_HARD',
        score: 1700,
      })
      .mockImplementation(() => neverSettles)

    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )

    await screen.findAllByRole('gridcell')

    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
    expect(screen.queryByRole('heading', { name: /welcome/i })).toBeNull()
    expect(screen.queryByText('This puzzle has no valid solution.')).toBeNull()
  })

  it('keeps valid imported puzzles through repeated remounts before verification settles', async () => {
    const neverSettles = new Promise<never>(() => {})
    hodokuMocks.verifyPuzzle
      .mockReset()
      .mockImplementationOnce(() => neverSettles)
      .mockImplementationOnce(() => neverSettles)
      .mockResolvedValueOnce({
        solution: GRID,
        difficulty: 'VERY_HARD',
        score: 1700,
      })

    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)

    const first = render(<App />)
    first.unmount()
    const second = render(<App />)
    second.unmount()
    render(<App />)

    await screen.findAllByRole('gridcell')

    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
    expect(screen.queryByRole('heading', { name: /welcome/i })).toBeNull()
  })

  it('reopens a verified imported puzzle after a later remount with the cleaned URL', async () => {
    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)

    const first = render(<App />)
    await screen.findAllByRole('gridcell')
    first.unmount()

    window.history.replaceState(null, '', '/')
    render(<App />)

    await screen.findAllByRole('gridcell')

    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
    expect(screen.queryByRole('heading', { name: /welcome/i })).toBeNull()
  })

  it('rejects imported puzzles when hodoku cannot verify them', async () => {
    hodokuMocks.verifyPuzzle.mockResolvedValueOnce(null)
    window.history.pushState(null, '', `/?p=${encodeGrid(PUZZLE_WITH_GAPS)}`)
    render(<App />)
    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument()
    expect(screen.getByText('This puzzle has no valid solution.')).toBeInTheDocument()
    expect(screen.queryByRole('gridcell')).toBeNull()
  })

  it('shows saved created-game difficulty labels on the board', async () => {
    saveGame(
      PUZZLE_WITH_GAPS,
      PUZZLE_WITH_GAPS,
      GRID,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { source: 'created', difficultyLabel: 'Very Hard', score: 1700 },
    )

    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findAllByRole('gridcell')

    expect(document.querySelector('.difficulty-label')?.textContent).toBe('Very Hard')
  })
})
