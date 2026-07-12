import React from 'react'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {mockedAnalyzeRequiredTechniques,
  renderBoard,
  waitForBoard,
  mockLandscapeOrientation,
  createBoardTestStore,
  PUZZLE_WITH_7_REMAINING,
  SOLUTION,
} from './boardTestUtils'
import { LocalizationProvider, LANGUAGE_STORAGE_KEY } from '../../../utils/i18n'
import { Provider } from 'react-redux'
import Board from '../../Board'
import { formatPromptPuzzleState } from '../../board/TechniquesSidebar'

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

describe.skip('Board techniques sidebar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    mockedAnalyzeRequiredTechniques.mockReset()
    clipboardMocks.writeClipboardText.mockReset()
  })

  function renderWithLocalization(puzzle: number[][], solution: number[][]) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    return renderBoard(puzzle, solution)
  }

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
    renderWithLocalization(PUZZLE_WITH_7_REMAINING, SOLUTION)
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
    renderWithLocalization(PUZZLE_WITH_7_REMAINING, SOLUTION)
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

    renderWithLocalization(PUZZLE_WITH_7_REMAINING, SOLUTION)
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

    renderWithLocalization(PUZZLE_WITH_7_REMAINING, SOLUTION)
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

    renderBoard(PUZZLE_WITH_7_REMAINING, SOLUTION)
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

    renderWithLocalization(PUZZLE_WITH_7_REMAINING, SOLUTION)
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
})
