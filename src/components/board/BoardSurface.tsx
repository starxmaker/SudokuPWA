import React from 'react'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import { getCoordinateLabelSets, type CoordinateLabelMode } from '../../utils/coordinateLabels'
import {
  formatTime,
} from './boardUtils'
import PauseOverlay from './PauseOverlay'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  displayedDifficulty: string
  boardPixelWidth: number | null
  elapsed: number
  paused: boolean
  won: boolean
  pencilMode?: boolean
  coordinateLabels?: CoordinateLabelMode
  boardRef: React.MutableRefObject<HTMLDivElement | null>
  children: React.ReactNode
  onTogglePause: () => void
  onResume: () => void
  t: TFunc
}

export default function BoardSurface({
  displayedDifficulty,
  boardPixelWidth,
  elapsed,
  paused,
  won,
  pencilMode,
  coordinateLabels,
  boardRef,
  children,
  onTogglePause,
  onResume,
  t,
}: Props) {
  const { rowLabels, columnLabels } = getCoordinateLabelSets(coordinateLabels ?? 'none')
  const showCoordinateLabels = rowLabels !== null && columnLabels !== null

  return (
    <div className="board-area">
      <div className="board-column">
        <div className="timer-row" style={boardPixelWidth !== null ? { width: `${boardPixelWidth}px` } : undefined}>
          <span className="difficulty-label">{displayedDifficulty}</span>
          <div className="timer-group">
            <span className="timer-display">
              {formatTime(elapsed)}
            </span>
            <button
              type="button"
              className="timer-pause"
              aria-label={paused ? t('board.resume') : t('board.pause')}
              onClick={onTogglePause}
            >
              {paused ? <MdPlayArrow size={22} /> : <MdPause size={22} />}
            </button>
          </div>
        </div>
        <div className="board-wrapper" style={pencilMode ? ({ '--board-safe-space': '140px' } as React.CSSProperties) : undefined}>
          <div className={`board-shell${showCoordinateLabels ? ' board-shell--with-coordinates' : ''}`}>
            {showCoordinateLabels && <div className="board-coordinate-corner" aria-hidden="true" />}
            {showCoordinateLabels && (
              <div className="board-coordinate-columns" aria-hidden="true" data-testid="board-coordinate-columns">
                {columnLabels.map(label => (
                  <span key={label} className="board-coordinate-label">{label}</span>
                ))}
              </div>
            )}
            {showCoordinateLabels && (
              <div className="board-coordinate-rows" aria-hidden="true" data-testid="board-coordinate-rows">
                {rowLabels.map(label => (
                  <span key={label} className="board-coordinate-label">{label}</span>
                ))}
              </div>
            )}
            <div ref={boardRef} className={`board${paused ? ' board--paused' : ''}`} role="grid" aria-label={t('board.gridLabel')}>
              {children}
              <PauseOverlay paused={paused} won={won} onResume={onResume} t={t} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
