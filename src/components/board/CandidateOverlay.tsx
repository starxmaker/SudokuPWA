import React from 'react'
import type { CandidateOverlayState } from './boardUtils'
import type { CandidateColorGrid } from '../../utils/gameStorage'
import { buildBrushFill } from './boardUtils'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  overlay: CandidateOverlayState
  cellNotes: number[]
  candidateColors: CandidateColorGrid
  overlayHasCellColor: boolean
  onClose: (preserveSelectedDigit?: boolean) => void
  onSetPreviewDigit: (d: number | null) => void
  onSelectDigit: (d: number) => void
  onRemoveCandidate: (r: number, c: number, d: number) => boolean
  onApplyCandidateBrushColor: (r: number, c: number, d: number) => boolean
  haptic: boolean
  onTriggerHaptic?: () => void
  t: TFunc
}

export default function CandidateOverlay({
  overlay, cellNotes, candidateColors, overlayHasCellColor,
  onClose, onSetPreviewDigit, onSelectDigit,
  onRemoveCandidate, onApplyCandidateBrushColor,
  haptic, onTriggerHaptic, t,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="brush-candidate-backdrop"
        aria-label={overlay.mode === 'erase' ? t('board.closeCandidateEraser') : t('board.closeCandidatePainter')}
        onClick={() => onClose()}
      />
      <div
        className="brush-candidate-overlay"
        role="dialog"
        aria-label={overlay.mode === 'erase' ? t('board.candidateEraser') : t('board.candidatePainter')}
        style={{
          top: `${overlay.top}px`,
          left: `${overlay.left}px`,
          width: `${overlay.size}px`,
          height: `${overlay.size}px`,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
          const hasCandidate = cellNotes.includes(d)
          const colorIds = candidateColors[overlay.r][overlay.c][d - 1]
          const canPreviewCandidate = hasCandidate && overlay.mode === 'paint' && !overlayHasCellColor
          return (
            <button
              key={d}
              type="button"
              className={`brush-candidate-button${hasCandidate ? '' : ' brush-candidate-button--empty'}`}
              aria-label={hasCandidate
                ? (overlay.mode === 'erase'
                  ? t('board.eraseCandidate', { digit: d })
                  : t('board.paintCandidate', { digit: d }))
                : t('board.candidateUnavailable', { digit: d })}
              disabled={!hasCandidate || (overlay.mode === 'paint' && overlayHasCellColor)}
              onPointerMove={() => {
                if (canPreviewCandidate) onSetPreviewDigit(d)
              }}
              onPointerDown={() => {
                if (canPreviewCandidate) onSetPreviewDigit(d)
              }}
              onClick={() => {
                const changed = overlay.mode === 'erase'
                  ? onRemoveCandidate(overlay.r, overlay.c, d)
                  : onApplyCandidateBrushColor(overlay.r, overlay.c, d)
                if (changed) {
                  if (overlay.mode === 'erase') {
                    onClose()
                  } else {
                    onSelectDigit(d)
                    onClose(true)
                  }
                  if (haptic) onTriggerHaptic?.()
                }
              }}
              style={colorIds.length > 0
                ? ({ '--annotation-color': buildBrushFill(colorIds) } as React.CSSProperties)
                : undefined}
            >
              {hasCandidate ? d : ''}
            </button>
          )
        })}
      </div>
    </>
  )
}
