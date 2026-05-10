import { useState } from 'react'
import { useStore } from 'react-redux'
import type { RootState } from '../../store'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  setCellColors,
  setCandidateColors,
  setFlaggedColorCell,
  setBrushMode,
  setDrawingMode,
  setCandidateToolMode,
  setHistoryToolMode,
  setActiveBrushColor,
  setActiveDrawingColor,
} from '../../store/gameSlice'
import {
  cloneCellColorsGrid,
  cloneCandidateColorsGrid,
  cloneFlaggedColorCell,
  resolveFlaggedColorCell,
  hasAnyBrushColorsOnBoard,
  hasCellBrushColorsAt,
  emptyCandidateColorCell,
  BRUSH_COLORS,
  DEFAULT_BRUSH_COLOR,
  type CandidateOverlayState,
} from './boardUtils'
import type { BrushColorId } from '../../store/gameTypes'
import type { CellColorGrid, CandidateColorGrid, FlaggedColorCell } from '../../utils/gameStorage'

export function useBrushPainting() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()

  const brushMode = useAppSelector(s => s.game.brushMode)
  const drawingMode = useAppSelector(s => s.game.drawingMode)
  const candidateToolMode = useAppSelector(s => s.game.candidateToolMode)
  const historyToolMode = useAppSelector(s => s.game.historyToolMode)
  const activeBrushColor = useAppSelector(s => s.game.activeBrushColor)
  const activeDrawingColor = useAppSelector(s => s.game.activeDrawingColor)
  const paintingScope = useAppSelector(s => s.settings.paintingScope)
  const firstColorFlag = useAppSelector(s => s.settings.firstColorFlag)

  const [candidateOverlay, setCandidateOverlay] = useState<CandidateOverlayState | null>(null)
  const [candidateOverlayPreviewDigit, setCandidateOverlayPreviewDigit] = useState<number | null>(null)
  const [candidateSelectedDigit, setCandidateSelectedDigit] = useState<number | null>(null)

  const candidateBrushMode = brushMode && (paintingScope ?? 'digit') === 'candidate'
  const firstColorFlagEnabled = firstColorFlag ?? false

  function closeCandidateOverlay(preserveSelectedDigit?: boolean) {
    setCandidateOverlay(null)
    setCandidateOverlayPreviewDigit(null)
    if (!preserveSelectedDigit) setCandidateSelectedDigit(null)
  }

  function getCandidateOverlayPosition(
    r: number, c: number, boardEl: HTMLElement | null, cells: NodeListOf<Element> | null
  ): { top: number; left: number; size: number } | null {
    if (!boardEl || !cells) return null
    const idx = r * 9 + c
    const cell = cells[idx] as HTMLElement | undefined
    if (!cell) return null
    const boardRect = boardEl.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const size = Math.min(cellRect.width, cellRect.height) * 0.22
    return {
      top: cellRect.top - boardRect.top + cellRect.height / 2,
      left: cellRect.left - boardRect.left + cellRect.width / 2,
      size: Math.max(size, 16),
    }
  }

  function getCandidateDigitFromPoint(
    r: number, c: number, clientX: number, clientY: number, boardRef: HTMLElement | null
  ): number | null {
    if (!boardRef || !candidateOverlay) return null
    const rect = boardRef.getBoundingClientRect()
    const cx = clientX - rect.left - candidateOverlay.left
    const cy = clientY - rect.top - candidateOverlay.top
    const cellSize = candidateOverlay.size
    const col = Math.floor((cx + cellSize * 1.5) / cellSize) - 1
    const row = Math.floor((cy + cellSize * 1.5) / cellSize) - 1
    if (col < 0 || col > 2 || row < 0 || row > 2) return null
    return row * 3 + col + 1
  }

  function openCandidateOverlay(r: number, c: number, boardEl: HTMLElement | null, cells: NodeListOf<Element> | null, mode: 'paint' | 'erase') {
    const pos = getCandidateOverlayPosition(r, c, boardEl, cells)
    if (!pos) return
    setCandidateOverlay({ r, c, ...pos, mode })
  }

  function applyCellBrushColorAt(r: number, c: number) {
    const g = store.getState().game
    const cellColors = g.cellColors
    const candidateColors = g.candidateColors
    const flaggedCell = g.flaggedColorCell

    const current = [...cellColors[r][c]]
    const next = current.includes(activeBrushColor)
      ? current.filter(color => color !== activeBrushColor)
      : [...current, activeBrushColor]

    const nextCellColors = cloneCellColorsGrid(cellColors)
    nextCellColors[r][c] = next
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColors)
    nextCandidateColors[r][c] = emptyCandidateColorCell()

    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedCell, nextCellColors, nextCandidateColors, true, { r, c }, firstColorFlagEnabled,
    )

    dispatch(setCellColors(nextCellColors))
    dispatch(setCandidateColors(nextCandidateColors))
    dispatch(setFlaggedColorCell(nextFlaggedColorCell))
  }

  function applyCandidateBrushColorAt(r: number, c: number, d: number) {
    const g = store.getState().game
    if (g.cellColors[r][c].length > 0) return false

    const current = [...g.candidateColors[r][c][d - 1]]
    const next = current.includes(activeBrushColor)
      ? current.filter(color => color !== activeBrushColor)
      : [...current, activeBrushColor]

    const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
    nextCandidateColors[r][c] = nextCandidateColors[r][c].map((colors, i) =>
      i === d - 1 ? next : colors
    )

    const nextFlaggedColorCell = resolveFlaggedColorCell(
      g.flaggedColorCell, cloneCellColorsGrid(g.cellColors), nextCandidateColors, true, { r, c }, firstColorFlagEnabled,
    )

    dispatch(setCandidateColors(nextCandidateColors))
    dispatch(setFlaggedColorCell(nextFlaggedColorCell))
    return true
  }

  function clearAllColors() {
    const g = store.getState().game
    const hasCellColors = g.cellColors.some(row => row.some(color => color.length > 0))
    const hasCandidateColors = g.candidateColors.some(row =>
      row.some(cell => cell.some(color => color.length > 0))
    )
    if (!hasCellColors && !hasCandidateColors) return

    const emptyCell = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as string[]))
    const emptyCand = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as string[]))
    )
    dispatch(setCellColors(emptyCell))
    dispatch(setCandidateColors(emptyCand))
    dispatch(setFlaggedColorCell(null))
  }

  function clearSelectedBrushColors(r: number, c: number) {
    const g = store.getState().game
    const nextCellColors = cloneCellColorsGrid(g.cellColors)
    nextCellColors[r][c] = []
    const nextCandidateColors = cloneCandidateColorsGrid(g.candidateColors)
    nextCandidateColors[r][c] = emptyCandidateColorCell()
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      g.flaggedColorCell, nextCellColors, nextCandidateColors, false, null, firstColorFlagEnabled,
    )
    dispatch(setCellColors(nextCellColors))
    dispatch(setCandidateColors(nextCandidateColors))
    dispatch(setFlaggedColorCell(nextFlaggedColorCell))
  }

  function applyBrushColor(colorId: BrushColorId) {
    if (drawingMode) {
      dispatch(setActiveDrawingColor(colorId))
    } else {
      dispatch(setActiveBrushColor(colorId))
    }
  }

  return {
    brushMode,
    drawingMode,
    candidateToolMode,
    historyToolMode,
    activeBrushColor,
    activeDrawingColor,
    candidateBrushMode,
    firstColorFlagEnabled,
    candidateOverlay,
    candidateOverlayPreviewDigit,
    candidateSelectedDigit,
    setBrushMode: (v: boolean) => dispatch(setBrushMode(v)),
    setDrawingMode: (v: boolean) => dispatch(setDrawingMode(v)),
    setCandidateToolMode: (v: boolean) => dispatch(setCandidateToolMode(v)),
    setHistoryToolMode: (v: boolean) => dispatch(setHistoryToolMode(v)),
    setCandidateOverlay,
    setCandidateOverlayPreviewDigit,
    setCandidateSelectedDigit,
    closeCandidateOverlay,
    openCandidateOverlay,
    getCandidateOverlayPosition,
    getCandidateDigitFromPoint,
    applyCellBrushColorAt,
    applyCandidateBrushColorAt,
    clearAllColors,
    clearSelectedBrushColors,
    applyBrushColor,
    hasAnyBrushColorsOnBoard: () => hasAnyBrushColorsOnBoard(
      store.getState().game.cellColors,
      store.getState().game.candidateColors,
    ),
    hasCellBrushColorsAt: (r: number, c: number) => hasCellBrushColorsAt(
      store.getState().game.cellColors,
      store.getState().game.candidateColors,
      r, c,
    ),
  }
}
