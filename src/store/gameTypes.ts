import type { Grid } from '../utils/sudoku_types'
import type {
  CellColorGrid,
  CandidateColorGrid,
  DrawingStroke,
  DrawingStrokes,
  FlaggedColorCell,
  PuzzleMetadata,
} from '../utils/gameStorage'

export type BrushColorId = 'rose' | 'orange' | 'amber' | 'lime' | 'emerald' | 'sky' | 'violet' | 'pink'

export type BoardHistoryEntry = {
  puzzle: Grid
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  drawingStrokes: DrawingStroke[]
  flaggedColorCell: FlaggedColorCell
}
