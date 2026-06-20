import React from 'react'
import type { CandidateColorGrid, CellColorGrid } from '../../utils/gameStorage'
import type { Grid } from '../../utils/sudoku'
import { buildBrushFill } from './boardUtils'

type SelectedCell = { r: number; c: number }
type CandidateOverlayMode = 'paint' | 'erase'
type PencilOverlayPointer = { clientX: number; clientY: number; pointerId: number }

type Props = {
  internalPuzzle: Grid
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  solutionGrid: Grid | null
  selected: SelectedCell | null
  highlightedDigit: number
  activeFlaggedColorCell: SelectedCell | null
  paused: boolean
  won: boolean
  autoCheck?: boolean
  brushMode: boolean
  eraserMode: boolean
  pencilMode?: boolean
  candidateBrushMode: boolean
  haptic?: boolean
  isClue: (r: number, c: number) => boolean
  clearCellAt: (r: number, c: number) => boolean
  removeCandidateAt: (r: number, c: number, d: number) => boolean
  openCandidateOverlay: (
    r: number,
    c: number,
    target: HTMLElement,
    mode?: CandidateOverlayMode,
  ) => boolean
  applyCandidateBrushColorAt: (r: number, c: number, d: number) => boolean
  applyCellBrushColorAt: (r: number, c: number) => boolean
  closeCandidateOverlay: () => void
  selectCell: (r: number, c: number) => void
  focusCell: (r: number, c: number) => void
  setCandidateSelectedDigit: React.Dispatch<React.SetStateAction<number | null>>
  openPencilOverlay: (
    r: number,
    c: number,
    target: HTMLButtonElement,
    initialPointer: PencilOverlayPointer,
  ) => void
  onTriggerHaptic?: () => void
}

function getCandidateDigitFromPoint(rect: DOMRect, clientX: number, clientY: number) {
  const relX = clientX - rect.left
  const relY = clientY - rect.top
  const noteCol = Math.min(2, Math.max(0, Math.floor(relX / (rect.width / 3))))
  const noteRow = Math.min(2, Math.max(0, Math.floor(relY / (rect.height / 3))))
  return noteRow * 3 + noteCol + 1
}

export default function BoardGrid({
  internalPuzzle,
  notes,
  cellColors,
  candidateColors,
  solutionGrid,
  selected,
  highlightedDigit,
  activeFlaggedColorCell,
  paused,
  won,
  autoCheck,
  brushMode,
  eraserMode,
  pencilMode,
  candidateBrushMode,
  haptic,
  isClue,
  clearCellAt,
  removeCandidateAt,
  openCandidateOverlay,
  applyCandidateBrushColorAt,
  applyCellBrushColorAt,
  closeCandidateOverlay,
  selectCell,
  focusCell,
  setCandidateSelectedDigit,
  openPencilOverlay,
  onTriggerHaptic,
}: Props) {
  const cells = [] as React.ReactNode[]

  for (let r = 0; r < internalPuzzle.length; r++) {
    const row = internalPuzzle[r]
    for (let c = 0; c < row.length; c++) {
      const n = row[c]
      const clue = isClue(r, c)
      const userEntry = !clue && n !== 0
      const selectedHere = selected?.r === r && selected?.c === c
      const sameDigit =
        highlightedDigit !== 0 &&
        n === highlightedDigit &&
        !selectedHere
      const inCross =
        selected !== null &&
        !selectedHere &&
        !sameDigit &&
        (r === selected.r || c === selected.c ||
          (Math.floor(r / 3) === Math.floor(selected.r / 3) && Math.floor(c / 3) === Math.floor(selected.c / 3)))
      const isError = autoCheck && solutionGrid !== null && userEntry && n !== solutionGrid[r][c]
      const cellNotes = notes[r][c]
      const hasNotes = cellNotes.length > 0 && n === 0
      const cellColorIds = cellColors[r][c]
      const flaggedHere = activeFlaggedColorCell?.r === r && activeFlaggedColorCell?.c === c
      const selectedClass = !paused && selectedHere
        ? (brushMode ? 'selected-brush' : 'selected')
        : ''

      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          role="gridcell"
          tabIndex={0}
          aria-selected={selectedHere}
          aria-disabled={clue}
          className={`cell ${clue ? 'given' : ''} ${!paused && userEntry ? 'user' : ''} ${selectedClass} ${!paused && sameDigit ? 'same-digit' : ''} ${!paused && inCross ? 'cross' : ''} ${!paused && isError ? 'error' : ''}`}
          onPointerDown={(e) => {
            if (eraserMode && !clue && !paused && !won) {
              e.preventDefault()
              if (pencilMode) {
                if (internalPuzzle[r][c] !== 0) {
                  if (haptic) onTriggerHaptic?.()
                  clearCellAt(r, c)
                } else if (cellNotes.length > 0) {
                  closeCandidateOverlay()
                  focusCell(r, c)
                  const digit = getCandidateDigitFromPoint(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY)
                  const changed = removeCandidateAt(r, c, digit)
                  if (changed && haptic) onTriggerHaptic?.()
                  if (!changed) {
                    setCandidateSelectedDigit(null)
                  }
                }
              } else if (internalPuzzle[r][c] === 0 && cellNotes.length > 0) {
                const opened = openCandidateOverlay(r, c, e.currentTarget, 'erase')
                if (opened && haptic) onTriggerHaptic?.()
              } else {
                if (haptic) onTriggerHaptic?.()
                clearCellAt(r, c)
              }
              return
            }

            if (pencilMode && brushMode && !paused && !won) {
              e.preventDefault()
              closeCandidateOverlay()
              focusCell(r, c)
              const changed = candidateBrushMode
                ? (() => {
                    if (internalPuzzle[r][c] !== 0) return false
                    const digit = getCandidateDigitFromPoint(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY)
                    if (!cellNotes.includes(digit)) return false
                    const painted = applyCandidateBrushColorAt(r, c, digit)
                    if (painted) setCandidateSelectedDigit(digit)
                    return painted
                  })()
                : (() => {
                    setCandidateSelectedDigit(null)
                    return applyCellBrushColorAt(r, c)
                  })()
              if (changed && haptic) onTriggerHaptic?.()
              return
            }

            if (pencilMode && !brushMode && !paused && !won) {
              e.preventDefault()
              if (haptic) onTriggerHaptic?.()
              if (!clue && internalPuzzle[r][c] === 0) {
                openPencilOverlay(r, c, e.currentTarget, {
                  clientX: e.clientX,
                  clientY: e.clientY,
                  pointerId: e.pointerId,
                })
              } else {
                selectCell(r, c)
              }
            }
          }}
          onClick={(e) => {
            if (pencilMode) return
            if (eraserMode) return
            if (brushMode) {
              setCandidateSelectedDigit(null)
              focusCell(r, c)
              const changed = candidateBrushMode
                ? openCandidateOverlay(r, c, e.currentTarget)
                : (() => {
                    closeCandidateOverlay()
                    return applyCellBrushColorAt(r, c)
                  })()
              if (changed && haptic) onTriggerHaptic?.()
              return
            }
            if (haptic) onTriggerHaptic?.()
            selectCell(r, c)
          }}
        >
          {!paused && flaggedHere && <span className="cell-flag-border" />}
          {cellColorIds.length > 0 && (
            <span
              className="cell-color-layer"
              style={{ '--annotation-color': buildBrushFill(cellColorIds) } as React.CSSProperties}
            />
          )}
          {hasNotes ? (
            <div className="cell-notes">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                <span
                  key={d}
                  className={`cell-note${highlightedDigit !== 0 && cellNotes.includes(d) && d === highlightedDigit ? ' cell-note--highlight' : ''}${cellNotes.includes(d) && candidateColors[r][c][d - 1].length > 0 ? ' cell-note--colored' : ''}`}
                  style={cellNotes.includes(d) && candidateColors[r][c][d - 1].length > 0
                    ? ({ '--annotation-color': buildBrushFill(candidateColors[r][c][d - 1]) } as React.CSSProperties)
                    : undefined}
                >
                  {cellNotes.includes(d) ? d : ''}
                </span>
              ))}
            </div>
          ) : (
            <span className="cell-value">{n === 0 ? '\u00a0' : n}</span>
          )}
        </button>,
      )
    }
  }

  return <>{cells}</>
}
