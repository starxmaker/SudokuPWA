import { describe, it, expect } from 'vitest'
import gameReducer, {
  writeDigit,
  toggleNote,
  eraseCell,
  applyCellBrushColor,
  applyCandidateBrushColor,
  clearSelectedBrushColors,
  clearAllColors,
  clearAllNotes,
  clearColorFromBoard,
  removeCandidate,
  fillAllCandidates,
  applySingleCandidatesToDigits,
  undo,
  redo,
  startNewGame,
  handleRetry,
  selectCell,
  focusCell,
  moveSelection,
  winGame,
  type GameState,
} from './gameSlice'
import { emptyCellColors, emptyCandidateColors } from '../utils/gameStorage'

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

function createInitialState(overrides?: Partial<GameState>): GameState {
  return {
    initial: PUZZLE,
    current: PUZZLE,
    solution: SOLUTION,
    notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
    cellColors: emptyCellColors(),
    candidateColors: emptyCandidateColors(),
    flaggedColorCell: null,
    puzzleMetadata: null,
    elapsed: 0,
    paused: false,
    manualPause: false,
    won: false,
    finalTime: 0,
    history: [],
    redoHistory: [],
    selected: { r: 0, c: 2 },
    notesMode: false,
    eraserMode: false,
    eraserColorPickerMode: false,
    brushMode: false,
    candidateToolMode: false,
    historyToolMode: false,
    moreToolMode: false,
    activeBrushColor: 'rose',
    candidateSelectedDigit: null,
    shareCopied: false,
    requiredTechniquesOpen: false,
    requiredTechniquesLoading: false,
    requiredTechniquesResult: null,
    requiredTechniquesError: null,
    expandedTechniqueSteps: [],
    gameId: 1,
    ...overrides,
  }
}

describe('gameSlice reducers', () => {
  describe('writeDigit', () => {
    it('places a digit in an empty cell', () => {
      const state = createInitialState()
      const next = gameReducer(state, writeDigit({ d: 4, pencilMode: false, autoCheck: true, autoRemove: true }))
      expect(next.current[0][2]).toBe(4)
      expect(next.history.length).toBe(1)
    })

    it('does not place a digit on a clue cell', () => {
      const state = createInitialState({ selected: { r: 0, c: 0 } })
      const next = gameReducer(state, writeDigit({ d: 5, pencilMode: false, autoCheck: true, autoRemove: true }))
      expect(next.current[0][0]).toBe(5)
      expect(next.history.length).toBe(0)
    })

    it('does not place a digit when brush mode is active', () => {
      const state = createInitialState({ brushMode: true })
      const next = gameReducer(state, writeDigit({ d: 4, pencilMode: false, autoCheck: true, autoRemove: true }))
      expect(next.current[0][2]).toBe(0)
      expect(next.history.length).toBe(0)
    })

    it('does not place a digit when exhausted', () => {
      const state = createInitialState()
      const next = gameReducer(state, writeDigit({ d: 7, pencilMode: false, autoCheck: true, autoRemove: true }))
      expect(next.current[0][2]).toBe(0)
      expect(next.history.length).toBe(0)
    })
  })

  describe('toggleNote', () => {
    it('adds a note to an empty cell', () => {
      const state = createInitialState()
      const next = gameReducer(state, toggleNote({ r: 0, c: 2, d: 4, pencilMode: false }))
      expect(next.notes[0][2]).toContain(4)
      expect(next.history.length).toBe(1)
    })

    it('does not remove a note when toggled again in pencil mode', () => {
      const state = createInitialState({ notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])) })
      state.notes[0][2] = [4]
      const next = gameReducer(state, toggleNote({ r: 0, c: 2, d: 4, pencilMode: true }))
      expect(next.notes[0][2]).toContain(4)
    })

    it('does not toggle note on a clue cell', () => {
      const state = createInitialState()
      const next = gameReducer(state, toggleNote({ r: 0, c: 0, d: 5, pencilMode: false }))
      expect(next.notes[0][0]).toEqual([])
      expect(next.history.length).toBe(0)
    })
  })

  describe('eraseCell', () => {
    it('clears a filled cell', () => {
      const state = createInitialState({ current: SOLUTION })
      const next = gameReducer(state, eraseCell({ r: 0, c: 2 }))
      expect(next.current[0][2]).toBe(0)
      expect(next.history.length).toBe(1)
    })

    it('does not erase a clue cell', () => {
      const state = createInitialState()
      const next = gameReducer(state, eraseCell({ r: 0, c: 0 }))
      expect(next.current[0][0]).toBe(5)
      expect(next.history.length).toBe(0)
    })
  })

  describe('applyCellBrushColor', () => {
    it('toggles a brush color on an empty cell', () => {
      const state = createInitialState()
      const next = gameReducer(state, applyCellBrushColor({ r: 0, c: 2, colorId: 'rose', firstColorFlagEnabled: false }))
      expect(next.cellColors[0][2]).toContain('rose')
      expect(next.history.length).toBe(1)
    })

    it('does not apply color to a filled cell', () => {
      const state = createInitialState({ current: SOLUTION })
      const next = gameReducer(state, applyCellBrushColor({ r: 0, c: 0, colorId: 'rose', firstColorFlagEnabled: false }))
      expect(next.cellColors[0][0]).toEqual([])
      expect(next.history.length).toBe(0)
    })
  })

  describe('clearAllColors', () => {
    it('clears all brush colors', () => {
      const state = createInitialState()
      state.cellColors[0][2] = ['rose']
      const next = gameReducer(state, clearAllColors())
      expect(next.cellColors[0][2]).toEqual([])
      expect(next.history.length).toBe(1)
    })

    it('does nothing when no colors exist', () => {
      const state = createInitialState()
      const next = gameReducer(state, clearAllColors())
      expect(next.history.length).toBe(0)
    })
  })

  describe('clearAllNotes', () => {
    it('clears all notes', () => {
      const state = createInitialState()
      state.notes[0][2] = [1, 2, 3]
      const next = gameReducer(state, clearAllNotes())
      expect(next.notes[0][2]).toEqual([])
      expect(next.history.length).toBe(1)
    })

    it('does nothing when no notes exist', () => {
      const state = createInitialState()
      const next = gameReducer(state, clearAllNotes())
      expect(next.history.length).toBe(0)
    })
  })

  describe('undo/redo', () => {
    it('restores state on undo', () => {
      const state = createInitialState()
      const afterWrite = gameReducer(state, writeDigit({ d: 4, pencilMode: false, autoCheck: true, autoRemove: true }))
      expect(afterWrite.current[0][2]).toBe(4)
      const afterUndo = gameReducer(afterWrite, undo())
      expect(afterUndo.current[0][2]).toBe(0)
      expect(afterUndo.history.length).toBe(0)
      expect(afterUndo.redoHistory.length).toBe(1)
    })

    it('restores state on redo', () => {
      const state = createInitialState()
      const afterWrite = gameReducer(state, writeDigit({ d: 4, pencilMode: false, autoCheck: true, autoRemove: true }))
      const afterUndo = gameReducer(afterWrite, undo())
      const afterRedo = gameReducer(afterUndo, redo())
      expect(afterRedo.current[0][2]).toBe(4)
      expect(afterRedo.history.length).toBe(1)
      expect(afterRedo.redoHistory.length).toBe(0)
    })
  })

  describe('startNewGame', () => {
    it('resets all game state', () => {
      const state = createInitialState({ current: SOLUTION, won: true, elapsed: 100 })
      const next = gameReducer(state, startNewGame({ initial: PUZZLE, current: PUZZLE, solution: SOLUTION, puzzleMetadata: null }))
      expect(next.current[0][2]).toBe(0)
      expect(next.won).toBe(false)
      expect(next.elapsed).toBe(0)
      expect(next.gameId).toBe(2)
    })
  })

  describe('handleRetry', () => {
    it('resets to initial puzzle', () => {
      const state = createInitialState({ current: SOLUTION, won: true })
      const next = gameReducer(state, handleRetry())
      expect(next.current[0][2]).toBe(0)
      expect(next.won).toBe(false)
    })
  })

  describe('selectCell', () => {
    it('selects a cell', () => {
      const state = createInitialState({ selected: null })
      const next = gameReducer(state, selectCell({ r: 1, c: 1 }))
      expect(next.selected).toEqual({ r: 1, c: 1 })
    })

    it('deselects when clicking the same cell', () => {
      const state = createInitialState({ selected: { r: 0, c: 2 } })
      const next = gameReducer(state, selectCell({ r: 0, c: 2 }))
      expect(next.selected).toBeNull()
    })
  })

  describe('focusCell', () => {
    it('focuses a cell', () => {
      const state = createInitialState({ selected: null })
      const next = gameReducer(state, focusCell({ r: 1, c: 1 }))
      expect(next.selected).toEqual({ r: 1, c: 1 })
    })
  })

  describe('moveSelection', () => {
    it('moves selection by delta', () => {
      const state = createInitialState({ selected: { r: 0, c: 0 } })
      const next = gameReducer(state, moveSelection({ dr: 1, dc: 1 }))
      expect(next.selected).toEqual({ r: 1, c: 1 })
    })

    it('clamps to grid bounds', () => {
      const state = createInitialState({ selected: { r: 0, c: 0 } })
      const next = gameReducer(state, moveSelection({ dr: -1, dc: -1 }))
      expect(next.selected).toEqual({ r: 0, c: 0 })
    })
  })

  describe('winGame', () => {
    it('sets won and paused', () => {
      const state = createInitialState()
      const next = gameReducer(state, winGame(123))
      expect(next.won).toBe(true)
      expect(next.paused).toBe(true)
      expect(next.finalTime).toBe(123)
    })
  })
})
