import { useState, useRef } from 'react'
import { useStore } from 'react-redux'
import type { RootState } from '../../store'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setDrawingStrokes } from '../../store/gameSlice'
import {
  cloneDrawingStrokesGrid,
  DRAWING_STROKE_WIDTH,
} from './boardUtils'
import type { DrawingStroke } from '../../utils/gameStorage'

function getDrawingPoint(e: React.PointerEvent<HTMLElement>): [number, number] {
  const rect = e.currentTarget.getBoundingClientRect()
  return [
    (e.clientX - rect.left) / rect.width,
    (e.clientY - rect.top) / rect.height,
  ]
}

export function useDrawing() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const drawingMode = useAppSelector(s => s.game.drawingMode)
  const drawingStrokes = useAppSelector(s => s.game.drawingStrokes)
  const [drawingDraft, setDrawingDraft] = useState<DrawingStroke | null>(null)
  const drawingDraftRef = useRef(drawingDraft)
  drawingDraftRef.current = drawingDraft
  const drawingPointerIdRef = useRef<number | null>(null)

  function startDrawing(e: React.PointerEvent<HTMLElement>) {
    if (!drawingMode) return
    e.preventDefault()
    drawingPointerIdRef.current = e.pointerId
    const color = store.getState().game.activeDrawingColor
    const point = getDrawingPoint(e)
    const stroke = DRAWING_STROKE_WIDTH
    setDrawingDraft({ color, points: [point], stroke } as DrawingStroke)
  }

  function moveDrawing(e: React.PointerEvent<HTMLElement>) {
    if (drawingPointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    if (!drawingDraftRef.current) return
    const next = [...drawingDraftRef.current.points, getDrawingPoint(e)]
    setDrawingDraft({ ...drawingDraftRef.current, points: next })
  }

  function stopDrawing(e: React.PointerEvent<HTMLElement>) {
    if (drawingPointerIdRef.current !== e.pointerId) return
    drawingPointerIdRef.current = null
    if (!drawingDraftRef.current) return
    const strokes = cloneDrawingStrokesGrid(store.getState().game.drawingStrokes)
    strokes.push(drawingDraftRef.current)
    dispatch(setDrawingStrokes(strokes))
    setDrawingDraft(null)
  }

  function cancelDrawing() {
    drawingPointerIdRef.current = null
    setDrawingDraft(null)
  }

  function clearAllDrawings() {
    const strokes = store.getState().game.drawingStrokes
    if (strokes.length === 0) return
    dispatch(setDrawingStrokes([]))
  }

  return {
    drawingStrokes,
    drawingDraft,
    startDrawing,
    moveDrawing,
    stopDrawing,
    cancelDrawing,
    clearAllDrawings,
    buildDrawingPolyline,
  }
}

function buildDrawingPolyline(stroke: DrawingStroke): string {
  if (stroke.points.length < 2) return ''
  const width = DRAWING_STROKE_WIDTH / 2
  const points = stroke.points.map(([x, y]) => `${(x - width) * 100},${(y - width) * 100}`)
  return points.join(' ')
}
