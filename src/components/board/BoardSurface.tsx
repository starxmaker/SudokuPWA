import React from 'react'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import type { DrawingStroke } from '../../utils/gameStorage'
import { getCoordinateLabelSets, type CoordinateLabelMode } from '../../utils/coordinateLabels'
import {
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
  coordinateLabels?: CoordinateLabelMode
  boardRef: React.MutableRefObject<HTMLDivElement | null>
  children: React.ReactNode
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
  children,
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
  )
}
