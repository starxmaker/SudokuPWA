import React, { useEffect, useState } from 'react'
import { MdUndo } from 'react-icons/md'
import { FaEraser } from 'react-icons/fa'
import { FcOk } from 'react-icons/fc'
import { type Grid, validateCreatedPuzzle } from '../utils/sudoku'
import { type VerifiedPuzzle, verifyPuzzle } from '../utils/generators/hodoku'
import PencilOverlay from './PencilOverlay'

type Props = {
  onStart: (puzzle: Grid, verified: VerifiedPuzzle) => void
  coordinateLabels?: boolean
  initialGrid?: Grid
  pencilMode?: boolean
  haptic?: boolean
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
}

const EMPTY_GRID: Grid = Array.from({ length: 9 }, () => Array(9).fill(0))
const COORDINATE_ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const
const COORDINATE_COLUMN_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row])
}

export default function PuzzleCreator({
  onStart,
  coordinateLabels = false,
  initialGrid,
  pencilMode = false,
  haptic,
  onTriggerHaptic,
  onTriggerErrorHaptic,
}: Props) {
  const [grid, setGrid] = useState<Grid>(() => initialGrid ? cloneGrid(initialGrid) : cloneGrid(EMPTY_GRID))
  const [history, setHistory] = useState<Grid[]>([])
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [eraserMode, setEraserMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [pencilOverlayCell, setPencilOverlayCell] = useState<{
    r: number
    c: number
    rect: { top: number; left: number; width: number; height: number }
    initialPointer?: { clientX: number; clientY: number; pointerId: number }
  } | null>(null)

  const clueCount = grid.flat().filter(value => value !== 0).length

  function pushHistory() {
    setHistory(prev => [...prev.slice(-49), cloneGrid(grid)])
  }

  function selectCell(r: number, c: number) {
    setSelected({ r, c })
  }

  function setCellValue(r: number, c: number, value: number) {
    if (grid[r][c] === value) {
      setSelected({ r, c })
      return
    }
    pushHistory()
    const next = cloneGrid(grid)
    next[r][c] = value
    setGrid(next)
    setSelected({ r, c })
    setError(null)
  }

  function clearCell(r: number, c: number) {
    if (grid[r][c] === 0) {
      setSelected({ r, c })
      return
    }
    pushHistory()
    const next = cloneGrid(grid)
    next[r][c] = 0
    setGrid(next)
    setSelected({ r, c })
    setError(null)
  }

  function handleDigitInput(digit: number) {
    if (selected === null) return
    setCellValue(selected.r, selected.c, digit)
    if (haptic) onTriggerHaptic?.()
  }

  function handleUndo() {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setGrid(previous)
    setHistory(prev => prev.slice(0, -1))
    setPencilOverlayCell(null)
    setError(null)
    if (haptic) onTriggerHaptic?.()
  }

  async function handleConfirm() {
    if (isVerifying) return

    setPencilOverlayCell(null)
    const result = validateCreatedPuzzle(grid)
    if (!result.valid) {
      setError(result.message)
      if (haptic) onTriggerErrorHaptic?.()
      return
    }

    setIsVerifying(true)

    try {
      const verified = await verifyPuzzle(grid)
      if (!verified) {
        setError('This puzzle has no valid solution.')
        if (haptic) onTriggerErrorHaptic?.()
        return
      }

      setError(null)
      if (haptic) onTriggerHaptic?.()
      onStart(cloneGrid(grid), verified)
    } catch {
      setError('This puzzle could not be validated.')
      if (haptic) onTriggerErrorHaptic?.()
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const arrows: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }

      if (arrows[event.key]) {
        event.preventDefault()
        const [dr, dc] = arrows[event.key]
        setPencilOverlayCell(null)
        setSelected(prev => {
          const r = prev ? Math.max(0, Math.min(8, prev.r + dr)) : 0
          const c = prev ? Math.max(0, Math.min(8, prev.c + dc)) : 0
          return { r, c }
        })
        return
      }

      if (event.key >= '1' && event.key <= '9') {
        if (selected === null) return
        event.preventDefault()
        handleDigitInput(Number(event.key))
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        if (selected === null) return
        event.preventDefault()
        clearCell(selected.r, selected.c)
        if (haptic && grid[selected.r][selected.c] !== 0) onTriggerHaptic?.()
        return
      }

      if (event.key === 'Enter') {
        if (clueCount === 0 || isVerifying) return
        event.preventDefault()
        void handleConfirm()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clueCount, grid, haptic, isVerifying, onTriggerHaptic, selected])

  const selectedDigit = selected !== null ? grid[selected.r][selected.c] : 0
  const cells = [] as React.ReactNode[]
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = grid[r][c]
      const selectedHere = selected?.r === r && selected?.c === c
      const sameDigit = selectedDigit !== 0 && value === selectedDigit && !selectedHere
      const inCross =
        selected !== null &&
        !selectedHere &&
        !sameDigit &&
        (r === selected.r || c === selected.c ||
          (Math.floor(r / 3) === Math.floor(selected.r / 3) && Math.floor(c / 3) === Math.floor(selected.c / 3)))

      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          role="gridcell"
          tabIndex={0}
          aria-selected={selectedHere}
          className={`cell ${value !== 0 ? 'given' : ''}${selectedHere ? ' selected' : ''}${sameDigit ? ' same-digit' : ''}${inCross ? ' cross' : ''}`}
          onPointerDown={(event) => {
            if (eraserMode && pencilMode) {
              event.preventDefault()
              setPencilOverlayCell(null)
              if (grid[r][c] !== 0) {
                clearCell(r, c)
                if (haptic) onTriggerHaptic?.()
              } else {
                selectCell(r, c)
              }
              return
            }
            if (!pencilMode) return
            event.preventDefault()
            setPencilOverlayCell(null)
            if (haptic) onTriggerHaptic?.()
            if (grid[r][c] === 0) {
              setSelected({ r, c })
              const domRect = event.currentTarget.getBoundingClientRect()
              setPencilOverlayCell({
                r,
                c,
                rect: {
                  top: domRect.top,
                  left: domRect.left,
                  width: domRect.width,
                  height: domRect.height,
                },
                initialPointer: {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  pointerId: event.pointerId,
                },
              })
            } else {
              selectCell(r, c)
            }
          }}
          onClick={() => {
            if (pencilMode) return
            if (eraserMode) {
              clearCell(r, c)
              if (haptic && grid[r][c] !== 0) onTriggerHaptic?.()
              return
            }
            selectCell(r, c)
            if (haptic) onTriggerHaptic?.()
          }}
        >
          <span className="cell-value">{value === 0 ? '\u00a0' : value}</span>
        </button>,
      )
    }
  }

  return (
    <div className="game-layout">
      <div className="game-main">
        <div className="board-area">
          <div className="creator-status-row">
            <span className="difficulty-label">Create new game</span>
            <span className="creator-status-text">{isVerifying ? 'Verifying...' : `${clueCount} clues`}</span>
          </div>
          {error && <p className="creator-error" role="alert">{error}</p>}
          <div className="board-wrapper" style={pencilMode ? ({ '--board-safe-space': '140px' } as React.CSSProperties) : undefined}>
            <div className={`board-shell${coordinateLabels ? ' board-shell--with-coordinates' : ''}`}>
              {coordinateLabels && <div className="board-coordinate-corner" aria-hidden="true" />}
              {coordinateLabels && (
                <div className="board-coordinate-columns" aria-hidden="true" data-testid="creator-coordinate-columns">
                  {COORDINATE_COLUMN_LABELS.map(label => (
                    <span key={label} className="board-coordinate-label">{label}</span>
                  ))}
                </div>
              )}
              {coordinateLabels && (
                <div className="board-coordinate-rows" aria-hidden="true" data-testid="creator-coordinate-rows">
                  {COORDINATE_ROW_LABELS.map(label => (
                    <span key={label} className="board-coordinate-label">{label}</span>
                  ))}
                </div>
              )}
              <div className="board" role="grid" aria-label="Created puzzle grid">
                {cells}
              </div>
            </div>
          </div>
        </div>
        <div className="controls-panel">
          <div className="num-pad-toolbar" role="toolbar" aria-label="Creation tools">
            <button
              className="num-key clear"
              type="button"
              aria-label="Undo"
              disabled={history.length === 0}
              onClick={handleUndo}
            >
              <MdUndo size={24} />
            </button>
            <button
              className={`num-key clear${eraserMode ? ' eraser-toggle--active' : ''}`}
              type="button"
              aria-label="Eraser mode"
              aria-pressed={eraserMode}
              onClick={() => {
                setEraserMode(prev => !prev)
                setError(null)
              }}
            >
              <FaEraser size={22} />
            </button>
            <button
              className="num-key clear"
              type="button"
              aria-label="Confirm created puzzle"
              disabled={clueCount === 0 || isVerifying}
              onClick={() => { void handleConfirm() }}
            >
              <FcOk size={22} />
            </button>
          </div>
          <div className="number-pad" role="toolbar" aria-label="Number entry">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
              <button
                key={digit}
                type="button"
                className={`num-key${pencilMode ? ' num-key--reference' : ''}`}
                aria-label={`${digit}`}
                data-digit={digit}
                disabled={pencilMode}
                onClick={() => handleDigitInput(digit)}
              >
                <span className="num-key__digit">{digit}</span>
                <span className="num-key__remaining">{'\u00a0'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {pencilOverlayCell !== null && (
        <PencilOverlay
          cellRect={pencilOverlayCell.rect}
          initialPointer={pencilOverlayCell.initialPointer}
          onDigit={(digit) => {
            setCellValue(pencilOverlayCell.r, pencilOverlayCell.c, digit)
            setPencilOverlayCell(null)
          }}
          onClose={() => setPencilOverlayCell(null)}
        />
      )}
    </div>
  )
}
