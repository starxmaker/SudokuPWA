import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useStore } from 'react-redux'
import type { RootState } from '../../store'
import {
  setCurrent,
  setNotes,
  setCellColors,
  setCandidateColors,
  setFlaggedColorCell,
  setNotesMode,
  setEraserMode,
  setSelected,
  startNewGame,
  handleRetry,
} from '../../store/gameSlice'
import {
  cloneGrid,
  cloneNotesGrid,
  cloneCellColorsGrid,
  cloneCandidateColorsGrid,
  cloneFlaggedColorCell,
  emptyCandidateColorCell,
  resolveFlaggedColorCell,
} from './boardUtils'
import type { Grid } from '../../utils/sudoku'
import type { CellColorGrid, CandidateColorGrid, DrawingStroke } from '../../utils/gameStorage'
import { generateGame } from '../../utils/sudoku'
import { encodeGrid } from '../../utils/gameStorage'

function emptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))
}

function getSimpleCandidates(grid: Grid, r: number, c: number): number[] {
  const seen = new Set<number>()
  for (let i = 0; i < 9; i++) {
    if (grid[r][i]) seen.add(grid[r][i])
    if (grid[i][c]) seen.add(grid[i][c])
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (grid[rr][cc]) seen.add(grid[rr][cc])
    }
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !seen.has(d))
}

export function useGameInput() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()

  const current = useAppSelector(s => s.game.current)
  const initial = useAppSelector(s => s.game.initial)
  const solution = useAppSelector(s => s.game.solution)
  const notes = useAppSelector(s => s.game.notes)
  const selected = useAppSelector(s => s.game.selected)
  const notesMode = useAppSelector(s => s.game.notesMode)
  const eraserMode = useAppSelector(s => s.game.eraserMode)
  const autoCheck = useAppSelector(s => s.settings.autoCheck)
  const autoRemove = useAppSelector(s => s.settings.autoRemove)
  const pencilMode = useAppSelector(s => s.settings.pencilMode)
  const firstColorFlag = useAppSelector(s => s.settings.firstColorFlag)
  const brushMode = useAppSelector(s => s.game.brushMode)
  const paintingScope = useAppSelector(s => s.settings.paintingScope)
  const candidateBrushMode = brushMode && paintingScope === 'candidate'

  function isClue(r: number, c: number): boolean {
    return initial !== null && initial[r][c] !== 0
  }

  function selectCell(r: number, c: number) {
    const s = store.getState().game.selected
    dispatch(setSelected(s?.r === r && s?.c === c ? null : { r, c }))
  }

  function setValue(r: number, c: number, value: number) {
    if (!current || current.length !== 9) return
    const copy = current.map(row => [...row])
    copy[r][c] = value
    dispatch(setCurrent(copy))
  }

  function applyDigit(r: number, c: number, d: number) {
    if (!current || current.length !== 9) return false
    const g = store.getState().game
    const firstColorFlagEnabled = firstColorFlag ?? false

    if (notesMode || eraserMode || candidateBrushMode) {
      if (eraserMode) {
        if (g.cellColors[r][c].length > 0) {
          return false
        }
        if (!g.notes[r][c].includes(d)) return false

        const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
        nextCandidateColors[r][c][d - 1] = []

        dispatch(setCandidateColors(nextCandidateColors))
        dispatch(setFlaggedColorCell(resolveFlaggedColorCell(
          g.flaggedColorCell, cloneCellColorsGrid(g.cellColors),
          nextCandidateColors, false, null, firstColorFlagEnabled,
        )))

        const nextNotes = cloneNotesGrid(g.notes)
        const cell = nextNotes[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0) cell.splice(idx, 1)
        dispatch(setNotes(nextNotes))
        return false
      }

      if (candidateBrushMode) {
        const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
        nextCandidateColors[r][c][d - 1] = []
        const nextFlaggedColorCell = resolveFlaggedColorCell(
          g.flaggedColorCell, cloneCellColorsGrid(g.cellColors),
          nextCandidateColors, false, null, firstColorFlagEnabled,
        )
        dispatch(setCandidateColors(nextCandidateColors))
        dispatch(setFlaggedColorCell(nextFlaggedColorCell))

        const nextNotes = cloneNotesGrid(g.notes)
        const cell = nextNotes[r][c]
        const idx = cell.indexOf(d)
        if (pencilMode) {
          if (idx < 0) cell.push(d)
        } else {
          if (idx >= 0) cell.splice(idx, 1)
          else cell.push(d)
        }
        dispatch(setNotes(nextNotes))
      } else {
        const canValidate = autoCheck && solution !== null
        const isCorrect = solution !== null && d === solution[r][c]
        const shouldAutoRemove = autoRemove && (!canValidate || isCorrect)

        const nextNotes = cloneNotesGrid(g.notes)
        nextNotes[r][c] = []
        if (shouldAutoRemove) {
          const boxR = Math.floor(r / 3) * 3
          const boxC = Math.floor(c / 3) * 3
          for (let i = 0; i < 9; i++) {
            if (nextNotes[r][i].length) nextNotes[r][i] = nextNotes[r][i].filter(n => n !== d)
            if (nextNotes[i][c].length) nextNotes[i][c] = nextNotes[i][c].filter(n => n !== d)
          }
          for (let br = boxR; br < boxR + 3; br++) {
            for (let bc = boxC; bc < boxC + 3; bc++) {
              if (nextNotes[br][bc].length) nextNotes[br][bc] = nextNotes[br][bc].filter(n => n !== d)
            }
          }
        }

        const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
        nextCandidateColors[r][c] = emptyCandidateColorCell()
        if (shouldAutoRemove) {
          const boxR = Math.floor(r / 3) * 3
          const boxC = Math.floor(c / 3) * 3
          for (let i = 0; i < 9; i++) {
            nextCandidateColors[r][i][d - 1] = []
            nextCandidateColors[i][c][d - 1] = []
          }
          for (let br = boxR; br < boxR + 3; br++) {
            for (let bc = boxC; bc < boxC + 3; bc++) {
              nextCandidateColors[br][bc][d - 1] = []
            }
          }
        }

        const nextCellColors = cloneCellColorsGrid(g.cellColors)
        nextCellColors[r][c] = []
        const nextFlaggedColorCell = resolveFlaggedColorCell(
          g.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, firstColorFlagEnabled,
        )

        dispatch(setNotes(nextNotes))
        dispatch(setCandidateColors(nextCandidateColors))
        dispatch(setCellColors(nextCellColors))
        dispatch(setFlaggedColorCell(nextFlaggedColorCell))
        setValue(r, c, d)

        if (autoCheck && solution !== null && d !== solution[r][c]) {
          return true
        }
      }
      return false
    } else {
      const canValidate = autoCheck && solution !== null
      const isCorrect = solution !== null && d === solution[r][c]
      const shouldAutoRemove = autoRemove && (!canValidate || isCorrect)

      const nextNotes = cloneNotesGrid(g.notes)
      nextNotes[r][c] = []
      if (shouldAutoRemove) {
        const boxR = Math.floor(r / 3) * 3
        const boxC = Math.floor(c / 3) * 3
        for (let i = 0; i < 9; i++) {
          if (nextNotes[r][i].length) nextNotes[r][i] = nextNotes[r][i].filter(n => n !== d)
          if (nextNotes[i][c].length) nextNotes[i][c] = nextNotes[i][c].filter(n => n !== d)
        }
        for (let br = boxR; br < boxR + 3; br++) {
          for (let bc = boxC; bc < boxC + 3; bc++) {
            if (nextNotes[br][bc].length) nextNotes[br][bc] = nextNotes[br][bc].filter(n => n !== d)
          }
        }
      }

      const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
      nextCandidateColors[r][c] = emptyCandidateColorCell()
      if (shouldAutoRemove) {
        const boxR = Math.floor(r / 3) * 3
        const boxC = Math.floor(c / 3) * 3
        for (let i = 0; i < 9; i++) {
          nextCandidateColors[r][i][d - 1] = []
          nextCandidateColors[i][c][d - 1] = []
        }
        for (let br = boxR; br < boxR + 3; br++) {
          for (let bc = boxC; bc < boxC + 3; bc++) {
            nextCandidateColors[br][bc][d - 1] = []
          }
        }
      }

      const nextCellColors = cloneCellColorsGrid(g.cellColors)
      nextCellColors[r][c] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        g.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, firstColorFlagEnabled,
      )

      dispatch(setNotes(nextNotes))
      dispatch(setCandidateColors(nextCandidateColors))
      dispatch(setCellColors(nextCellColors))
      dispatch(setFlaggedColorCell(nextFlaggedColorCell))
      setValue(r, c, d)

      if (autoCheck && solution !== null && d !== solution[r][c]) {
        return true
      }
    }
    return false
  }

  function clearCell(r: number, c: number) {
    if (!current || current.length !== 9) return false
    if (isClue(r, c)) return false
    const g = store.getState().game

    const nextCellColors = cloneCellColorsGrid(g.cellColors)
    nextCellColors[r][c] = []
    const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
    nextCandidateColors[r][c] = emptyCandidateColorCell()
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      g.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, firstColorFlag ?? false,
    )

    dispatch(setCellColors(nextCellColors))
    dispatch(setCandidateColors(nextCandidateColors))
    dispatch(setFlaggedColorCell(nextFlaggedColorCell))
    setValue(r, c, 0)
    return true
  }

  function fillAllCandidates(currentGrid: Grid) {
    const nextNotes = cloneNotesGrid(store.getState().game.notes)
    let changed = false
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (isClue(r, c) || currentGrid[r][c] !== 0 || nextNotes[r][c].length > 0) continue
        const candidates = getSimpleCandidates(currentGrid, r, c)
        nextNotes[r][c] = candidates
        changed = true
      }
    }
    if (!changed) return false
    dispatch(setNotes(nextNotes))
    return true
  }

  function fillCandidates(currentGrid: Grid, r: number, c: number) {
    if (isClue(r, c) || (currentGrid[r][c] !== 0)) return false
    const nextNotes = cloneNotesGrid(store.getState().game.notes)
    nextNotes[r][c] = getSimpleCandidates(currentGrid, r, c)
    dispatch(setNotes(nextNotes))
    return true
  }

  async function newGame() {
    const { puzzle: p, solution: s } = await generateGame()
    const initial = cloneGrid(p)
    dispatch(startNewGame({ initial, current: p, solution: s, puzzleMetadata: store.getState().game.puzzleMetadata }))
  }

  function retry() {
    if (!initial) return
    dispatch(handleRetry())
  }

  return {
    current: current ?? [],
    initial,
    solution,
    notes,
    selected,
    notesMode,
    eraserMode,
    isClue,
    selectCell,
    setValue,
    applyDigit,
    clearCell,
    fillAllCandidates,
    fillCandidates,
    newGame,
    retry,
    setNotesMode: (v: boolean) => dispatch(setNotesMode(v)),
    setEraserMode: (v: boolean) => dispatch(setEraserMode(v)),
  }
}
