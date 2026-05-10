import React from 'react'
import { MdPlayArrow, MdPause } from 'react-icons/md'
import { COORDINATE_ROW_LABELS, COORDINATE_COLUMN_LABELS, DRAWING_STROKE_WIDTH } from './boardUtils'
import type { DrawingStroke } from '../../utils/gameStorage'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  children: React.ReactNode
  boardPixelWidth: number | null
  displayedDifficulty: string | null
  elapsed: number
  formatTime: (s: number) => string
  paused: boolean
  won: boolean
  pencilMode: boolean
  coordinateLabels: boolean
  drawingMode: boolean
  renderedDrawingStrokes: DrawingStroke[]
  buildDrawingPolyline: (points: readonly [number, number][]) => string
  startDrawing: (e: React.PointerEvent<SVGSVGElement>) => void
  moveDrawing: (e: React.PointerEvent<SVGSVGElement>) => void
  stopDrawing: (e: React.PointerEvent<SVGSVGElement>) => void
  cancelDrawing: () => void
  setManualPause: (v: boolean) => void
  setPaused: (v: boolean) => void
  boardRef: React.RefObject<HTMLDivElement | null>
  t: TFunc
}

export default function BoardArea({
  children, boardPixelWidth, displayedDifficulty, elapsed, formatTime,
  paused, won, pencilMode, coordinateLabels, drawingMode,
  renderedDrawingStrokes, buildDrawingPolyline,
  startDrawing, moveDrawing, stopDrawing, cancelDrawing,
  setManualPause, setPaused, boardRef, t,
}: Props) {
  return (
    <div className="board-area">
      <div className="board-column">
        <div className="timer-row" style={boardPixelWidth !== null ? { width: `${boardPixelWidth}px` } : undefined}>
          <span className="difficulty-label">{displayedDifficulty}</span>
          <div className="timer-group">
            <span className="timer-display">{formatTime(elapsed)}</span>
            <button type="button" className="timer-pause"
              aria-label={paused ? t('board.resume') : t('board.pause')}
              onClick={() => { setManualPause(!paused); setPaused(!paused) }}>
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
              {children}
              <svg
                className={`board-drawing-layer${drawingMode && !paused && !won ? ' board-drawing-layer--interactive' : ''}`}
                aria-label={t('board.freeDrawingCanvas')}
                viewBox="0 0 1 1" preserveAspectRatio="none"
                onPointerDown={startDrawing}
                onPointerMove={moveDrawing}
                onPointerUp={stopDrawing}
                onPointerCancel={cancelDrawing}
              >
                {renderedDrawingStrokes.map((stroke, index) =>
                  stroke.points.length === 1 ? (
                    <circle key={`drawing-stroke-${index}`} className="board-drawing-layer__stroke"
                      cx={stroke.points[0][0]} cy={stroke.points[0][1]} r={DRAWING_STROKE_WIDTH / 2} fill={stroke.color} />
                  ) : (
                    <polyline key={`drawing-stroke-${index}`} className="board-drawing-layer__stroke"
                      points={buildDrawingPolyline(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={DRAWING_STROKE_WIDTH} />
                  )
                )}
              </svg>
              {paused && !won && (
                <div className="board-pause-overlay">
                  <button type="button" className="board-pause-btn" aria-label={t('board.resume')}
                    onClick={() => { setManualPause(false); setPaused(false) }}>
                    <MdPlayArrow size={38} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
