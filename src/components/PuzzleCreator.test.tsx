import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import PuzzleCreator from './PuzzleCreator'

const hodokuMocks = vi.hoisted(() => ({
  verifyPuzzle: vi.fn(),
}))

const clipboardMocks = vi.hoisted(() => ({
  readClipboardText: vi.fn(),
}))

vi.mock('../utils/generators/hodoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/generators/hodoku')>()
  return {
    ...actual,
    verifyPuzzle: hodokuMocks.verifyPuzzle,
  }
})

vi.mock('../utils/clipboard', () => ({
  readClipboardText: clipboardMocks.readClipboardText,
}))

const UNIQUE_PUZZLE: number[][] = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
]

const MULTI_SOLUTION_PUZZLE: number[][] = [
  [0, 3, 0, 0, 0, 8, 0, 0, 0],
  [0, 0, 2, 1, 9, 5, 3, 0, 8],
  [0, 9, 8, 0, 4, 2, 5, 6, 7],
  [0, 0, 9, 0, 0, 0, 0, 2, 0],
  [4, 2, 6, 8, 0, 0, 7, 0, 1],
  [7, 0, 3, 0, 2, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 7, 2, 0, 0],
  [2, 8, 7, 4, 0, 0, 0, 3, 5],
  [3, 0, 5, 0, 8, 6, 0, 7, 9],
]

const UNIQUE_SOLUTION: number[][] = [
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

const UNIQUE_PUZZLE_CLUES = UNIQUE_PUZZLE.flat().filter(value => value !== 0).length

describe('PuzzleCreator', () => {
  beforeEach(() => {
    hodokuMocks.verifyPuzzle.mockReset()
    hodokuMocks.verifyPuzzle.mockResolvedValue({
      solution: UNIQUE_SOLUTION,
      difficulty: 'VERY_HARD',
      score: 1700,
    })
    clipboardMocks.readClipboardText.mockReset()
    clipboardMocks.readClipboardText.mockResolvedValue('')
  })

  it('renders the simplified creation tools', async () => {
    render(<PuzzleCreator onStart={vi.fn()} />)
    expect(screen.getByRole('grid', { name: /created puzzle grid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import from clipboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eraser mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm created puzzle/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /toggle notes mode/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /toggle brush mode/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /toggle free drawing/i })).toBeNull()
  })

  it.each([
    ['dots', '.'],
    ['zeros', '0'],
    ['dashes', '-'],
  ])('imports a %s-based puzzle from longer clipboard text', async (_label, emptyCell) => {
    const user = userEvent.setup()
    const encoded = UNIQUE_PUZZLE
      .flat()
      .map(value => (value === 0 ? emptyCell : String(value)))
      .join('')

    clipboardMocks.readClipboardText.mockResolvedValueOnce(`notes before\n${encoded}\nnotes after`)

    render(<PuzzleCreator onStart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /import from clipboard/i }))

    await waitFor(() => {
      const cells = screen.getAllByRole('gridcell')
      expect(cells[0]).toHaveTextContent('5')
      expect(cells[1]).toHaveTextContent('3')
      expect(cells[4]).toHaveTextContent('7')
    })
    expect(screen.getByText(new RegExp(`${UNIQUE_PUZZLE_CLUES} clues`, 'i'))).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows an error when the clipboard does not contain a puzzle', async () => {
    const user = userEvent.setup()
    clipboardMocks.readClipboardText.mockResolvedValueOnce('meeting notes without a sudoku')

    render(<PuzzleCreator onStart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /import from clipboard/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/clipboard does not contain a puzzle/i)
  })

  it('opens a paste fallback dialog when direct clipboard access is unavailable', async () => {
    const user = userEvent.setup()
    clipboardMocks.readClipboardText.mockResolvedValueOnce(null)

    render(<PuzzleCreator onStart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /import from clipboard/i }))

    const dialog = await screen.findByRole('dialog', { name: /paste puzzle text/i })
    expect(within(dialog).getByRole('textbox', { name: /puzzle text/i })).toBeInTheDocument()
  })

  it('imports a puzzle from pasted text when clipboard reads are blocked', async () => {
    const user = userEvent.setup()
    const encoded = UNIQUE_PUZZLE
      .flat()
      .map(value => (value === 0 ? '.' : String(value)))
      .join('')

    clipboardMocks.readClipboardText.mockRejectedValueOnce(new Error('NotAllowedError'))

    render(<PuzzleCreator onStart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /import from clipboard/i }))

    const dialog = await screen.findByRole('dialog', { name: /paste puzzle text/i })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /puzzle text/i }), {
      target: { value: `notes before\n${encoded}\nnotes after` },
    })

    await user.click(within(dialog).getByRole('button', { name: /import pasted text/i }))

    await waitFor(() => {
      const cells = screen.getAllByRole('gridcell')
      expect(cells[0]).toHaveTextContent('5')
      expect(cells[1]).toHaveTextContent('3')
      expect(cells[4]).toHaveTextContent('7')
      expect(screen.queryByRole('dialog', { name: /paste puzzle text/i })).toBeNull()
    })
    expect(screen.getByText(new RegExp(`${UNIQUE_PUZZLE_CLUES} clues`, 'i'))).toBeInTheDocument()
  })

  it('starts the game when the created puzzle has a unique solution', async () => {
    const onStart = vi.fn()
    render(<PuzzleCreator onStart={onStart} initialGrid={UNIQUE_PUZZLE} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm created puzzle/i }))
    expect(onStart).toHaveBeenCalledOnce()
    expect(onStart).toHaveBeenCalledWith(UNIQUE_PUZZLE, {
      solution: UNIQUE_SOLUTION,
      difficulty: 'VERY_HARD',
      score: 1700,
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows an error when the created puzzle does not have a unique solution', async () => {
    const onStart = vi.fn()
    render(<PuzzleCreator onStart={onStart} initialGrid={MULTI_SOLUTION_PUZZLE} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm created puzzle/i }))
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/exactly one solution/i)
  })

  it('renders coordinate labels when enabled', () => {
    render(<PuzzleCreator onStart={vi.fn()} coordinateLabels />)
    expect(screen.getByTestId('creator-coordinate-columns')).toHaveTextContent('123456789')
    expect(screen.getByTestId('creator-coordinate-rows')).toHaveTextContent('ABCDEFGHI')
  })

  it('opens the pencil overlay for empty cells when pencil mode is enabled', () => {
    const mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => mockContext)

    render(<PuzzleCreator onStart={vi.fn()} pencilMode />)
    const emptyCell = screen.getAllByRole('gridcell')[0]
    fireEvent.pointerDown(emptyCell, { clientX: 12, clientY: 12, pointerId: 1 })
    expect(document.querySelector('.pencil-cell-canvas')).not.toBeNull()
    getContextSpy.mockRestore()
  })

  it('shows reference-only number buttons in pencil mode', () => {
    render(<PuzzleCreator onStart={vi.fn()} pencilMode />)
    const numberButton = screen.getByRole('button', { name: '1' })
    expect(numberButton).toBeDisabled()
    expect(numberButton).toHaveClass('num-key--reference')
  })

  it('moves the selected cell with arrow keys', async () => {
    render(<PuzzleCreator onStart={vi.fn()} />)
    const user = userEvent.setup()
    const cells = screen.getAllByRole('gridcell')

    await user.click(cells[0])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await user.click(screen.getByRole('button', { name: '4' }))

    expect(cells[1]).toHaveAttribute('aria-selected', 'true')
    expect(cells[1]).toHaveTextContent('4')
    expect(cells[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('applies keyboard digits to the selected cell after arrow navigation', async () => {
    const user = userEvent.setup()
    render(<PuzzleCreator onStart={vi.fn()} />)
    const cells = screen.getAllByRole('gridcell')

    await user.click(cells[0])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: '5' })

    expect(cells[1]).toHaveAttribute('aria-selected', 'true')
    expect(cells[1]).toHaveTextContent('5')
    expect(cells[0]).toHaveTextContent('')
  })

  it('starts the creation flow when Enter is pressed', async () => {
    const onStart = vi.fn()
    render(<PuzzleCreator onStart={onStart} initialGrid={UNIQUE_PUZZLE} />)

    fireEvent.keyDown(window, { key: 'Enter' })

    await waitFor(() => expect(onStart).toHaveBeenCalledOnce())
  })

  it('shows an error when hodoku rejects a created puzzle', async () => {
    const onStart = vi.fn()
    hodokuMocks.verifyPuzzle.mockResolvedValueOnce(null)
    render(<PuzzleCreator onStart={onStart} initialGrid={UNIQUE_PUZZLE} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm created puzzle/i }))

    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/no valid solution/i)
  })
})
