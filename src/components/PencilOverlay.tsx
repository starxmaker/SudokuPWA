import React, { useCallback, useEffect, useRef, useState } from 'react'
import { recognizeDigit } from 'browser-handwritten-digit-recognition'

type CellRect = { top: number; left: number; width: number; height: number }
type RecognizeState =
  | { type: 'idle' }
  | { type: 'recognizing' }
  | { type: 'low'; digit: number; confidence: number }
  | { type: 'failed' }

type Props = {
  cellRect: CellRect
  onDigit: (digit: number) => void
  onClose: () => void
  initialPointer?: { clientX: number; clientY: number; pointerId: number }
}

export default function PencilOverlay({ cellRect, onDigit, onClose, initialPointer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const hasStrokes = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recog, setRecog] = useState<RecognizeState>({ type: 'idle' })

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  const canvasW = Math.round(cellRect.width * dpr)
  const canvasH = Math.round(cellRect.height * dpr)

  const isDark = () => document.documentElement.classList.contains('dark')

  function fillBg() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    fillBg()
    if (initialPointer) {
      try { canvas.setPointerCapture(initialPointer.pointerId) } catch { /* pointer may have been released */ }
      isDrawing.current = true
      const ctx = canvas.getContext('2d')!
      const rect = canvas.getBoundingClientRect()
      const x = (initialPointer.clientX - rect.left) * (canvas.width / rect.width)
      const y = (initialPointer.clientY - rect.top) * (canvas.height / rect.height)
      ctx.strokeStyle = isDark() ? '#ffffff' : '#000000'
      ctx.lineWidth = cellRect.width * 0.15 * dpr
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close if window resizes (stale rect)
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('resize', handler, { once: true })
    return () => window.removeEventListener('resize', handler)
  }, [onClose])

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }
  useEffect(() => () => clearTimer(), [])

  function getXY(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const runRecognition = useCallback(async () => {
    if (!canvasRef.current || !hasStrokes.current) return
    setRecog({ type: 'recognizing' })
    try {
      const r = await recognizeDigit(canvasRef.current)
      if (r && r.confidence >= 0.75) {
        onDigit(r.digit)
        onClose()
      } else if (r) {
        setRecog({ type: 'low', digit: r.digit, confidence: r.confidence })
      } else {
        setRecog({ type: 'failed' })
      }
    } catch {
      setRecog({ type: 'failed' })
    }
  }, [onDigit, onClose])

  function resetCanvas() {
    clearTimer()
    fillBg()
    hasStrokes.current = false
    setRecog({ type: 'idle' })
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    canvasRef.current!.setPointerCapture(e.pointerId)
    isDrawing.current = true
    clearTimer()
    // Dismiss chip without clearing canvas — user continues drawing on top
    if (recog.type !== 'idle' && recog.type !== 'recognizing') {
      setRecog({ type: 'idle' })
    }
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getXY(e)
    ctx.strokeStyle = isDark() ? '#ffffff' : '#000000'
    ctx.lineWidth = cellRect.width * 0.15 * dpr
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getXY(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokes.current = true
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    e.preventDefault()
    isDrawing.current = false
    // If no moves yet (very quick stroke like "1"), stamp a dot at lift point
    if (!hasStrokes.current) {
      const ctx = canvasRef.current!.getContext('2d')!
      const { x, y } = getXY(e)
      ctx.fillStyle = isDark() ? '#ffffff' : '#000000'
      ctx.beginPath()
      ctx.arc(x, y, (ctx.lineWidth || cellRect.width * 0.15 * dpr) / 2, 0, Math.PI * 2)
      ctx.fill()
      hasStrokes.current = true
    }
    runRecognition()
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (hasStrokes.current) runRecognition()
  }

  // Position the chip above or below the cell
  const chipAbove = cellRect.top + cellRect.height > window.innerHeight * 0.6
  const chipTop = chipAbove ? cellRect.top - 44 : cellRect.top + cellRect.height + 6
  const chipLeft = Math.max(50, Math.min(window.innerWidth - 50, cellRect.left + cellRect.width / 2))
  const chipStyle: React.CSSProperties = {
    position: 'fixed',
    top: chipTop,
    left: chipLeft,
    transform: 'translateX(-50%)',
    zIndex: 210,
  }

  return (
    <>
      <div className="pencil-cell-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }} />

      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="pencil-cell-canvas"
        style={{
          position: 'fixed',
          top: cellRect.top,
          left: cellRect.left,
          width: cellRect.width,
          height: cellRect.height,
          touchAction: 'none',
          cursor: 'crosshair',
          zIndex: 201,
          background: 'transparent',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {recog.type === 'recognizing' && (
        <div className="pencil-chip" style={chipStyle}>
          <span className="pencil-chip-text">…</span>
        </div>
      )}

      {recog.type === 'low' && (
        <div className="pencil-chip pencil-chip--confirm" style={chipStyle}>
          <span className="pencil-chip-text">
            {recog.digit}
            <span className="pencil-chip-conf"> {Math.round(recog.confidence * 100)}%</span>
          </span>
          <button className="pencil-chip-btn pencil-chip-btn--ok" onClick={() => { onDigit(recog.digit); onClose() }}>✓</button>
          <button className="pencil-chip-btn pencil-chip-btn--retry" onClick={resetCanvas}>✗</button>
        </div>
      )}

      {recog.type === 'failed' && (
        <div className="pencil-chip pencil-chip--failed" style={chipStyle}>
          <span className="pencil-chip-text">?</span>
          <button className="pencil-chip-btn pencil-chip-btn--retry" onClick={resetCanvas}>retry</button>
        </div>
      )}
    </>
  )
}
