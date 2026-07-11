import { createAsyncThunk } from '@reduxjs/toolkit'
import { generateGame } from '../utils/sudoku'
import { cloneGrid, type PuzzleMetadata } from '../utils/gameStorage'
import { startNewGame } from './gameSlice'
import { resetBoardUi } from './boardUiSlice'

export const newGameThunk = createAsyncThunk(
  'game/newGame',
  async (puzzleMetadata: PuzzleMetadata | null, { dispatch }) => {
    const { puzzle, solution } = await generateGame()
    const initial = cloneGrid(puzzle)
    dispatch(startNewGame({ initial, current: puzzle, solution, puzzleMetadata }))
    dispatch(resetBoardUi())
  },
)
