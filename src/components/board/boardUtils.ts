import {
  cloneNotes,
  cloneCellColors as cloneCellColorsStorage,
  cloneCandidateColors as cloneCandidateColorsStorage,
  cloneFlaggedColorCell as cloneFlaggedColorCellStorage,
  type CellColorGrid,
  type CandidateColorGrid,
  type FlaggedColorCell,
} from '../../utils/gameStorage'
import type { Grid } from '../../utils/sudoku'
import type { BoardHistoryEntry, BrushColorId } from '../../store/gameTypes'

export function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

export function cloneNotesGrid(notes: number[][][]): number[][][] {
  return cloneNotes(notes)
}

export function cloneCellColorsGrid(colors: CellColorGrid): CellColorGrid {
  return cloneCellColorsStorage(colors)
}

export function cloneCandidateColorsGrid(colors: CandidateColorGrid): CandidateColorGrid {
  return cloneCandidateColorsStorage(colors)
}

export function cloneFlaggedColorCell(cell: FlaggedColorCell): FlaggedColorCell {
  return cloneFlaggedColorCellStorage(cell)
}

export function emptyCandidateColorCell(): string[][] {
  return Array.from({ length: 9 }, () => [] as string[])
}

export function hasCellBrushColorsAt(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  r: number,
  c: number,
) {
  return cellColors[r][c].length > 0 || candidateColors[r][c].some(colors => colors.length > 0)
}

export function hasAnyBrushColorsOnBoard(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
) {
  return (
    cellColors.some(row => row.some(color => color.length > 0)) ||
    candidateColors.some(row => row.some(cell => cell.some(color => color.length > 0)))
  )
}

export function resolveFlaggedColorCell(
  currentFlaggedColorCell: FlaggedColorCell,
  nextCellColors: CellColorGrid,
  nextCandidateColors: CandidateColorGrid,
  shouldAssignFirstFlag: boolean,
  targetCell: { r: number; c: number } | null,
  firstColorFlagEnabled: boolean,
): FlaggedColorCell {
  let nextFlaggedColorCell = cloneFlaggedColorCell(currentFlaggedColorCell)
  if (
    nextFlaggedColorCell !== null &&
    !hasCellBrushColorsAt(nextCellColors, nextCandidateColors, nextFlaggedColorCell.r, nextFlaggedColorCell.c)
  ) {
    nextFlaggedColorCell = null
  }
  if (
    nextFlaggedColorCell === null &&
    firstColorFlagEnabled &&
    shouldAssignFirstFlag &&
    targetCell !== null &&
    hasCellBrushColorsAt(nextCellColors, nextCandidateColors, targetCell.r, targetCell.c)
  ) {
    return { ...targetCell }
  }
  return nextFlaggedColorCell
}

export function makeHistoryEntry(
  puzzle: Grid,
  notes: number[][][],
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  flaggedColorCell: FlaggedColorCell,
): BoardHistoryEntry {
  return {
    puzzle: cloneGrid(puzzle),
    notes: cloneNotesGrid(notes),
    cellColors: cloneCellColorsGrid(cellColors),
    candidateColors: cloneCandidateColorsGrid(candidateColors),
    flaggedColorCell: cloneFlaggedColorCell(flaggedColorCell),
  }
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

export const COORDINATE_ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const

export const COORDINATE_COLUMN_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function toggleColorInSelection(current: readonly string[], colorId: BrushColorId) {
  return current.includes(colorId) ? current.filter(color => color !== colorId) : [...current, colorId]
}

export function buildBrushFill(colorIds: readonly string[]) {
  if (colorIds.length === 0) return undefined
  if (colorIds.length === 1) {
    const fill = BRUSH_COLOR_MAP[colorIds[0] as BrushColorId] ?? colorIds[0]
    return fill
  }
  const stops = colorIds.flatMap((colorId, index) => {
    const fill = BRUSH_COLOR_MAP[colorId as BrushColorId] ?? colorId
    const start = (index * 100) / colorIds.length
    const end = ((index + 1) * 100) / colorIds.length
    return [`${fill} ${start}%`, `${fill} ${end}%`]
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export type ToolTrayView = 'main' | 'notes' | 'brush'
export type ToolTrayTransition = {
  from: ToolTrayView
  to: ToolTrayView
  direction: 'forward' | 'backward'
}
export type LowerPadView = 'numbers' | 'colors'
export type LowerPadTransition = {
  from: LowerPadView
  to: LowerPadView
  direction: 'forward' | 'backward'
}
export type ToolTrayAnimatedTarget = Exclude<ToolTrayView, 'main'>
export type ToolTraySequenceDirection = 'forward' | 'backward'
export type ToolTraySequencePhase = 'fade-out' | 'move' | 'fade-in'
export type ToolTrayMover = {
  left: number
  top: number
  width: number
  height: number
  deltaX: number
  deltaY: number
}
export type ToolTraySequence = {
  target: ToolTrayAnimatedTarget
  direction: ToolTraySequenceDirection
  phase: ToolTraySequencePhase
  mover: ToolTrayMover
  moveActive: boolean
}
export type CandidateOverlayState = {
  r: number
  c: number
  top: number
  left: number
  size: number
  mode: 'paint' | 'erase'
}

const IS_TEST_MODE = import.meta.env.MODE === 'test'

export const TOOL_TRAY_ANIMATION_MS = 280
export const TOOL_TRAY_FADE_MS =
  IS_TEST_MODE ? 0 : 240
export const TOOL_TRAY_MOVE_MS =
  IS_TEST_MODE ? 0 : 320
export const TOOL_TRAY_REVEAL_MS =
  IS_TEST_MODE ? 0 : 300
export const TOOL_TRAY_STAGE_GAP_MS =
  IS_TEST_MODE ? 0 : 80
export const ENABLE_STAGED_TOOL_ANIMATION =
  !IS_TEST_MODE

export function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
