import React from 'react'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import type { DrawingStroke } from '../../utils/gameStorage'
import {
  COORDINATE_COLUMN_LABELS,
  COORDINATE_ROW_LABELS,
  DRAWING_STROKE_WIDTH,
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
  coordinateLabels?: boolean
  boardRef: React.MutableRefObject<HTMLDivElement | null>
  cells: React.ReactNode[]
  drawingMode: boolean
  renderedDrawingStrokes: DrawingStroke[]
  onTogglePause: () => void
  onResume: () => void
  startDrawing: React.PointerEventHandler<SVGSVGElement>
  moveDrawing: React.PointerEventHandler<SVGSVGElement>
  stopDrawing: React.PointerEventHandler<SVGSVGElement>
  cancelDrawing: React.PointerEventHandler<SVGSVGElement>
  t: TFunc
}

function buildDrawingPolyline(points: readonly [number, number][]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
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
  cells,
  drawingMode,
  renderedDrawingStrokes,
  onTogglePause,
  onResume,
  startDrawing,
  moveDrawing,
  stopDrawing,
  cancelDrawing,
  t,
}: Props) {
  return (
    <div className="game-main">
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
            <div className={`board-shell${coordinateLabels ? ' board-shell--with-coordinates' : ''}`}>
              {coordinateLabels && <div className="board-coordinate-corner" aria-hidden="true" />}
              {coordinateLabels && (
                <div className="board-coordinate-columns" aria-hidden="true" data-testid="board-coordinate-columns">
                  {COORDINATE_COLUMN_LABELS.map(label => (
                    <span key={label} className="board-coordinate-label">{label}</span>
                  ))}
                </div>
              )}
              {coordinateLabels && (
                <div className="board-coordinate-rows" aria-hidden="true" data-testid="board-coordinate-rows">
                  {COORDINATE_ROW_LABELS.map(label => (
                    <span key={label} className="board-coordinate-label">{label}</span>
                  ))}
                </div>
              )}
              <div ref={boardRef} className={`board${paused ? ' board--paused' : ''}`} role="grid" aria-label={t('board.gridLabel')}>
                {cells}
                <svg
                  className={`board-drawing-layer${drawingMode && !paused && !won ? ' board-drawing-layer--interactive' : ''}`}
                  aria-label={t('board.freeDrawingCanvas')}
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                  onPointerDown={startDrawing}
                  onPointerMove={moveDrawing}
                  onPointerUp={stopDrawing}
                  onPointerCancel={cancelDrawing}
                >
                  {renderedDrawingStrokes.map((stroke, index) =>
                    stroke.points.length === 1 ? (
                      <circle
                        key={`drawing-stroke-${index}`}
                        className="board-drawing-layer__stroke"
                        cx={stroke.points[0][0]}
                        cy={stroke.points[0][1]}
                        r={DRAWING_STROKE_WIDTH / 2}
                        fill={stroke.color}
                      />
                    ) : (
                      <polyline
                        key={`drawing-stroke-${index}`}
                        className="board-drawing-layer__stroke"
                        points={buildDrawingPolyline(stroke.points)}
                        fill="none"
                        stroke={stroke.color}
                        strokeWidth={DRAWING_STROKE_WIDTH}
                      />
                    )
                  )}
                </svg>
                <PauseOverlay paused={paused} won={won} onResume={onResume} t={t} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
