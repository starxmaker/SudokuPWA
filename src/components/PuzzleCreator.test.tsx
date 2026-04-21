import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PuzzleCreator from './PuzzleCreator'

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

describe('PuzzleCreator', () => {
  it('renders the simplified creation tools', async () => {
    render(<PuzzleCreator onStart={vi.fn()} />)
    expect(screen.getByRole('grid', { name: /created puzzle grid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eraser mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm created puzzle/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /toggle notes mode/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /toggle brush mode/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /toggle free drawing/i })).toBeNull()
  })

  it('starts the game when the created puzzle has a unique solution', async () => {
    const onStart = vi.fn()
    render(<PuzzleCreator onStart={onStart} initialGrid={UNIQUE_PUZZLE} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm created puzzle/i }))
    expect(onStart).toHaveBeenCalledOnce()
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
})
