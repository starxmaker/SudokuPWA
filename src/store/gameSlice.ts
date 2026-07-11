import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Grid } from '../utils/sudoku_types'
import {
  cloneGrid,
  cloneNotes,
  cloneCellColors,
  cloneCandidateColors,
  cloneFlaggedColorCell,
  emptyCellColors,
  emptyCandidateColors,
  loadSaved,
  loadElapsed,
  loadCompleted,
  type CellColorGrid,
  type CandidateColorGrid,
  type FlaggedColorCell,
  type PuzzleMetadata,
} from '../utils/gameStorage'
import type { RequiredTechniques } from '../utils/generators/hodoku'

export type BrushColorId = 'rose' | 'orange' | 'amber' | 'lime' | 'emerald' | 'sky' | 'violet' | 'pink'

export type BoardHistoryEntry = {
  puzzle: Grid
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  flaggedColorCell: FlaggedColorCell
}

export const BRUSH_COLORS = [
  { id: 'rose', fill: 'var(--brush-fill-rose)', swatch: '#f43f5e' },
  { id: 'orange', fill: 'var(--brush-fill-orange)', swatch: '#f97316' },
  { id: 'amber', fill: 'var(--brush-fill-amber)', swatch: '#f59e0b' },
  { id: 'lime', fill: 'var(--brush-fill-lime)', swatch: '#84cc16' },
  { id: 'emerald', fill: 'var(--brush-fill-emerald)', swatch: '#10b981' },
  { id: 'sky', fill: 'var(--brush-fill-sky)', swatch: '#0ea5e9' },
  { id: 'violet', fill: 'var(--brush-fill-violet)', swatch: '#8b5cf6' },
  { id: 'pink', fill: 'var(--brush-fill-pink)', swatch: '#ec4899' },
] as const

export const BRUSH_COLOR_MAP: Record<BrushColorId, string> = Object.fromEntries(
  BRUSH_COLORS.map(color => [color.id, color.fill])
) as Record<BrushColorId, string>

export const BRUSH_SWATCH_MAP: Record<BrushColorId, string> = Object.fromEntries(
  BRUSH_COLORS.map(color => [color.id, color.swatch])
) as Record<BrushColorId, string>

export const DEFAULT_BRUSH_COLOR: BrushColorId = BRUSH_COLORS[0].id

export type GameState = {
  initial: Grid | null
  current: Grid | null
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
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
  eraserColorPickerMode: boolean
  brushMode: boolean
  candidateToolMode: boolean
  historyToolMode: boolean
  moreToolMode: boolean
  activeBrushColor: BrushColorId
  candidateSelectedDigit: number | null
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

export function emptyCandidateColorCell(): string[][] {
  return Array.from({ length: 9 }, () => [] as string[])
}

function computeRemaining(current: Grid | null): Record<number, number> {
  const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  if (current) {
    for (const row of current) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  }
  const remaining: Record<number, number> = {}
  for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])
  return remaining
}

function makeEntry(
  current: Grid | null,
  notes: number[][][],
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  flaggedColorCell: FlaggedColorCell,
): BoardHistoryEntry {
  return {
    puzzle: current ? cloneGrid(current) : [],
    notes: cloneNotes(notes),
    cellColors: cloneCellColors(cellColors),
    candidateColors: cloneCandidateColors(candidateColors),
    flaggedColorCell: cloneFlaggedColorCell(flaggedColorCell),
  }
}

function pushHistory(state: GameState) {
  const entry = makeEntry(state.current, state.notes, state.cellColors, state.candidateColors, state.flaggedColorCell)
  if (state.history.length >= 50) state.history.shift()
  state.history.push(entry)
  state.redoHistory = []
}

function hasCellBrushColorsAt(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  r: number,
  c: number,
) {
  return cellColors[r][c].length > 0 || candidateColors[r][c].some(colors => colors.length > 0)
}

function resolveFlaggedColorCell(
  currentFlaggedColorCell: FlaggedColorCell,
  nextCellColors: CellColorGrid,
  nextCandidateColors: CandidateColorGrid,
  shouldAssignFirstFlag: boolean,
  targetCell: { r: number; c: number } | null,
  firstColorFlagEnabled: boolean,
): FlaggedColorCell {
  let next: FlaggedColorCell = currentFlaggedColorCell ? { ...currentFlaggedColorCell } : null
  if (
    next !== null &&
    !hasCellBrushColorsAt(nextCellColors, nextCandidateColors, next.r, next.c)
  ) {
    next = null
  }
  if (
    next === null &&
    firstColorFlagEnabled &&
    shouldAssignFirstFlag &&
    targetCell !== null &&
    hasCellBrushColorsAt(nextCellColors, nextCandidateColors, targetCell.r, targetCell.c)
  ) {
    return { ...targetCell }
  }
  return next
}

function hasAnyBrushColorsOnBoard(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
) {
  return (
    cellColors.some(row => row.some(color => color.length > 0)) ||
    candidateColors.some(row => row.some(cell => cell.some(color => color.length > 0)))
  )
}

function toggleColorInSelection(current: readonly string[], colorId: BrushColorId) {
  return current.includes(colorId) ? current.filter(color => color !== colorId) : [...current, colorId]
}

function getSimpleCandidates(puzzle: Grid, remaining: Record<number, number>, r: number, c: number): number[] {
  const used = new Set<number>()
  for (let i = 0; i < 9; i++) {
    const rowValue = puzzle[r][i]
    const colValue = puzzle[i][c]
    if (rowValue >= 1 && rowValue <= 9) used.add(rowValue)
    if (colValue >= 1 && colValue <= 9) used.add(colValue)
  }
  const boxR = Math.floor(r / 3) * 3
  const boxC = Math.floor(c / 3) * 3
  for (let br = boxR; br < boxR + 3; br++) {
    for (let bc = boxC; bc < boxC + 3; bc++) {
      const value = puzzle[br][bc]
      if (value >= 1 && value <= 9) used.add(value)
    }
  }
  const candidates: number[] = []
  for (let d = 1; d <= 9; d++) {
    if (!used.has(d) && remaining[d] > 0) candidates.push(d)
  }
  return candidates
}

function removeCandidateFromPeers(
  notes: number[][][],
  candidateColors: CandidateColorGrid,
  r: number,
  c: number,
  d: number,
) {
  const boxR = Math.floor(r / 3) * 3
  const boxC = Math.floor(c / 3) * 3
  for (let i = 0; i < 9; i++) {
    if (notes[r][i].length) notes[r][i] = notes[r][i].filter(n => n !== d)
    if (notes[i][c].length) notes[i][c] = notes[i][c].filter(n => n !== d)
    candidateColors[r][i][d - 1] = []
    candidateColors[i][c][d - 1] = []
  }
  for (let br = boxR; br < boxR + 3; br++) {
    for (let bc = boxC; bc < boxC + 3; bc++) {
      if (notes[br][bc].length) notes[br][bc] = notes[br][bc].filter(n => n !== d)
      candidateColors[br][bc][d - 1] = []
    }
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
    eraserColorPickerMode: false as boolean,
    brushMode: false as boolean,
    candidateToolMode: false as boolean,
    historyToolMode: false as boolean,
    moreToolMode: false as boolean,
    activeBrushColor: 'rose' as BrushColorId,
    candidateSelectedDigit: null as number | null,
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
      state.eraserColorPickerMode = false
      state.brushMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
      state.moreToolMode = false
      state.candidateSelectedDigit = null
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
      state.eraserColorPickerMode = false
      state.brushMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
      state.moreToolMode = false
      state.candidateSelectedDigit = null
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
    undo(state) {
      if (state.history.length === 0) return
      const entry = state.history.pop()!
      const currentEntry = makeEntry(state.current, state.notes, state.cellColors, state.candidateColors, state.flaggedColorCell)
      if (state.redoHistory.length >= 50) state.redoHistory.shift()
      state.redoHistory.push(currentEntry)
      state.current = entry.puzzle
      state.notes = entry.notes
      state.cellColors = entry.cellColors
      state.candidateColors = entry.candidateColors
      state.flaggedColorCell = entry.flaggedColorCell
    },
    redo(state) {
      if (state.redoHistory.length === 0) return
      const entry = state.redoHistory.pop()!
      const currentEntry = makeEntry(state.current, state.notes, state.cellColors, state.candidateColors, state.flaggedColorCell)
      if (state.history.length >= 50) state.history.shift()
      state.history.push(currentEntry)
      state.current = entry.puzzle
      state.notes = entry.notes
      state.cellColors = entry.cellColors
      state.candidateColors = entry.candidateColors
      state.flaggedColorCell = entry.flaggedColorCell
    },
    setSelected(state, action: PayloadAction<{ r: number; c: number } | null>) {
      state.selected = action.payload
    },
    selectCell(state, action: PayloadAction<{ r: number; c: number }>) {
      const { r, c } = action.payload
      state.candidateSelectedDigit = null
      if (state.selected?.r === r && state.selected?.c === c) {
        state.selected = null
      } else {
        state.selected = { r, c }
      }
    },
    focusCell(state, action: PayloadAction<{ r: number; c: number }>) {
      state.selected = action.payload
    },
    moveSelection(state, action: PayloadAction<{ dr: number; dc: number }>) {
      const { dr, dc } = action.payload
      const r = state.selected ? Math.max(0, Math.min(8, state.selected.r + dr)) : 0
      const c = state.selected ? Math.max(0, Math.min(8, state.selected.c + dc)) : 0
      state.selected = { r, c }
    },
    setNotesMode(state, action: PayloadAction<boolean>) {
      state.notesMode = action.payload
    },
    setEraserMode(state, action: PayloadAction<boolean>) {
      state.eraserMode = action.payload
    },
    setEraserColorPickerMode(state, action: PayloadAction<boolean>) {
      state.eraserColorPickerMode = action.payload
    },
    setBrushMode(state, action: PayloadAction<boolean>) {
      state.brushMode = action.payload
    },
    setCandidateToolMode(state, action: PayloadAction<boolean>) {
      state.candidateToolMode = action.payload
    },
    setHistoryToolMode(state, action: PayloadAction<boolean>) {
      state.historyToolMode = action.payload
    },
    setMoreToolMode(state, action: PayloadAction<boolean>) {
      state.moreToolMode = action.payload
    },
    setActiveBrushColor(state, action: PayloadAction<BrushColorId>) {
      state.activeBrushColor = action.payload
    },
    setCandidateSelectedDigit(state, action: PayloadAction<number | null>) {
      state.candidateSelectedDigit = action.payload
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
      state.eraserColorPickerMode = false
      state.brushMode = false
      state.candidateToolMode = false
      state.historyToolMode = false
      state.moreToolMode = false
      state.candidateSelectedDigit = null
    },

    writeDigit(state, action: PayloadAction<{
      d: number
      overrideCell?: { r: number; c: number }
      pencilMode: boolean
      autoCheck: boolean
      autoRemove: boolean
    }>) {
      const { d, overrideCell, pencilMode, autoCheck, autoRemove } = action.payload
      const target = overrideCell ?? state.selected
      if (!target || !state.current || !state.initial) return
      const { r, c } = target
      if (state.initial[r][c] !== 0) return
      const remaining = computeRemaining(state.current)
      if (remaining[d] === 0) return
      if (state.brushMode) return
      const existingDigit = state.current[r][c]
      if (existingDigit !== 0 && state.solution !== null && existingDigit === state.solution[r][c]) return

      if (state.notesMode) {
        state.candidateSelectedDigit = d
        pushHistory(state)
        const nextCandidateColors = cloneCandidateColors(state.candidateColors)
        nextCandidateColors[r][c][d - 1] = []
        const nextFlaggedColorCell = resolveFlaggedColorCell(
          state.flaggedColorCell, state.cellColors, nextCandidateColors, false, null, false,
        )
        const nextNotes = cloneNotes(state.notes)
        const cell = nextNotes[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0 && !pencilMode) cell.splice(idx, 1)
        else if (idx < 0) cell.push(d)
        state.notes = nextNotes
        state.candidateColors = nextCandidateColors
        state.flaggedColorCell = nextFlaggedColorCell
      } else {
        state.candidateSelectedDigit = null
        const canValidateEntry = autoCheck && state.solution !== null
        const isCorrectEntry = state.solution !== null && d === state.solution[r][c]
        const shouldAutoRemove = autoRemove && (!canValidateEntry || isCorrectEntry)

        pushHistory(state)
        const nextNotes = cloneNotes(state.notes)
        nextNotes[r][c] = []
        const nextCandidateColors = cloneCandidateColors(state.candidateColors)
        nextCandidateColors[r][c] = emptyCandidateColorCell()
        if (shouldAutoRemove) {
          removeCandidateFromPeers(nextNotes, nextCandidateColors, r, c, d)
        }
        const nextCellColors = cloneCellColors(state.cellColors)
        nextCellColors[r][c] = []
        const nextFlaggedColorCell = resolveFlaggedColorCell(
          state.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, false,
        )
        const nextPuzzle = cloneGrid(state.current)
        nextPuzzle[r][c] = d
        state.current = nextPuzzle
        state.notes = nextNotes
        state.candidateColors = nextCandidateColors
        state.cellColors = nextCellColors
        state.flaggedColorCell = nextFlaggedColorCell
      }
    },

    toggleNote(state, action: PayloadAction<{ r: number; c: number; d: number; pencilMode: boolean }>) {
      const { r, c, d, pencilMode } = action.payload
      if (!state.current || !state.initial) return
      if (state.initial[r][c] !== 0) return

      pushHistory(state)
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      nextCandidateColors[r][c][d - 1] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, state.cellColors, nextCandidateColors, false, null, false,
      )
      const nextNotes = cloneNotes(state.notes)
      const cell = nextNotes[r][c]
      const idx = cell.indexOf(d)
      if (idx >= 0 && !pencilMode) cell.splice(idx, 1)
      else if (idx < 0) cell.push(d)
      state.notes = nextNotes
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    eraseCell(state, action: PayloadAction<{ r: number; c: number }>) {
      const { r, c } = action.payload
      if (!state.current || !state.initial) return
      if (state.initial[r][c] !== 0) return

      pushHistory(state)
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      nextCandidateColors[r][c] = emptyCandidateColorCell()
      const nextCellColors = cloneCellColors(state.cellColors)
      nextCellColors[r][c] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, false,
      )
      const nextNotes = cloneNotes(state.notes)
      nextNotes[r][c] = []
      const nextPuzzle = cloneGrid(state.current)
      nextPuzzle[r][c] = 0
      state.current = nextPuzzle
      state.notes = nextNotes
      state.cellColors = nextCellColors
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    applyCellBrushColor(state, action: PayloadAction<{ r: number; c: number; colorId: BrushColorId; firstColorFlagEnabled: boolean }>) {
      const { r, c, colorId, firstColorFlagEnabled } = action.payload
      if (!state.current) return
      if (state.current[r][c] !== 0) return
      if (state.candidateColors[r][c].some(candidateColors => candidateColors.length > 0)) return
      const currentColors = state.cellColors[r][c]
      const nextColors = toggleColorInSelection(currentColors, colorId)
      if (currentColors.length === nextColors.length && currentColors.every((color, index) => color === nextColors[index])) return
      const boardHadAnyColors = hasAnyBrushColorsOnBoard(state.cellColors, state.candidateColors)
      pushHistory(state)
      const nextCellColors = cloneCellColors(state.cellColors)
      nextCellColors[r][c] = [...nextColors]
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, nextCellColors, state.candidateColors, !boardHadAnyColors, { r, c }, firstColorFlagEnabled,
      )
      state.cellColors = nextCellColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    applyCandidateBrushColor(state, action: PayloadAction<{ r: number; c: number; d: number; colorId: BrushColorId; firstColorFlagEnabled: boolean }>) {
      const { r, c, d, colorId, firstColorFlagEnabled } = action.payload
      if (!state.current) return
      if (state.cellColors[r][c].length > 0) return
      if (!state.notes[r][c].includes(d)) return
      const currentColors = state.candidateColors[r][c][d - 1]
      const nextColors = toggleColorInSelection(currentColors, colorId)
      if (currentColors.length === nextColors.length && currentColors.every((color, index) => color === nextColors[index])) return
      const boardHadAnyColors = hasAnyBrushColorsOnBoard(state.cellColors, state.candidateColors)
      pushHistory(state)
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      nextCandidateColors[r][c][d - 1] = [...nextColors]
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, state.cellColors, nextCandidateColors, !boardHadAnyColors, { r, c }, firstColorFlagEnabled,
      )
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    clearSelectedBrushColors(state) {
      if (!state.selected) return
      const { r, c } = state.selected
      const hasCellColor = state.cellColors[r][c].length > 0
      const hasCandidateColor = state.candidateColors[r][c].some(colors => colors.length > 0)
      if (!hasCellColor && !hasCandidateColor) return
      pushHistory(state)
      const nextCellColors = cloneCellColors(state.cellColors)
      nextCellColors[r][c] = []
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      nextCandidateColors[r][c] = emptyCandidateColorCell()
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, false,
      )
      state.cellColors = nextCellColors
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    clearAllColors(state) {
      const hasCellColors = state.cellColors.some(row => row.some(color => color.length > 0))
      const hasCandidateColors = state.candidateColors.some(row =>
        row.some(cell => cell.some(color => color.length > 0))
      )
      if (!hasCellColors && !hasCandidateColors) return
      pushHistory(state)
      state.flaggedColorCell = null
      state.cellColors = emptyCellColors()
      state.candidateColors = emptyCandidateColors()
    },

    clearAllNotes(state) {
      const hasNotes = state.notes.some(row => row.some(cell => cell.length > 0))
      if (!hasNotes) return
      pushHistory(state)
      state.notes = emptyNotes()
      const nextCandidateColors = emptyCandidateColors()
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, state.cellColors, nextCandidateColors, false, null, false,
      )
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    clearColorFromBoard(state, action: PayloadAction<BrushColorId>) {
      const colorId = action.payload
      const hasColor = state.cellColors.some(row => row.some(cell => cell.includes(colorId)))
        || state.candidateColors.some(row => row.some(cell => cell.some(candidate => candidate.includes(colorId))))
      if (!hasColor) return
      pushHistory(state)
      const nextCellColors: CellColorGrid = state.cellColors.map(row =>
        row.map(cell => cell.filter(c => c !== colorId))
      )
      const nextCandidateColors: CandidateColorGrid = state.candidateColors.map(row =>
        row.map(cell => cell.map(candidate => candidate.filter(c => c !== colorId)))
      )
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, false,
      )
      state.cellColors = nextCellColors
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    removeCandidate(state, action: PayloadAction<{ r: number; c: number; d: number }>) {
      const { r, c, d } = action.payload
      if (!state.notes[r][c].includes(d)) return
      pushHistory(state)
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      nextCandidateColors[r][c][d - 1] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, state.cellColors, nextCandidateColors, false, null, false,
      )
      const nextNotes = cloneNotes(state.notes)
      nextNotes[r][c] = nextNotes[r][c].filter(candidate => candidate !== d)
      state.notes = nextNotes
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    fillAllCandidates(state) {
      if (!state.current || !state.initial) return
      const remaining = computeRemaining(state.current)
      const hasFillableCell = state.current.some((row, r) =>
        row.some((n, c) => state.initial![r][c] === 0 && n === 0 && state.notes[r][c].length === 0)
      )
      if (!hasFillableCell) return

      pushHistory(state)
      const nextNotes = cloneNotes(state.notes)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.initial![r][c] !== 0 || state.current![r][c] !== 0 || nextNotes[r][c].length > 0) continue
          nextNotes[r][c] = getSimpleCandidates(state.current!, remaining, r, c)
        }
      }
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.initial![r][c] !== 0 || state.current![r][c] !== 0 || state.notes[r][c].length > 0) continue
          nextCandidateColors[r][c] = emptyCandidateColorCell()
        }
      }
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, state.cellColors, nextCandidateColors, false, null, false,
      )
      state.notes = nextNotes
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    applySingleCandidatesToDigits(state, action: PayloadAction<{ autoCheck: boolean; autoRemove: boolean }>) {
      const { autoCheck, autoRemove } = action.payload
      if (!state.current || !state.initial) return
      const hasSingleCandidate = state.current.some((row, r) =>
        row.some((n, c) => state.initial![r][c] === 0 && n === 0 && state.notes[r][c].length === 1)
      )
      if (!hasSingleCandidate) return

      pushHistory(state)
      const nextPuzzle = cloneGrid(state.current)
      const nextNotes = cloneNotes(state.notes)
      const nextCellColors = cloneCellColors(state.cellColors)
      const nextCandidateColors = cloneCandidateColors(state.candidateColors)
      const remaining = computeRemaining(nextPuzzle)
      let changed = false
      let keepPromoting = true

      while (keepPromoting) {
        keepPromoting = false
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (state.initial![r][c] !== 0 || nextPuzzle[r][c] !== 0 || nextNotes[r][c].length !== 1) continue
            const d = nextNotes[r][c][0]
            nextPuzzle[r][c] = d
            nextNotes[r][c] = []
            nextCellColors[r][c] = []
            nextCandidateColors[r][c] = emptyCandidateColorCell()
            remaining[d] = Math.max(0, remaining[d] - 1)

            const canValidateEntry = autoCheck && state.solution !== null
            const isCorrectEntry = state.solution !== null && d === state.solution[r][c]
            const shouldAutoRemove = autoRemove && (!canValidateEntry || isCorrectEntry)
            if (shouldAutoRemove) {
              removeCandidateFromPeers(nextNotes, nextCandidateColors, r, c, d)
            }

            changed = true
            keepPromoting = true
          }
        }
      }

      if (!changed) return
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        state.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, false,
      )
      state.candidateSelectedDigit = null
      state.current = nextPuzzle
      state.notes = nextNotes
      state.cellColors = nextCellColors
      state.candidateColors = nextCandidateColors
      state.flaggedColorCell = nextFlaggedColorCell
    },

    rehydrateFromStorage(state) {
      const saved = loadSaved()
      if (saved) {
        state.initial = saved.initial
        state.current = saved.current
        state.solution = saved.solution
        state.notes = saved.notes
        state.cellColors = saved.cellColors
        state.candidateColors = saved.candidateColors
        state.flaggedColorCell = saved.flaggedColorCell
        state.puzzleMetadata = saved.puzzleMetadata
      }
      state.elapsed = loadElapsed()
      state.won = loadCompleted()
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
  setFlaggedColorCell,
  setInitial,
  setSolution,
  setPuzzleMetadata,
  tickElapsed,
  setPaused,
  setManualPause,
  winGame,
  markWon,
  undo,
  redo,
  setSelected,
  selectCell,
  focusCell,
  moveSelection,
  setNotesMode,
  setEraserMode,
  setEraserColorPickerMode,
  setBrushMode,
  setCandidateToolMode,
  setHistoryToolMode,
  setMoreToolMode,
  setActiveBrushColor,
  setCandidateSelectedDigit,
  setShareCopied,
  setRequiredTechniquesOpen,
  setRequiredTechniquesLoading,
  setRequiredTechniquesResult,
  setRequiredTechniquesError,
  setExpandedTechniqueSteps,
  resetBoardUI,
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
  rehydrateFromStorage,
} = gameSlice.actions

export { hasCellBrushColorsAt, hasAnyBrushColorsOnBoard, resolveFlaggedColorCell, toggleColorInSelection, computeRemaining, getSimpleCandidates }

export default gameSlice.reducer
