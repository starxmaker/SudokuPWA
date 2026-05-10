import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Grid } from '../utils/sudoku_types'
import {
  cloneGrid,
  cloneNotes,
  cloneCellColors,
  cloneCandidateColors,
  cloneFlaggedColorCell,
  cloneDrawingStrokes,
  emptyCellColors,
  emptyCandidateColors,
  emptyDrawingStrokes,
  type CellColorGrid,
  type CandidateColorGrid,
  type DrawingStrokes,
  type FlaggedColorCell,
  type PuzzleMetadata,
} from '../utils/gameStorage'
import type { RequiredTechniques } from '../utils/generators/hodoku'
import type { BoardHistoryEntry, BrushColorId } from './gameTypes'

export type GameState = {
  initial: Grid | null
  current: Grid | null
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  drawingStrokes: DrawingStrokes
  flaggedColorCell: FlaggedColorCell
  puzzleMetadata: PuzzleMetadata | null
  elapsed: number
  paused: boolean
  manualPause: boolean
  won: boolean
  finalTime: number
  history: BoardHistoryEntry[]
  redoHistory: BoardHistoryEntry[]
  selected: { r: number; c: number } | null
  notesMode: boolean
  eraserMode: boolean
  brushMode: boolean
  drawingMode: boolean
  candidateToolMode: boolean
  historyToolMode: boolean
  activeBrushColor: BrushColorId
  activeDrawingColor: BrushColorId
  shareCopied: boolean
  requiredTechniquesOpen: boolean
  requiredTechniquesLoading: boolean
  requiredTechniquesResult: RequiredTechniques | null
  requiredTechniquesError: string | null
  expandedTechniqueSteps: number[]
  gameId: number
}

function emptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))
}

function makeEntry(
  current: Grid,
  notes: number[][][],
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  drawingStrokes: DrawingStrokes,
  flaggedColorCell: FlaggedColorCell,
): BoardHistoryEntry {
  return {
    puzzle: cloneGrid(current),
    notes: cloneNotes(notes),
    cellColors: cloneCellColors(cellColors),
    candidateColors: cloneCandidateColors(candidateColors),
    drawingStrokes: cloneDrawingStrokes(drawingStrokes),
    flaggedColorCell: cloneFlaggedColorCell(flaggedColorCell),
  }
}

export const gameSlice = createSlice({
  name: 'game',
  initialState: {
    initial: null as Grid | null,
    current: null as Grid | null,
    solution: null as Grid | null,
    notes: emptyNotes() as number[][][],
    cellColors: emptyCellColors() as CellColorGrid,
    candidateColors: emptyCandidateColors() as CandidateColorGrid,
    drawingStrokes: emptyDrawingStrokes() as DrawingStrokes,
    flaggedColorCell: null as FlaggedColorCell,
    puzzleMetadata: null as PuzzleMetadata | null,
    elapsed: 0 as number,
    paused: false as boolean,
    manualPause: false as boolean,
    won: false as boolean,
    finalTime: 0 as number,
    history: [] as BoardHistoryEntry[],
    redoHistory: [] as BoardHistoryEntry[],
    selected: null as { r: number; c: number } | null,
    notesMode: false as boolean,
    eraserMode: false as boolean,
    brushMode: false as boolean,
    drawingMode: false as boolean,
    candidateToolMode: false as boolean,
    historyToolMode: false as boolean,
    activeBrushColor: 'rose' as BrushColorId,
    activeDrawingColor: 'rose' as BrushColorId,
    shareCopied: false as boolean,
    requiredTechniquesOpen: false as boolean,
    requiredTechniquesLoading: false as boolean,
    requiredTechniquesResult: null as RequiredTechniques | null,
    requiredTechniquesError: null as string | null,
    expandedTechniqueSteps: [] as number[],
    gameId: 0 as number,
  } as GameState,
  reducers: {
    startNewGame(state, action: PayloadAction<{ initial: Grid; current: Grid; solution: Grid; puzzleMetadata: PuzzleMetadata | null }>) {
      const { initial, current, solution, puzzleMetadata } = action.payload
      state.initial = initial
      state.current = current
      state.solution = solution
      state.notes = emptyNotes()
      state.cellColors = emptyCellColors()
      state.candidateColors = emptyCandidateColors()
      state.drawingStrokes = emptyDrawingStrokes()
      state.flaggedColorCell = null
      state.puzzleMetadata = puzzleMetadata
      state.elapsed = 0
      state.paused = false
      state.manualPause = false
      state.won = false
      state.finalTime = 0
      state.history = []
      state.redoHistory = []
      state.selected = null
      state.notesMode = false
      state.eraserMode = false
      state.brushMode = false
      state.drawingMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
      state.shareCopied = false
      state.requiredTechniquesOpen = false
      state.requiredTechniquesLoading = false
      state.requiredTechniquesResult = null
      state.requiredTechniquesError = null
      state.expandedTechniqueSteps = []
      state.gameId += 1
    },
    handleRetry(state) {
      if (!state.initial) return
      state.current = cloneGrid(state.initial)
      state.notes = emptyNotes()
      state.cellColors = emptyCellColors()
      state.candidateColors = emptyCandidateColors()
      state.drawingStrokes = emptyDrawingStrokes()
      state.flaggedColorCell = null
      state.elapsed = 0
      state.paused = false
      state.manualPause = false
      state.won = false
      state.finalTime = 0
      state.history = []
      state.redoHistory = []
      state.selected = null
      state.notesMode = false
      state.eraserMode = false
      state.brushMode = false
      state.drawingMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
      state.shareCopied = false
      state.requiredTechniquesOpen = false
      state.requiredTechniquesLoading = false
      state.requiredTechniquesResult = null
      state.requiredTechniquesError = null
      state.expandedTechniqueSteps = []
    },
    setCurrent(state, action: PayloadAction<Grid>) {
      state.current = action.payload
    },
    setNotes(state, action: PayloadAction<number[][][]>) {
      state.notes = action.payload
    },
    setCellColors(state, action: PayloadAction<CellColorGrid>) {
      state.cellColors = action.payload
    },
    setCandidateColors(state, action: PayloadAction<CandidateColorGrid>) {
      state.candidateColors = action.payload
    },
    setDrawingStrokes(state, action: PayloadAction<DrawingStrokes>) {
      state.drawingStrokes = action.payload
    },
    setFlaggedColorCell(state, action: PayloadAction<FlaggedColorCell>) {
      state.flaggedColorCell = action.payload
    },
    setInitial(state, action: PayloadAction<Grid>) {
      state.initial = action.payload
    },
    setSolution(state, action: PayloadAction<Grid>) {
      state.solution = action.payload
    },
    setPuzzleMetadata(state, action: PayloadAction<PuzzleMetadata | null>) {
      state.puzzleMetadata = action.payload
    },
    tickElapsed(state) {
      state.elapsed += 1
    },
    setPaused(state, action: PayloadAction<boolean>) {
      state.paused = action.payload
    },
    setManualPause(state, action: PayloadAction<boolean>) {
      state.manualPause = action.payload
    },
    winGame(state, action: PayloadAction<number>) {
      state.won = true
      state.paused = true
      state.finalTime = action.payload
    },
    markWon(state) {
      state.won = true
    },
    pushHistoryEntry(state, action: PayloadAction<BoardHistoryEntry>) {
      if (state.history.length >= 50) state.history.shift()
      state.history.push(action.payload)
      state.redoHistory = []
    },
    undo(state) {
      if (state.history.length === 0) return
      const entry = state.history.pop()!
      const currentEntry = makeEntry(
        state.current!,
        state.notes,
        state.cellColors,
        state.candidateColors,
        state.drawingStrokes,
        state.flaggedColorCell,
      )
      if (state.redoHistory.length >= 50) state.redoHistory.shift()
      state.redoHistory.push(currentEntry)
      state.current = entry.puzzle
      state.notes = entry.notes
      state.cellColors = entry.cellColors
      state.candidateColors = entry.candidateColors
      state.drawingStrokes = entry.drawingStrokes
      state.flaggedColorCell = entry.flaggedColorCell
    },
    redo(state) {
      if (state.redoHistory.length === 0) return
      const entry = state.redoHistory.pop()!
      const currentEntry = makeEntry(
        state.current!,
        state.notes,
        state.cellColors,
        state.candidateColors,
        state.drawingStrokes,
        state.flaggedColorCell,
      )
      if (state.history.length >= 50) state.history.shift()
      state.history.push(currentEntry)
      state.current = entry.puzzle
      state.notes = entry.notes
      state.cellColors = entry.cellColors
      state.candidateColors = entry.candidateColors
      state.drawingStrokes = entry.drawingStrokes
      state.flaggedColorCell = entry.flaggedColorCell
    },
    setSelected(state, action: PayloadAction<{ r: number; c: number } | null>) {
      state.selected = action.payload
    },
    setNotesMode(state, action: PayloadAction<boolean>) {
      state.notesMode = action.payload
    },
    setEraserMode(state, action: PayloadAction<boolean>) {
      state.eraserMode = action.payload
    },
    setBrushMode(state, action: PayloadAction<boolean>) {
      state.brushMode = action.payload
    },
    setDrawingMode(state, action: PayloadAction<boolean>) {
      state.drawingMode = action.payload
    },
    setCandidateToolMode(state, action: PayloadAction<boolean>) {
      state.candidateToolMode = action.payload
    },
    setHistoryToolMode(state, action: PayloadAction<boolean>) {
      state.historyToolMode = action.payload
    },
    setActiveBrushColor(state, action: PayloadAction<BrushColorId>) {
      state.activeBrushColor = action.payload
    },
    setActiveDrawingColor(state, action: PayloadAction<BrushColorId>) {
      state.activeDrawingColor = action.payload
    },
    setShareCopied(state, action: PayloadAction<boolean>) {
      state.shareCopied = action.payload
    },
    setRequiredTechniquesOpen(state, action: PayloadAction<boolean>) {
      state.requiredTechniquesOpen = action.payload
    },
    setRequiredTechniquesLoading(state, action: PayloadAction<boolean>) {
      state.requiredTechniquesLoading = action.payload
    },
    setRequiredTechniquesResult(state, action: PayloadAction<RequiredTechniques | null>) {
      state.requiredTechniquesResult = action.payload
    },
    setRequiredTechniquesError(state, action: PayloadAction<string | null>) {
      state.requiredTechniquesError = action.payload
    },
    setExpandedTechniqueSteps(state, action: PayloadAction<number[]>) {
      state.expandedTechniqueSteps = action.payload
    },
    resetBoardUI(state) {
      state.notesMode = false
      state.eraserMode = false
      state.brushMode = false
      state.drawingMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
    },
  },
})

export const {
  startNewGame,
  handleRetry,
  setCurrent,
  setNotes,
  setCellColors,
  setCandidateColors,
  setDrawingStrokes,
  setFlaggedColorCell,
  setInitial,
  setSolution,
  setPuzzleMetadata,
  tickElapsed,
  setPaused,
  setManualPause,
  winGame,
  markWon,
  pushHistoryEntry,
  undo,
  redo,
  setSelected,
  setNotesMode,
  setEraserMode,
  setBrushMode,
  setDrawingMode,
  setCandidateToolMode,
  setHistoryToolMode,
  setActiveBrushColor,
  setActiveDrawingColor,
  setShareCopied,
  setRequiredTechniquesOpen,
  setRequiredTechniquesLoading,
  setRequiredTechniquesResult,
  setRequiredTechniquesError,
  setExpandedTechniqueSteps,
  resetBoardUI,
} = gameSlice.actions

export default gameSlice.reducer
