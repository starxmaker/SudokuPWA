import React, { useEffect, useState } from 'react'
import { MdPlayArrow, MdPause, MdUndo } from 'react-icons/md'
import { FaEraser, FaPencilAlt } from 'react-icons/fa'
import { FaBrush, FaWandMagic, FaWandMagicSparkles } from 'react-icons/fa6'
import { GiMagicBroom } from 'react-icons/gi'
import { LiaMarkerSolid } from 'react-icons/lia'
import { PiFlagCheckeredFill } from 'react-icons/pi'
import { TbNumbers } from 'react-icons/tb'
import { generateGame, solveGrid, Grid } from '../utils/sudoku'
import {
  type CandidateColorGrid,
  type CellColorGrid,
  type DrawingStroke,
  type FlaggedColorCell,
  cloneDrawingStrokes,
  loadSaved,
  saveGame,
  saveElapsed,
  loadElapsed,
  clearElapsed,
  saveCompleted,
  loadBrushPrefs,
  saveBrushPrefs,
  emptyCellColors,
  emptyCandidateColors,
  emptyDrawingStrokes,
} from '../utils/gameStorage'

type Props = {
  puzzle?: Grid | null
  setPuzzle?: (p: Grid) => void
  onBack?: () => void
  solution?: Grid | null
  autoCheck?: boolean
  autoRemove?: boolean
  haptic?: boolean
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
  onNew?: () => void
  onShare?: () => void
  onWin?: () => void
  difficulty?: string | null
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

function cloneNotesGrid(notes: number[][][]): number[][][] {
  return notes.map(row => row.map(cell => [...cell]))
}

function cloneCellColorsGrid(colors: CellColorGrid): CellColorGrid {
  return colors.map(row => row.map(cell => [...cell]))
}

function cloneCandidateColorsGrid(colors: CandidateColorGrid): CandidateColorGrid {
  return colors.map(row => row.map(cell => cell.map(candidate => [...candidate])))
}

function cloneDrawingStrokesGrid(strokes: DrawingStroke[]) {
  return cloneDrawingStrokes(strokes)
}

function cloneFlaggedColorCell(cell: FlaggedColorCell): FlaggedColorCell {
  return cell === null ? null : { ...cell }
}

function emptyCandidateColorCell(): string[][] {
  return Array.from({ length: 9 }, () => [] as string[])
}

function hasCellBrushColorsAt(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  r: number,
  c: number,
) {
  return cellColors[r][c].length > 0 || candidateColors[r][c].some(colors => colors.length > 0)
}

function hasAnyBrushColorsOnBoard(
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
) {
  return (
    cellColors.some(row => row.some(color => color.length > 0)) ||
    candidateColors.some(row => row.some(cell => cell.some(color => color.length > 0)))
  )
}

function resolveFlaggedColorCell(
  currentFlaggedColorCell: FlaggedColorCell,
  nextCellColors: CellColorGrid,
  nextCandidateColors: CandidateColorGrid,
  shouldAssignFirstFlag: boolean,
  targetCell: { r: number; c: number } | null,
  firstColorFlagEnabled: boolean,
): FlaggedColorCell {
  let nextFlaggedColorCell = cloneFlaggedColorCell(currentFlaggedColorCell)
  if (
    nextFlaggedColorCell !== null &&
    !hasCellBrushColorsAt(nextCellColors, nextCandidateColors, nextFlaggedColorCell.r, nextFlaggedColorCell.c)
  ) {
    nextFlaggedColorCell = null
  }
  if (
    nextFlaggedColorCell === null &&
    firstColorFlagEnabled &&
    shouldAssignFirstFlag &&
    targetCell !== null &&
    hasCellBrushColorsAt(nextCellColors, nextCandidateColors, targetCell.r, targetCell.c)
  ) {
    return { ...targetCell }
  }
  return nextFlaggedColorCell
}

function makeHistoryEntry(
  puzzle: Grid,
  notes: number[][][],
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
  drawingStrokes: DrawingStroke[],
  flaggedColorCell: FlaggedColorCell,
) {
  return {
    puzzle: cloneGrid(puzzle),
    notes: cloneNotesGrid(notes),
    cellColors: cloneCellColorsGrid(cellColors),
    candidateColors: cloneCandidateColorsGrid(candidateColors),
    drawingStrokes: cloneDrawingStrokesGrid(drawingStrokes),
    flaggedColorCell: cloneFlaggedColorCell(flaggedColorCell),
  }
}

const BRUSH_COLORS = [
  { id: 'rose', fill: 'rgba(244, 63, 94, 0.28)', swatch: '#f43f5e' },
  { id: 'orange', fill: 'rgba(249, 115, 22, 0.28)', swatch: '#f97316' },
  { id: 'amber', fill: 'rgba(245, 158, 11, 0.28)', swatch: '#f59e0b' },
  { id: 'lime', fill: 'rgba(132, 204, 22, 0.28)', swatch: '#84cc16' },
  { id: 'emerald', fill: 'rgba(16, 185, 129, 0.28)', swatch: '#10b981' },
  { id: 'sky', fill: 'rgba(14, 165, 233, 0.28)', swatch: '#0ea5e9' },
  { id: 'violet', fill: 'rgba(139, 92, 246, 0.28)', swatch: '#8b5cf6' },
  { id: 'pink', fill: 'rgba(236, 72, 153, 0.28)', swatch: '#ec4899' },
] as const

type BrushColorId = (typeof BRUSH_COLORS)[number]['id']
type CandidateOverlayState = {
  r: number
  c: number
  top: number
  left: number
  size: number
}
type ToolTrayView = 'main' | 'notes' | 'brush' | 'drawing'
type ToolTrayTransition = {
  from: ToolTrayView
  to: ToolTrayView
  direction: 'forward' | 'backward'
}
type LowerPadView = 'numbers' | 'colors'
type LowerPadTransition = {
  from: LowerPadView
  to: LowerPadView
  direction: 'forward' | 'backward'
}
type ToolTrayAnimatedTarget = Exclude<ToolTrayView, 'main'>
type ToolTraySequenceDirection = 'forward' | 'backward'
type ToolTraySequencePhase = 'fade-out' | 'move' | 'fade-in'
type ToolTrayMover = {
  left: number
  top: number
  width: number
  height: number
  deltaX: number
  deltaY: number
}
type ToolTraySequence = {
  target: ToolTrayAnimatedTarget
  direction: ToolTraySequenceDirection
  phase: ToolTraySequencePhase
  mover: ToolTrayMover
  moveActive: boolean
}

const BRUSH_COLOR_MAP: Record<BrushColorId, string> = Object.fromEntries(
  BRUSH_COLORS.map(color => [color.id, color.fill])
) as Record<BrushColorId, string>
const BRUSH_SWATCH_MAP: Record<BrushColorId, string> = Object.fromEntries(
  BRUSH_COLORS.map(color => [color.id, color.swatch])
) as Record<BrushColorId, string>
const DEFAULT_BRUSH_COLOR: BrushColorId = BRUSH_COLORS[0].id
const DRAWING_STROKE_WIDTH = 0.018

function toggleColorInSelection(current: readonly string[], colorId: BrushColorId) {
  return current.includes(colorId) ? current.filter(color => color !== colorId) : [...current, colorId]
}

function buildBrushFill(colorIds: readonly string[]) {
  if (colorIds.length === 0) return undefined
  if (colorIds.length === 1) {
    const fill = BRUSH_COLOR_MAP[colorIds[0] as BrushColorId] ?? colorIds[0]
    return fill
  }
  const stops = colorIds.flatMap((colorId, index) => {
    const fill = BRUSH_COLOR_MAP[colorId as BrushColorId] ?? colorId
    const start = (index * 100) / colorIds.length
    const end = ((index + 1) * 100) / colorIds.length
    return [`${fill} ${start}%`, `${fill} ${end}%`]
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
const TOOL_TRAY_ANIMATION_MS = 280
const TOOL_TRAY_FADE_MS = import.meta.env.MODE === 'test' ? 0 : 240
const TOOL_TRAY_MOVE_MS = import.meta.env.MODE === 'test' ? 0 : 320
const TOOL_TRAY_REVEAL_MS = import.meta.env.MODE === 'test' ? 0 : 300
const TOOL_TRAY_STAGE_GAP_MS = import.meta.env.MODE === 'test' ? 0 : 80
const ENABLE_STAGED_TOOL_ANIMATION = import.meta.env.MODE !== 'test'

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function Board({ puzzle: initialProp, setPuzzle: setPuzzleProp, onBack, solution: solutionProp, autoCheck, autoRemove, haptic, onTriggerHaptic, onTriggerErrorHaptic, onNew, onShare, onWin, difficulty }: Props){
  const savedBrushPrefs = loadBrushPrefs()
  const [internalPuzzle, setInternalPuzzle] = useState<Grid>(() => {
    const saved = loadSaved()
    if (saved?.current && saved.current.length === 9) return saved.current
    if (initialProp && initialProp.length === 9) return initialProp
    return []
  })

  /**
   * Original givens only — always prefer storage `initial` over `puzzle` prop.
   * The prop is current progress (updates every move); using it as "initial" would mark all digits as clues.
   */
  const [initialGrid, setInitialGrid] = useState<Grid | null>(() => {
    const saved = loadSaved()
    if (saved?.initial && saved.initial.length === 9) return cloneGrid(saved.initial)
    if (initialProp && initialProp.length === 9) return cloneGrid(initialProp)
    return null
  })

  const [solutionGrid, setSolutionGrid] = useState<Grid | null>(() => {
    if (solutionProp) return solutionProp
    const saved = loadSaved()
    if (saved?.solution) return saved.solution
    // Derive solution from the initial grid (e.g. old saves without a stored solution)
    if (saved?.initial) return solveGrid(saved.initial)
    return null
  })

  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [notes, setNotes] = useState<number[][][]>(() => {
    const saved = loadSaved()
    if (saved?.notes) return saved.notes
    return Array.from({length: 9}, () => Array.from({length: 9}, () => []))
  })
  const notesRef = React.useRef(notes)
  notesRef.current = notes
  const [cellColors, setCellColors] = useState<CellColorGrid>(() => {
    const saved = loadSaved()
    return saved?.cellColors ? saved.cellColors : emptyCellColors()
  })
  const cellColorsRef = React.useRef(cellColors)
  cellColorsRef.current = cellColors
  const [candidateColors, setCandidateColors] = useState<CandidateColorGrid>(() => {
    const saved = loadSaved()
    return saved?.candidateColors ? saved.candidateColors : emptyCandidateColors()
  })
  const candidateColorsRef = React.useRef(candidateColors)
  candidateColorsRef.current = candidateColors
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>(() => {
    const saved = loadSaved()
    return saved?.drawingStrokes ? saved.drawingStrokes : emptyDrawingStrokes()
  })
  const drawingStrokesRef = React.useRef(drawingStrokes)
  drawingStrokesRef.current = drawingStrokes
  const [flaggedColorCell, setFlaggedColorCell] = useState<FlaggedColorCell>(() => {
    const saved = loadSaved()
    return saved?.flaggedColorCell ? saved.flaggedColorCell : null
  })
  const flaggedColorCellRef = React.useRef(flaggedColorCell)
  flaggedColorCellRef.current = flaggedColorCell
  const [drawingDraft, setDrawingDraft] = useState<DrawingStroke | null>(null)
  const drawingDraftRef = React.useRef(drawingDraft)
  drawingDraftRef.current = drawingDraft
  const [history, setHistory] = useState<{
    puzzle: Grid
    notes: number[][][]
    cellColors: CellColorGrid
    candidateColors: CandidateColorGrid
    drawingStrokes: DrawingStroke[]
    flaggedColorCell: FlaggedColorCell
  }[]>([])
  // Guards against touch ghost-click: onPointerDown stores 'ok'|'error', onClick fires haptic then skips apply.
  const touchFiredRef = React.useRef<'ok' | 'error' | null>(null)
  const [elapsed, setElapsed] = useState(() => loadElapsed())
  const [paused, setPaused] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [won, setWon] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)
  const [brushMode, setBrushMode] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [activeBrushColor, setActiveBrushColor] = useState<BrushColorId>(() => {
    const savedColors = savedBrushPrefs?.activeColors
      ?.filter((color): color is BrushColorId => BRUSH_COLORS.some(brushColor => brushColor.id === color))
    return savedColors && savedColors.length > 0 ? savedColors[0] : DEFAULT_BRUSH_COLOR
  })
  const [activeDrawingColor, setActiveDrawingColor] = useState<BrushColorId>(() => {
    const savedColors = savedBrushPrefs?.activeDrawingColors
      ?.filter((color): color is BrushColorId => BRUSH_COLORS.some(brushColor => brushColor.id === color))
    return savedColors && savedColors.length > 0 ? savedColors[0] : DEFAULT_BRUSH_COLOR
  })
  const [candidateBrushMode, setCandidateBrushMode] = useState<boolean>(() => savedBrushPrefs?.candidateMode ?? false)
  const [firstColorFlagEnabled, setFirstColorFlagEnabled] = useState<boolean>(() => savedBrushPrefs?.firstColorFlagEnabled ?? true)
  const [candidateOverlay, setCandidateOverlay] = useState<CandidateOverlayState | null>(null)
  const [candidateOverlayPreviewDigit, setCandidateOverlayPreviewDigit] = useState<number | null>(null)
  const [candidateSelectedDigit, setCandidateSelectedDigit] = useState<number | null>(null)
  const [visibleToolTray, setVisibleToolTray] = useState<ToolTrayView>('main')
  const [toolTrayTransition, setToolTrayTransition] = useState<ToolTrayTransition | null>(null)
  const toolTrayTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const toolTrayRafRef = React.useRef<number | null>(null)
  const [toolTraySequence, setToolTraySequence] = useState<ToolTraySequence | null>(null)
  const [visibleLowerPad, setVisibleLowerPad] = useState<LowerPadView>('numbers')
  const [lowerPadTransition, setLowerPadTransition] = useState<LowerPadTransition | null>(null)
  const lowerPadTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const drawingPointerIdRef = React.useRef<number | null>(null)
  const toolTrayRef = React.useRef<HTMLDivElement | null>(null)
  const mainNotesButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const mainBrushButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const mainDrawingButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const activeNotesButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const activeBrushButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const activeDrawingButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureMainNotesButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureMainBrushButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureMainDrawingButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureNotesButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureBrushButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const measureDrawingButtonRef = React.useRef<HTMLButtonElement | null>(null)

  // Auto-pause when the tab/window loses focus; never auto-resume.
  // Using focusout on document: relatedTarget is non-null for within-page
  // focus transitions, and null when focus leaves the document entirely.
  useEffect(() => {
    function onBlur() { setPaused(true) }
    function onVisibility() { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setElapsed(s => { saveElapsed(s + 1); return s + 1 }), 1000)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (paused) {
      setCandidateOverlay(null)
      setCandidateOverlayPreviewDigit(null)
      setCandidateSelectedDigit(null)
      setDrawingDraft(null)
      drawingPointerIdRef.current = null
    }
  }, [paused])

  useEffect(() => {
    if (!drawingMode) {
      setDrawingDraft(null)
      drawingPointerIdRef.current = null
    }
  }, [drawingMode])

  useEffect(() => {
    saveBrushPrefs([activeBrushColor], candidateBrushMode, [activeDrawingColor], firstColorFlagEnabled)
  }, [activeBrushColor, activeDrawingColor, candidateBrushMode, firstColorFlagEnabled])

  useEffect(() => () => {
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
    }
    if (toolTrayRafRef.current !== null) {
      window.cancelAnimationFrame(toolTrayRafRef.current)
    }
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
    }
  }, [])

  // Win detection
  useEffect(() => {
    if (won) return
    if (!solutionGrid || internalPuzzle.length !== 9) return
    const complete = internalPuzzle.every((row, r) => row.every((n, c) => n === solutionGrid[r][c]))
    if (complete) {
      setWon(true)
      setPaused(true)
      setFinalTime(prev => elapsed) // capture current elapsed
      saveCompleted()
      onWin?.()
    }
  }, [internalPuzzle, solutionGrid, won, elapsed])

  // determine whether to use external setter or internal
  const setPuzzle = (p: Grid) => {
    if(setPuzzleProp) setPuzzleProp(p)
    setInternalPuzzle(p)
  }

  useEffect(() => {
    if (internalPuzzle.length !== 9 || !initialGrid) return
    saveGame(initialGrid, internalPuzzle, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell)
  }, [internalPuzzle, initialGrid, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell])

  useEffect(() => {
    if (solutionProp != null) setSolutionGrid(solutionProp)
  }, [solutionProp])

  useEffect(() => {
    if (initialProp && initialProp.length === 9) return
    if (internalPuzzle.length > 0) return
    generateGame().then(({ puzzle, solution }) => {
      setInternalPuzzle(puzzle)
      setSolutionGrid(solution)
    })
  }, [initialProp]) // eslint-disable-line react-hooks/exhaustive-deps

  /** First time we have a generated grid with no frozen clues (standalone / test), snapshot clues only. */
  useEffect(() => {
    if (internalPuzzle.length !== 9) return
    if (initialGrid !== null) return
    const frozen = cloneGrid(internalPuzzle)
    setInitialGrid(frozen)
    if (setPuzzleProp) setPuzzleProp(internalPuzzle)
    saveGame(frozen, internalPuzzle, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell)
  }, [internalPuzzle, initialGrid, setPuzzleProp, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore if focus is inside an input/textarea/select, or game is won/paused
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (won || paused) return

      const arrows: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]
      }
      if (arrows[e.key]) {
        e.preventDefault()
        const [dr, dc] = arrows[e.key]
        setSelected(prev => {
          const r = prev ? Math.max(0, Math.min(8, prev.r + dr)) : 0
          const c = prev ? Math.max(0, Math.min(8, prev.c + dc)) : 0
          return { r, c }
        })
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        applyDigit(Number(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        clearCell()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function onInput(r:number,c:number,v:number){
    setInternalPuzzle(prev => {
      const copy = prev.map(row=>row.slice())
      copy[r][c]=v
      if(setPuzzleProp) setPuzzleProp(copy)
      return copy
    })
  }

  async function newGame(){
    const { puzzle: p, solution: s } = await generateGame()
    const initial = cloneGrid(p)
    setInitialGrid(initial)
    setInternalPuzzle(p)
    setSolutionGrid(s)
    setNotes(Array.from({length: 9}, () => Array.from({length: 9}, () => [])))
    setCellColors(emptyCellColors())
    setCandidateColors(emptyCandidateColors())
    setDrawingStrokes(emptyDrawingStrokes())
    flaggedColorCellRef.current = null
    setFlaggedColorCell(null)
    setDrawingDraft(null)
    setCandidateSelectedDigit(null)
    setHistory([])
    setElapsed(0)
    clearElapsed()
    setPaused(false)
    setManualPause(false)
    setWon(false)
    setBrushMode(false)
    setDrawingMode(false)
    setCandidateOverlay(null)
    setToolTrayTransition(null)
    setToolTraySequence(null)
    setVisibleToolTray('main')
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
      toolTrayTimerRef.current = null
    }
    if (toolTrayRafRef.current !== null) {
      window.cancelAnimationFrame(toolTrayRafRef.current)
      toolTrayRafRef.current = null
    }
    setLowerPadTransition(null)
    setVisibleLowerPad('numbers')
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
      lowerPadTimerRef.current = null
    }
    if(setPuzzleProp) setPuzzleProp(p)
    saveGame(initial, p, s, undefined, undefined, undefined, emptyDrawingStrokes(), null)
    setSelected(null)
  }

  function handleRetry() {
    if (!initialGrid) return
    setInternalPuzzle(cloneGrid(initialGrid))
    setNotes(Array.from({length: 9}, () => Array.from({length: 9}, () => [])))
    setCellColors(emptyCellColors())
    setCandidateColors(emptyCandidateColors())
    setDrawingStrokes(emptyDrawingStrokes())
    flaggedColorCellRef.current = null
    setFlaggedColorCell(null)
    setDrawingDraft(null)
    setCandidateSelectedDigit(null)
    setHistory([])
    setElapsed(0)
    clearElapsed()
    setPaused(false)
    setManualPause(false)
    setWon(false)
    setBrushMode(false)
    setDrawingMode(false)
    setCandidateOverlay(null)
    setToolTrayTransition(null)
    setToolTraySequence(null)
    setVisibleToolTray('main')
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
      toolTrayTimerRef.current = null
    }
    if (toolTrayRafRef.current !== null) {
      window.cancelAnimationFrame(toolTrayRafRef.current)
      toolTrayRafRef.current = null
    }
    setLowerPadTransition(null)
    setVisibleLowerPad('numbers')
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
      lowerPadTimerRef.current = null
    }
    setSelected(null)
    saveGame(initialGrid, cloneGrid(initialGrid), solutionGrid, undefined, undefined, undefined, emptyDrawingStrokes(), null)
  }

  function isClue(r: number, c: number): boolean {
    return initialGrid !== null && initialGrid[r][c] !== 0
  }

  function selectCell(r: number, c: number) {
    setCandidateSelectedDigit(null)
    setSelected(prev => (prev?.r === r && prev?.c === c ? null : { r, c }))
  }

  function getCandidateOverlayPosition(rect: DOMRect) {
    const maxSize = Math.min(window.innerWidth - 16, window.innerHeight - 16, rect.width * 3)
    const size = Math.max(120, maxSize)
    const unclampedLeft = rect.left + rect.width / 2 - size / 2
    const unclampedTop = rect.top + rect.height / 2 - size / 2
    return {
      size,
      left: Math.max(8, Math.min(window.innerWidth - size - 8, unclampedLeft)),
      top: Math.max(8, Math.min(window.innerHeight - size - 8, unclampedTop)),
    }
  }

  function applyCellBrushColorAt(r: number, c: number, colorId: BrushColorId = activeBrushColor) {
    if (candidateColorsRef.current[r][c].some(candidateColors => candidateColors.length > 0)) return false
    const currentColors = cellColorsRef.current[r][c]
    const nextColors = toggleColorInSelection(currentColors, colorId)
    if (currentColors.length === nextColors.length && currentColors.every((color, index) => color === nextColors[index])) return false
    const boardHadAnyColors = hasAnyBrushColorsOnBoard(cellColorsRef.current, candidateColorsRef.current)
    const nextCellColors = cloneCellColorsGrid(cellColorsRef.current)
    nextCellColors[r][c] = [...nextColors]
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      nextCellColors,
      candidateColorsRef.current,
      !boardHadAnyColors,
      { r, c },
      firstColorFlagEnabled,
    )

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCellColors(nextCellColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function applyCandidateBrushColorAt(r: number, c: number, d: number) {
    if (cellColorsRef.current[r][c].length > 0) return false
    if (!notesRef.current[r][c].includes(d)) return false

    const currentColors = candidateColorsRef.current[r][c][d - 1]
    const nextColors = toggleColorInSelection(currentColors, activeBrushColor)
    if (currentColors.length === nextColors.length && currentColors.every((color, index) => color === nextColors[index])) return false
    const boardHadAnyColors = hasAnyBrushColorsOnBoard(cellColorsRef.current, candidateColorsRef.current)
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    nextCandidateColors[r][c][d - 1] = [...nextColors]
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      cellColorsRef.current,
      nextCandidateColors,
      !boardHadAnyColors,
      { r, c },
      firstColorFlagEnabled,
    )

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function closeCandidateOverlay(preserveSelectedDigit = false) {
    setCandidateOverlay(null)
    setCandidateOverlayPreviewDigit(null)
    if (!preserveSelectedDigit) {
      setCandidateSelectedDigit(null)
    }
  }

  function switchLowerPad(next: LowerPadView, direction: LowerPadTransition['direction']) {
    if (visibleLowerPad === next) return
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
    }
    setLowerPadTransition({
      from: visibleLowerPad,
      to: next,
      direction,
    })
    setVisibleLowerPad(next)
    lowerPadTimerRef.current = window.setTimeout(() => {
      setLowerPadTransition(null)
      lowerPadTimerRef.current = null
    }, TOOL_TRAY_ANIMATION_MS)
  }

  function clearToolTrayAnimation() {
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
      toolTrayTimerRef.current = null
    }
    if (toolTrayRafRef.current !== null) {
      window.cancelAnimationFrame(toolTrayRafRef.current)
      toolTrayRafRef.current = null
    }
    setToolTraySequence(null)
  }

  function getMainToolButton(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return mainNotesButtonRef.current
      case 'brush':
        return mainBrushButtonRef.current
      case 'drawing':
        return mainDrawingButtonRef.current
    }
  }

  function getActiveToolButton(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return activeNotesButtonRef.current
      case 'brush':
        return activeBrushButtonRef.current
      case 'drawing':
        return activeDrawingButtonRef.current
    }
  }

  function getMeasureMainToolButton(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return measureMainNotesButtonRef.current
      case 'brush':
        return measureMainBrushButtonRef.current
      case 'drawing':
        return measureMainDrawingButtonRef.current
    }
  }

  function getMeasureSubtoolButton(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return measureNotesButtonRef.current
      case 'brush':
        return measureBrushButtonRef.current
      case 'drawing':
        return measureDrawingButtonRef.current
    }
  }

  function startToolTraySequence(target: ToolTrayAnimatedTarget, direction: ToolTraySequenceDirection) {
    if (!ENABLE_STAGED_TOOL_ANIMATION) {
      setVisibleToolTray(direction === 'forward' ? target : 'main')
      setToolTrayTransition(null)
      setToolTraySequence(null)
      return
    }

    const container = toolTrayRef.current
    const source = direction === 'forward'
      ? getMainToolButton(target)
      : getActiveToolButton(target)
    const destination = direction === 'forward'
      ? getMeasureSubtoolButton(target)
      : getMeasureMainToolButton(target)
    if (container === null || source === null || destination === null) {
      setVisibleToolTray(direction === 'forward' ? target : 'main')
      setToolTrayTransition(null)
      setToolTraySequence(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const destinationRect = destination.getBoundingClientRect()
    const mover: ToolTrayMover = {
      left: sourceRect.left - containerRect.left,
      top: sourceRect.top - containerRect.top,
      width: sourceRect.width,
      height: sourceRect.height,
      deltaX: destinationRect.left - sourceRect.left,
      deltaY: destinationRect.top - sourceRect.top,
    }

    clearToolTrayAnimation()
    setToolTrayTransition(null)
    setVisibleToolTray(direction === 'forward' ? 'main' : target)
    setToolTraySequence({
      target,
      direction,
      phase: 'fade-out',
      mover,
      moveActive: false,
    })

    toolTrayTimerRef.current = window.setTimeout(() => {
      toolTrayTimerRef.current = window.setTimeout(() => {
        if (direction === 'forward') {
          setVisibleToolTray(target)
        }
        setToolTraySequence({
          target,
          direction,
          phase: 'move',
          mover,
          moveActive: false,
        })
        toolTrayRafRef.current = window.requestAnimationFrame(() => {
          toolTrayRafRef.current = window.requestAnimationFrame(() => {
            setToolTraySequence(prev => prev ? { ...prev, moveActive: true } : prev)
            toolTrayRafRef.current = null
          })
        })
        toolTrayTimerRef.current = window.setTimeout(() => {
          toolTrayTimerRef.current = window.setTimeout(() => {
            if (direction === 'backward') {
              setVisibleToolTray('main')
            }
            setToolTraySequence(prev => prev ? { ...prev, phase: 'fade-in', moveActive: false } : prev)
            toolTrayTimerRef.current = window.setTimeout(() => {
              setToolTraySequence(null)
              toolTrayTimerRef.current = null
            }, TOOL_TRAY_REVEAL_MS)
          }, TOOL_TRAY_STAGE_GAP_MS)
        }, TOOL_TRAY_MOVE_MS)
      }, TOOL_TRAY_STAGE_GAP_MS)
    }, TOOL_TRAY_FADE_MS)
  }

  function openNotesTools() {
    closeCandidateOverlay()
    setBrushMode(false)
    setDrawingMode(false)
    setNotesMode(true)
    startToolTraySequence('notes', 'forward')
    switchLowerPad('numbers', 'backward')
  }

  function openBrushTools() {
    closeCandidateOverlay()
    setNotesMode(false)
    setDrawingMode(false)
    setBrushMode(true)
    startToolTraySequence('brush', 'forward')
    switchLowerPad('colors', 'forward')
  }

  function openDrawingTools() {
    closeCandidateOverlay()
    setNotesMode(false)
    setBrushMode(false)
    setDrawingMode(true)
    startToolTraySequence('drawing', 'forward')
    switchLowerPad('colors', 'forward')
  }

  function closeActiveToolTray() {
    closeCandidateOverlay()
    if (toolTraySequence !== null || visibleToolTray === 'main') return
    const activeTool = visibleToolTray
    if (activeTool === 'notes') {
      setNotesMode(false)
    }
    if (activeTool === 'brush') {
      setBrushMode(false)
      switchLowerPad('numbers', 'backward')
    }
    if (activeTool === 'drawing') {
      setDrawingMode(false)
      switchLowerPad('numbers', 'backward')
    }
    startToolTraySequence(activeTool, 'backward')
  }

  function toggleNotesTools() {
    if (toolTraySequence !== null) return
    if (visibleToolTray === 'notes') {
      closeActiveToolTray()
      return
    }
    openNotesTools()
  }

  function toggleBrushTools() {
    if (toolTraySequence !== null) return
    if (visibleToolTray === 'brush') {
      closeActiveToolTray()
      return
    }
    openBrushTools()
  }

  function toggleDrawingTools() {
    if (toolTraySequence !== null) return
    if (visibleToolTray === 'drawing') {
      closeActiveToolTray()
      return
    }
    openDrawingTools()
  }

  function handleMomentaryButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => boolean,
  ) {
    const changed = action()
    event.currentTarget.blur()
    if (changed && haptic) onTriggerHaptic?.()
  }

  function clearSelectedBrushColors() {
    if (!selected) return false
    const { r, c } = selected
    const hasCellColor = cellColorsRef.current[r][c].length > 0
    const hasCandidateColor = candidateColorsRef.current[r][c].some(colors => colors.length > 0)
    if (!hasCellColor && !hasCandidateColor) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    const nextCellColors = cloneCellColorsGrid(cellColorsRef.current)
    nextCellColors[r][c] = []
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    nextCandidateColors[r][c] = emptyCandidateColorCell()
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      nextCellColors,
      nextCandidateColors,
      false,
      null,
      firstColorFlagEnabled,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCellColors(nextCellColors)
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function openCandidateOverlay(r: number, c: number, target: HTMLElement) {
    setCandidateSelectedDigit(null)
    setSelected({ r, c })
    if (
      internalPuzzle[r][c] !== 0 ||
      notesRef.current[r][c].length === 0 ||
      cellColorsRef.current[r][c].length > 0
    ) {
      setCandidateOverlay(null)
      return false
    }
    const { top, left, size } = getCandidateOverlayPosition(target.getBoundingClientRect())
    setCandidateSelectedDigit(null)
    setCandidateOverlayPreviewDigit(null)
    setCandidateOverlay({ r, c, top, left, size })
    return true
  }

  function getSimpleCandidates(r: number, c: number): number[] {
    const used = new Set<number>()
    for (let i = 0; i < 9; i++) {
      const rowValue = internalPuzzle[r][i]
      const colValue = internalPuzzle[i][c]
      if (rowValue >= 1 && rowValue <= 9) used.add(rowValue)
      if (colValue >= 1 && colValue <= 9) used.add(colValue)
    }

    const boxR = Math.floor(r / 3) * 3
    const boxC = Math.floor(c / 3) * 3
    for (let br = boxR; br < boxR + 3; br++) {
      for (let bc = boxC; bc < boxC + 3; bc++) {
        const value = internalPuzzle[br][bc]
        if (value >= 1 && value <= 9) used.add(value)
      }
    }

    const candidates: number[] = []
    for (let d = 1; d <= 9; d++) {
      if (!used.has(d) && remaining[d] > 0) candidates.push(d)
    }
    return candidates
  }

  function applyDigit(d: number): boolean {
    if (!selected) return false
    const { r, c } = selected
    if (isClue(r, c)) return false
    if (remaining[d] === 0) return false
    if (brushMode || drawingMode) return false
    if (notesMode) {
      const historyEntry = makeHistoryEntry(
        internalPuzzle,
        notesRef.current,
        cellColorsRef.current,
        candidateColorsRef.current,
        drawingStrokesRef.current,
        flaggedColorCellRef.current,
      )
      const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
      nextCandidateColors[r][c][d - 1] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        flaggedColorCellRef.current,
        cellColorsRef.current,
        nextCandidateColors,
        false,
        null,
        firstColorFlagEnabled,
      )
      setHistory(h => [...h.slice(-50), historyEntry])
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        const cell = next[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0) cell.splice(idx, 1)
        else cell.push(d)
        return next
      })
      flaggedColorCellRef.current = nextFlaggedColorCell
      setCandidateColors(nextCandidateColors)
      setFlaggedColorCell(nextFlaggedColorCell)
    } else {
      const canValidateEntry = autoCheck && solutionGrid !== null
      const isCorrectEntry = solutionGrid !== null && d === solutionGrid[r][c]
      const shouldAutoRemove = autoRemove && (!canValidateEntry || isCorrectEntry)
      const historyEntry = makeHistoryEntry(
        internalPuzzle,
        notesRef.current,
        cellColorsRef.current,
        candidateColorsRef.current,
        drawingStrokesRef.current,
        flaggedColorCellRef.current,
      )
      const nextNotes = cloneNotesGrid(notesRef.current)
      nextNotes[r][c] = []
      if (shouldAutoRemove) {
        const boxR = Math.floor(r / 3) * 3
        const boxC = Math.floor(c / 3) * 3
        for (let i = 0; i < 9; i++) {
          if (nextNotes[r][i].length) nextNotes[r][i] = nextNotes[r][i].filter(n => n !== d)
          if (nextNotes[i][c].length) nextNotes[i][c] = nextNotes[i][c].filter(n => n !== d)
        }
        for (let br = boxR; br < boxR + 3; br++) {
          for (let bc = boxC; bc < boxC + 3; bc++) {
            if (nextNotes[br][bc].length) nextNotes[br][bc] = nextNotes[br][bc].filter(n => n !== d)
          }
        }
      }
      const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
      nextCandidateColors[r][c] = emptyCandidateColorCell()
      if (shouldAutoRemove) {
        const boxR = Math.floor(r / 3) * 3
        const boxC = Math.floor(c / 3) * 3
        for (let i = 0; i < 9; i++) {
          nextCandidateColors[r][i][d - 1] = []
          nextCandidateColors[i][c][d - 1] = []
        }
        for (let br = boxR; br < boxR + 3; br++) {
          for (let bc = boxC; bc < boxC + 3; bc++) {
            nextCandidateColors[br][bc][d - 1] = []
          }
        }
      }
      const nextCellColors = cloneCellColorsGrid(cellColorsRef.current)
      nextCellColors[r][c] = []
      const nextFlaggedColorCell = resolveFlaggedColorCell(
        flaggedColorCellRef.current,
        nextCellColors,
        nextCandidateColors,
        false,
        null,
        firstColorFlagEnabled,
      )
      setHistory(h => [...h.slice(-50), historyEntry])
      flaggedColorCellRef.current = nextFlaggedColorCell
      setNotes(nextNotes)
      setCandidateColors(nextCandidateColors)
      setCellColors(nextCellColors)
      setFlaggedColorCell(nextFlaggedColorCell)
      onInput(r, c, d)
      if (autoCheck && solutionGrid !== null && d !== solutionGrid[r][c]) {
        return true
      }
    }
    return false
  }

  function clearCell() {
    if (!selected) return false
    const { r, c } = selected
    if (isClue(r, c)) return false
    if (drawingMode) return false
    setCandidateOverlay(null)
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    nextCandidateColors[r][c] = emptyCandidateColorCell()
    const nextCellColors = cloneCellColorsGrid(cellColorsRef.current)
    nextCellColors[r][c] = []
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      nextCellColors,
      nextCandidateColors,
      false,
      null,
      firstColorFlagEnabled,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(prev => {
      const next = prev.map(row => row.map(cell => [...cell]))
      next[r][c] = []
      return next
    })
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setCellColors(nextCellColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    onInput(r, c, 0)
    return true
  }

  function fillCandidates() {
    if (!selected) return false
    const { r, c } = selected
    if (isClue(r, c) || internalPuzzle[r][c] !== 0 || notesRef.current[r][c].length > 0) return false
    const candidates = getSimpleCandidates(r, c)
    if (candidates.length === 0) return false
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    nextCandidateColors[r][c] = emptyCandidateColorCell()
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      cellColorsRef.current,
      nextCandidateColors,
      false,
      null,
      firstColorFlagEnabled,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(prev => {
      const next = cloneNotesGrid(prev)
      next[r][c] = candidates
      return next
    })
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function fillAllCandidates() {
    const hasFillableCell = internalPuzzle.some((row, r) =>
      row.some((n, c) => !isClue(r, c) && n === 0 && notesRef.current[r][c].length === 0)
    )
    if (!hasFillableCell) return false

    const nextNotes = cloneNotesGrid(notesRef.current)
    let changed = false
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (isClue(r, c) || internalPuzzle[r][c] !== 0 || nextNotes[r][c].length > 0) continue
        const candidates = getSimpleCandidates(r, c)
        nextNotes[r][c] = candidates
        changed = true
      }
    }

    if (!changed) return false
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (isClue(r, c) || internalPuzzle[r][c] !== 0 || notesRef.current[r][c].length > 0) continue
        nextCandidateColors[r][c] = emptyCandidateColorCell()
      }
    }
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      cellColorsRef.current,
      nextCandidateColors,
      false,
      null,
      firstColorFlagEnabled,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(nextNotes)
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function applyBrushColor(colorId: BrushColorId) {
    if (drawingMode) {
      setActiveDrawingColor(colorId)
      return
    }
    setActiveBrushColor(colorId)
  }

  function clearAllColors() {
    const hasCellColors = cellColorsRef.current.some(row => row.some(color => color.length > 0))
    const hasCandidateColors = candidateColorsRef.current.some(row =>
      row.some(cell => cell.some(color => color.length > 0))
    )
    if (!hasCellColors && !hasCandidateColors) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    flaggedColorCellRef.current = null
    setCellColors(emptyCellColors())
    setCandidateColors(emptyCandidateColors())
    setFlaggedColorCell(null)
    return true
  }

  function clearAllDrawings() {
    if (drawingStrokesRef.current.length === 0) return false
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    drawingPointerIdRef.current = null
    setDrawingDraft(null)
    setDrawingStrokes(emptyDrawingStrokes())
    return true
  }

  function getDrawingPoint(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    return [x, y] as [number, number]
  }

  function startDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingMode || paused || won) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = getDrawingPoint(event)
    if (point === null) return
    closeCandidateOverlay()
    setSelected(null)
    drawingPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrawingDraft({
      color: BRUSH_SWATCH_MAP[activeDrawingColor] ?? activeDrawingColor,
      points: [point],
    })
  }

  function moveDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingMode || drawingPointerIdRef.current !== event.pointerId) return
    const point = getDrawingPoint(event)
    if (point === null) return
    setDrawingDraft(prev => {
      if (prev === null) return prev
      const lastPoint = prev.points[prev.points.length - 1]
      if (lastPoint && lastPoint[0] === point[0] && lastPoint[1] === point[1]) return prev
      return {
        ...prev,
        points: [...prev.points, point],
      }
    })
  }

  function stopDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (drawingPointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    drawingPointerIdRef.current = null
    const stroke = drawingDraftRef.current
    setDrawingDraft(null)
    if (stroke === null || stroke.points.length === 0) return
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setDrawingStrokes(prev => [...prev, ...cloneDrawingStrokesGrid([stroke])])
    if (haptic) onTriggerHaptic?.()
  }

  function cancelDrawing(event?: React.PointerEvent<SVGSVGElement>) {
    if (event && drawingPointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    drawingPointerIdRef.current = null
    setDrawingDraft(null)
  }

  function undo() {
    const entry = history[history.length - 1]
    if (!entry) return false
    const restoredPuzzle = cloneGrid(entry.puzzle)
    const restoredNotes = cloneNotesGrid(entry.notes)
    const restoredCellColors = cloneCellColorsGrid(entry.cellColors)
    const restoredCandidateColors = cloneCandidateColorsGrid(entry.candidateColors)
    const restoredDrawingStrokes = cloneDrawingStrokesGrid(entry.drawingStrokes)
    const restoredFlaggedColorCell = cloneFlaggedColorCell(entry.flaggedColorCell)
    setInternalPuzzle(restoredPuzzle)
    if (setPuzzleProp) setPuzzleProp(restoredPuzzle)
    setNotes(restoredNotes)
    setCellColors(restoredCellColors)
    setCandidateColors(restoredCandidateColors)
    drawingPointerIdRef.current = null
    setDrawingDraft(null)
    setDrawingStrokes(restoredDrawingStrokes)
    flaggedColorCellRef.current = restoredFlaggedColorCell
    setFlaggedColorCell(restoredFlaggedColorCell)
    setHistory(prev => prev.slice(0, -1))
    return true
  }

  if(internalPuzzle.length===0) return null

  // count how many of each digit (1-9) are correctly placed (or just placed) in the grid
  const digitCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  for (const row of internalPuzzle) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  const remaining: Record<number, number> = {}
  for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])

  const selectedDigit =
    selected !== null ? internalPuzzle[selected.r][selected.c] : 0
  const highlightedDigit = candidateOverlayPreviewDigit ?? candidateSelectedDigit ?? (brushMode || drawingMode ? 0 : selectedDigit)
  const canFillSelectedCandidates =
    selected !== null &&
    !isClue(selected.r, selected.c) &&
    internalPuzzle[selected.r][selected.c] === 0 &&
    notes[selected.r][selected.c].length === 0
  const hasAnyFillableCell = internalPuzzle.some((row, r) =>
    row.some((n, c) => !isClue(r, c) && n === 0 && notes[r][c].length === 0)
  )
  const hasAnyColors = hasAnyBrushColorsOnBoard(cellColors, candidateColors)
  const hasAnyDrawings = drawingStrokes.length > 0
  const candidateEntryMode = notesMode
  const selectedHasCellColor =
    selected !== null && cellColors[selected.r][selected.c].length > 0
  const selectedHasCandidateColors =
    selected !== null && candidateColors[selected.r][selected.c].some(color => color.length > 0)
  const selectedHasAnyColors = selectedHasCellColor || selectedHasCandidateColors
  const overlayCellNotes = candidateOverlay ? notes[candidateOverlay.r][candidateOverlay.c] : []
  const overlayHasCellColor =
    candidateOverlay !== null && cellColors[candidateOverlay.r][candidateOverlay.c].length > 0
  const toolTrayOverlayView = toolTrayTransition?.from ?? null
  const lowerPadOverlayView = lowerPadTransition?.from ?? null
  const undoDisabled = history.length === 0 || paused || won
  const activeFlaggedColorCell =
    firstColorFlagEnabled &&
    flaggedColorCell !== null &&
    hasCellBrushColorsAt(cellColors, candidateColors, flaggedColorCell.r, flaggedColorCell.c)
      ? flaggedColorCell
      : null
  const stagedToolTarget = toolTraySequence?.target ?? null
  const stagedToolDirection = toolTraySequence?.direction ?? null
  const stagedToolPhase = toolTraySequence?.phase ?? null
  const isToolTrayOpening = stagedToolDirection === 'forward'
  const isToolTrayClosing = stagedToolDirection === 'backward'
  const isToolTrayFadingOut = stagedToolPhase === 'fade-out'
  const isToolTrayMoving = stagedToolPhase === 'move'
  const isToolTrayFadingIn = stagedToolPhase === 'fade-in'
  const renderedDrawingStrokes = drawingDraft === null ? drawingStrokes : [...drawingStrokes, drawingDraft]

  function toolTrayPanelClass(view: ToolTrayView, layer: 'active' | 'overlay') {
    if (toolTraySequence !== null) {
      if (layer === 'overlay') return 'tool-tray__panel--hidden'
      if (isToolTrayFadingOut) {
        const outgoingView: ToolTrayView =
          stagedToolDirection === 'backward' && stagedToolTarget !== null ? stagedToolTarget : 'main'
        return view === outgoingView ? 'tool-tray__panel--active' : 'tool-tray__panel--hidden'
      }
      return visibleToolTray === view ? 'tool-tray__panel--active' : 'tool-tray__panel--hidden'
    }
    if (layer === 'active') {
      if (visibleToolTray !== view) return 'tool-tray__panel--hidden'
      if (toolTrayTransition?.to === view) {
        return toolTrayTransition.direction === 'forward'
          ? 'tool-tray__panel--enter-right'
          : 'tool-tray__panel--enter-left'
      }
      return 'tool-tray__panel--active'
    }

    if (toolTrayOverlayView !== view || toolTrayTransition === null) {
      return 'tool-tray__panel--hidden'
    }
    return toolTrayTransition.direction === 'forward'
      ? 'tool-tray__panel--leave-left'
      : 'tool-tray__panel--leave-right'
  }

  function lowerPadPanelClass(view: LowerPadView, layer: 'active' | 'overlay') {
    if (layer === 'active') {
      if (visibleLowerPad !== view) {
        return 'input-pad__panel--hidden'
      }
      if (lowerPadTransition?.to === view) {
        return 'input-pad__panel--fade-in'
      }
      return 'input-pad__panel--active'
    }

    if (lowerPadOverlayView !== view || lowerPadTransition === null) {
      return 'input-pad__panel--hidden'
    }
    return 'input-pad__panel--fade-out'
  }

  function mainToolButtonClass(button: 'clear' | 'notes' | 'brush' | 'drawing' | 'undo') {
    const classes = ['tool-tray__main-button']
    const fadingTarget = stagedToolTarget !== null && button === stagedToolTarget
    if (isToolTrayOpening && isToolTrayFadingOut) {
      if (fadingTarget) classes.push('tool-tray__main-button--selected')
      else classes.push('tool-tray__main-button--fading')
    }
    if (isToolTrayOpening && (isToolTrayMoving || isToolTrayFadingIn) && fadingTarget) {
      classes.push('tool-tray__main-button--hidden')
    }
    return classes.join(' ')
  }

  function mainToolPanelClass() {
    if (isToolTrayClosing && isToolTrayFadingIn) {
      return 'tool-tray__panel--main-fade-in'
    }
    return ''
  }

  function isToolTargetClosing(target: ToolTrayAnimatedTarget) {
    return isToolTrayClosing && stagedToolTarget === target
  }

  function subtoolContentClass(target: ToolTrayAnimatedTarget) {
    const classes = ['tool-tray__content', `tool-tray__content--${target}`]
    if (isToolTrayClosing && isToolTrayFadingOut && stagedToolTarget === target) {
      classes.push('tool-tray__content--fade-out')
    }
    if (isToolTrayMoving && stagedToolTarget === target) {
      classes.push('tool-tray__content--hidden')
    }
    if (isToolTrayOpening && isToolTrayFadingIn && stagedToolTarget === target) {
      classes.push('tool-tray__content--fade-in')
    }
    return classes.join(' ')
  }

  function toolToggleClass(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return 'notes-toggle'
      case 'brush':
        return 'brush-toggle'
      case 'drawing':
        return 'drawing-toggle'
    }
  }

  function renderToolIcon(target: ToolTrayAnimatedTarget) {
    switch (target) {
      case 'notes':
        return <FaPencilAlt size={20} />
      case 'brush':
        return <FaBrush size={20} />
      case 'drawing':
        return <LiaMarkerSolid size={22} />
    }
  }

  function buildDrawingPolyline(points: readonly [number, number][]) {
    return points.map(([x, y]) => `${x},${y}`).join(' ')
  }

  function renderNumberPad(tabIndex?: number) {
    return (
      <>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            type="button"
            className={`num-key${remaining[d] === 0 ? ' num-key--done' : ''}${candidateEntryMode ? ' num-key--notes' : ''}`}
            disabled={paused || won || remaining[d] === 0}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                const isError = applyDigit(d)
                touchFiredRef.current = isError ? 'error' : 'ok'
              }
            }}
            onClick={() => {
              if (touchFiredRef.current !== null) {
                const result = touchFiredRef.current
                touchFiredRef.current = null
                if (haptic) {
                  if (result === 'error') onTriggerErrorHaptic?.()
                  else onTriggerHaptic?.()
                }
                return
              }
              const isError = applyDigit(d)
              if (haptic) {
                if (isError) onTriggerErrorHaptic?.()
                else onTriggerHaptic?.()
              }
            }}
            aria-label={`${d}, ${remaining[d]} remaining`}
            data-digit={d}
            tabIndex={tabIndex}
          >
            <span className="num-key__digit">{remaining[d] === 0 ? '\u00a0' : d}</span>
            <span className="num-key__remaining">{remaining[d] > 0 ? remaining[d] : '\u00a0'}</span>
          </button>
        ))}
      </>
    )
  }

  function renderColorPad(tabIndex?: number) {
    const activePaletteColor = drawingMode ? activeDrawingColor : activeBrushColor
    return (
      <>
        {BRUSH_COLORS.map((color, index) => (
          <button
            key={color.id}
            type="button"
            className={`brush-color-button${activePaletteColor === color.id ? ' brush-color-button--active' : ''}`}
            aria-label={`Brush color ${index + 1}`}
            aria-pressed={activePaletteColor === color.id}
            disabled={paused || won}
            onClick={() => applyBrushColor(color.id)}
            style={{ '--annotation-color': color.fill, '--swatch-color': color.swatch } as React.CSSProperties}
            tabIndex={tabIndex}
          />
        ))}
        <button
          type="button"
          className="brush-color-button brush-color-button--clear"
          aria-label="Brush color remover"
          aria-pressed={false}
          disabled={paused || won || !selectedHasAnyColors}
          onClick={(event) => handleMomentaryButtonClick(event, clearSelectedBrushColors)}
          tabIndex={tabIndex}
        >
          <span className="brush-color-button__clear-mark" aria-hidden="true">×</span>
        </button>
      </>
    )
  }

  // flatten to grid items for responsive sizing
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
          onClick={(e) => {
            if (brushMode) {
              setCandidateSelectedDigit(null)
              setSelected({ r, c })
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
              {[1,2,3,4,5,6,7,8,9].map(d => (
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
        </button>
      )
    }
  }

  return (
    <div className="game-layout">
      {!onBack && (
        <div style={{alignSelf:'flex-end'}}>
          <button type="button" onClick={newGame}>New</button>
        </div>
      )}
      <div className="game-main">
        <div className="board-area">
          <div className="timer-row">
            <span className="difficulty-label">{difficulty ?? 'Custom'}</span>
            <div className="timer-group">
              <span className="timer-display">
                {formatTime(elapsed)}
              </span>
              <button
                type="button"
                className="timer-pause"
                aria-label={paused ? 'Resume' : 'Pause'}
                onClick={() => {
                  const next = !paused
                  setManualPause(next)
                  setPaused(next)
                }}
              >
                {paused ? <MdPlayArrow size={22} /> : <MdPause size={22} />}
              </button>
            </div>
          </div>
          <div className="board-wrapper">
            <div className={`board${paused ? ' board--paused' : ''}`} role="grid" aria-label="Sudoku grid">
              {cells}
              <svg
                className={`board-drawing-layer${drawingMode && !paused && !won ? ' board-drawing-layer--interactive' : ''}`}
                aria-label="Free drawing canvas"
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
              {paused && !won && (
                <div className="board-pause-overlay">
                  <button
                    type="button"
                    className="board-pause-btn"
                    aria-label="Resume"
                    onClick={() => { setManualPause(false); setPaused(false) }}
                  >
                    <MdPlayArrow size={38} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="controls-panel">
          <div ref={toolTrayRef} className={`tool-tray tool-tray--${visibleToolTray}`} aria-live="polite">
            <div className="tool-tray__measure" aria-hidden="true">
              <div className="num-pad-toolbar tool-tray__panel">
                <button type="button" className="num-key clear" tabIndex={-1}>
                  <MdUndo size={24} />
                </button>
                <button type="button" className="num-key clear" tabIndex={-1}>
                  <FaEraser size={22} />
                </button>
                <button
                  ref={measureMainNotesButtonRef}
                  type="button"
                  className="num-key notes-toggle"
                  tabIndex={-1}
                >
                  <FaPencilAlt size={20} />
                </button>
                <button
                  ref={measureMainBrushButtonRef}
                  type="button"
                  className="num-key brush-toggle"
                  tabIndex={-1}
                >
                  <FaBrush size={20} />
                </button>
                <button
                  ref={measureMainDrawingButtonRef}
                  type="button"
                  className="num-key drawing-toggle"
                  tabIndex={-1}
                >
                  <LiaMarkerSolid size={22} />
                </button>
              </div>
              <div className="num-pad-toolbar tool-tray__panel tool-tray__panel--sub">
                <button
                  ref={measureNotesButtonRef}
                  type="button"
                  className="num-key notes-toggle notes-toggle--active"
                  tabIndex={-1}
                >
                  <FaPencilAlt size={20} />
                </button>
                <div className="tool-tray__content tool-tray__content--notes">
                  <button type="button" className="num-key clear" tabIndex={-1}><MdUndo size={24} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><FaWandMagic size={20} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><FaWandMagicSparkles size={20} /></button>
                </div>
              </div>
              <div className="num-pad-toolbar tool-tray__panel tool-tray__panel--sub">
                <button
                  ref={measureBrushButtonRef}
                  type="button"
                  className="num-key brush-toggle brush-toggle--active"
                  tabIndex={-1}
                >
                  <FaBrush size={20} />
                </button>
                <div className="tool-tray__content tool-tray__content--brush">
                  <button type="button" className="num-key clear" tabIndex={-1}><MdUndo size={24} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><TbNumbers size={18} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><PiFlagCheckeredFill size={18} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><GiMagicBroom size={18} /></button>
                </div>
              </div>
              <div className="num-pad-toolbar tool-tray__panel tool-tray__panel--sub">
                <button
                  ref={measureDrawingButtonRef}
                  type="button"
                  className="num-key drawing-toggle drawing-toggle--active"
                  tabIndex={-1}
                >
                  <LiaMarkerSolid size={22} />
                </button>
                <div className="tool-tray__content tool-tray__content--drawing">
                  <button type="button" className="num-key clear" tabIndex={-1}><MdUndo size={24} /></button>
                  <button type="button" className="num-key clear" tabIndex={-1}><GiMagicBroom size={18} /></button>
                </div>
              </div>
            </div>
            {toolTraySequence !== null && stagedToolPhase === 'move' && (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className={`tool-tray__mover num-key ${toolToggleClass(toolTraySequence.target)}${stagedToolDirection === 'forward' ? ' tool-tray__mover--selected' : ''}${toolTraySequence.moveActive ? ' tool-tray__mover--active' : ''}`}
                style={{
                  left: `${toolTraySequence.mover.left}px`,
                  top: `${toolTraySequence.mover.top}px`,
                  width: `${toolTraySequence.mover.width}px`,
                  height: `${toolTraySequence.mover.height}px`,
                  transform: toolTraySequence.moveActive
                    ? `translate(${toolTraySequence.mover.deltaX}px, ${toolTraySequence.mover.deltaY}px)`
                    : 'translate(0, 0)',
                }}
              >
                {renderToolIcon(toolTraySequence.target)}
              </button>
            )}
            <div
              className={`num-pad-toolbar tool-tray__panel ${toolTrayPanelClass('main', 'active')} ${mainToolPanelClass()}`.trim()}
              role="toolbar"
              aria-label="Game tools"
              aria-hidden={visibleToolTray !== 'main'}
            >
              <button
                className={`num-key clear ${mainToolButtonClass('undo')}`}
                type="button"
                aria-label="Undo"
                disabled={undoDisabled}
                onClick={(event) => handleMomentaryButtonClick(event, undo)}
              >
                <MdUndo size={24} />
              </button>
              <button
                className={`num-key clear ${mainToolButtonClass('clear')}`}
                type="button"
                aria-label="Clear cell"
                disabled={paused || won}
                onClick={(event) => handleMomentaryButtonClick(event, clearCell)}
              >
                <FaEraser size={22} />
              </button>
              <button
                type="button"
                ref={mainNotesButtonRef}
                className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''} ${mainToolButtonClass('notes')}`}
                aria-label="Toggle notes mode"
                aria-pressed={notesMode}
                disabled={paused || won}
                onClick={toggleNotesTools}
              >
                <FaPencilAlt size={20} />
              </button>
              <button
                type="button"
                ref={mainBrushButtonRef}
                className={`num-key brush-toggle${brushMode ? ' brush-toggle--active' : ''} ${mainToolButtonClass('brush')}`}
                aria-label="Toggle brush mode"
                aria-pressed={brushMode}
                disabled={paused || won}
                onClick={toggleBrushTools}
              >
                <FaBrush size={20} />
              </button>
              <button
                type="button"
                ref={mainDrawingButtonRef}
                className={`num-key drawing-toggle${drawingMode ? ' drawing-toggle--active' : ''} ${mainToolButtonClass('drawing')}`}
                aria-label="Toggle free drawing"
                aria-pressed={drawingMode}
                disabled={paused || won}
                onClick={toggleDrawingTools}
              >
                <LiaMarkerSolid size={22} />
              </button>
            </div>
            {toolTrayOverlayView === 'main' && (
              <div
                className={`num-pad-toolbar tool-tray__panel tool-tray__panel--overlay ${toolTrayPanelClass('main', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                <button type="button" className="num-key clear" tabIndex={-1}>
                  <MdUndo size={24} />
                </button>
                <button type="button" className="num-key clear" tabIndex={-1}>
                  <FaEraser size={22} />
                </button>
                <button type="button" className="num-key notes-toggle" tabIndex={-1}>
                  <FaPencilAlt size={20} />
                </button>
                <button type="button" className="num-key brush-toggle" tabIndex={-1}>
                  <FaBrush size={20} />
                </button>
                <button type="button" className="num-key drawing-toggle" tabIndex={-1}>
                  <LiaMarkerSolid size={22} />
                </button>
              </div>
            )}
            <div
              className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub ${toolTrayPanelClass('notes', 'active')}`}
              role="toolbar"
              aria-label="Notes tools"
              aria-hidden={visibleToolTray !== 'notes'}
            >
              <button
                type="button"
                ref={activeNotesButtonRef}
                className={`num-key notes-toggle${isToolTargetClosing('notes') ? '' : ' notes-toggle--active'}${isToolTrayMoving && stagedToolTarget === 'notes' ? ' tool-tray__selected-tool--hidden' : ''}`}
                aria-label="Toggle notes mode"
                aria-pressed={!isToolTargetClosing('notes')}
                disabled={paused || won}
                onClick={toggleNotesTools}
              >
                <FaPencilAlt size={20} />
              </button>
              <div className={subtoolContentClass('notes')}>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Undo"
                  disabled={undoDisabled}
                  onClick={(event) => handleMomentaryButtonClick(event, undo)}
                >
                  <MdUndo size={24} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Fill candidates"
                  disabled={paused || won || !canFillSelectedCandidates}
                  onClick={(event) => handleMomentaryButtonClick(event, fillCandidates)}
                >
                  <FaWandMagic size={20} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Fill all candidates"
                  disabled={paused || won || !hasAnyFillableCell}
                  onClick={(event) => handleMomentaryButtonClick(event, fillAllCandidates)}
                >
                  <FaWandMagicSparkles size={20} />
                </button>
              </div>
            </div>
            {toolTrayOverlayView === 'notes' && (
              <div
                className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub tool-tray__panel--overlay ${toolTrayPanelClass('notes', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                <button
                  type="button"
                  className="num-key notes-toggle notes-toggle--active"
                  aria-pressed="true"
                  tabIndex={-1}
                >
                  <FaPencilAlt size={20} />
                </button>
                <div className="tool-tray__content tool-tray__content--notes">
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <MdUndo size={24} />
                  </button>
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <FaWandMagic size={20} />
                  </button>
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <FaWandMagicSparkles size={20} />
                  </button>
                </div>
              </div>
            )}
            <div
              className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub ${toolTrayPanelClass('brush', 'active')}`}
              role="toolbar"
              aria-label="Brush tools"
              aria-hidden={visibleToolTray !== 'brush'}
            >
              <button
                type="button"
                ref={activeBrushButtonRef}
                className={`num-key brush-toggle${isToolTargetClosing('brush') ? '' : ' brush-toggle--active'}${isToolTrayMoving && stagedToolTarget === 'brush' ? ' tool-tray__selected-tool--hidden' : ''}`}
                aria-label="Toggle brush mode"
                aria-pressed={!isToolTargetClosing('brush')}
                disabled={paused || won}
                onClick={toggleBrushTools}
              >
                <FaBrush size={20} />
              </button>
              <div className={subtoolContentClass('brush')}>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Undo"
                  disabled={undoDisabled}
                  onClick={(event) => handleMomentaryButtonClick(event, undo)}
                >
                  <MdUndo size={24} />
                </button>
                <button
                  type="button"
                  className={`num-key clear${candidateBrushMode ? ' brush-mode-toggle--active' : ''}`}
                  aria-label="Toggle candidate coloring mode"
                  aria-pressed={candidateBrushMode}
                  disabled={paused || won}
                  onClick={() => {
                    setCandidateBrushMode(prev => {
                      const next = !prev
                      if (!next) closeCandidateOverlay()
                      return next
                    })
                  }}
                >
                  <TbNumbers size={18} />
                </button>
                <button
                  type="button"
                  className={`num-key clear${firstColorFlagEnabled ? ' flag-toggle--active' : ''}`}
                  aria-label="Toggle first color flag"
                  aria-pressed={firstColorFlagEnabled}
                  disabled={paused || won}
                  onClick={() => setFirstColorFlagEnabled(prev => !prev)}
                >
                  <PiFlagCheckeredFill size={18} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Clear colors"
                  disabled={paused || won || !hasAnyColors}
                  onClick={(event) => handleMomentaryButtonClick(event, clearAllColors)}
                >
                  <GiMagicBroom size={18} />
                </button>
              </div>
            </div>
            {toolTrayOverlayView === 'brush' && (
              <div
                className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub tool-tray__panel--overlay ${toolTrayPanelClass('brush', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                <button
                  type="button"
                  className="num-key brush-toggle brush-toggle--active"
                  aria-pressed="true"
                  tabIndex={-1}
                >
                  <FaBrush size={20} />
                </button>
                <div className="tool-tray__content tool-tray__content--brush">
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <MdUndo size={24} />
                  </button>
                  <button
                    type="button"
                    className={`num-key clear${candidateBrushMode ? ' brush-mode-toggle--active' : ''}`}
                    aria-pressed={candidateBrushMode}
                    tabIndex={-1}
                  >
                    <TbNumbers size={18} />
                  </button>
                  <button
                    type="button"
                    className={`num-key clear${firstColorFlagEnabled ? ' flag-toggle--active' : ''}`}
                    aria-pressed={firstColorFlagEnabled}
                    tabIndex={-1}
                  >
                    <PiFlagCheckeredFill size={18} />
                  </button>
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <GiMagicBroom size={18} />
                  </button>
                </div>
              </div>
            )}
            <div
              className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub ${toolTrayPanelClass('drawing', 'active')}`}
              role="toolbar"
              aria-label="Drawing tools"
              aria-hidden={visibleToolTray !== 'drawing'}
            >
              <button
                type="button"
                ref={activeDrawingButtonRef}
                className={`num-key drawing-toggle${isToolTargetClosing('drawing') ? '' : ' drawing-toggle--active'}${isToolTrayMoving && stagedToolTarget === 'drawing' ? ' tool-tray__selected-tool--hidden' : ''}`}
                aria-label="Toggle free drawing"
                aria-pressed={!isToolTargetClosing('drawing')}
                disabled={paused || won}
                onClick={toggleDrawingTools}
              >
                <LiaMarkerSolid size={22} />
              </button>
              <div className={subtoolContentClass('drawing')}>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Undo"
                  disabled={undoDisabled}
                  onClick={(event) => handleMomentaryButtonClick(event, undo)}
                >
                  <MdUndo size={24} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Clear drawings"
                  disabled={paused || won || !hasAnyDrawings}
                  onClick={(event) => handleMomentaryButtonClick(event, clearAllDrawings)}
                >
                  <GiMagicBroom size={18} />
                </button>
              </div>
            </div>
            {toolTrayOverlayView === 'drawing' && (
              <div
                className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub tool-tray__panel--overlay ${toolTrayPanelClass('drawing', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                <button
                  type="button"
                  className="num-key drawing-toggle drawing-toggle--active"
                  aria-pressed="true"
                  tabIndex={-1}
                >
                  <LiaMarkerSolid size={22} />
                </button>
                <div className="tool-tray__content tool-tray__content--drawing">
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <MdUndo size={24} />
                  </button>
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <GiMagicBroom size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className={`input-pad-switcher input-pad-switcher--${visibleLowerPad}`}>
            <div
              className={`number-pad input-pad__panel ${lowerPadPanelClass('numbers', 'active')}`}
              role="toolbar"
              aria-label="Number entry"
              aria-hidden={visibleLowerPad !== 'numbers'}
            >
              {renderNumberPad()}
            </div>
            {lowerPadOverlayView === 'numbers' && (
              <div
                className={`number-pad input-pad__panel input-pad__panel--overlay ${lowerPadPanelClass('numbers', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                {renderNumberPad(-1)}
              </div>
            )}
            <div
              className={`number-pad brush-color-pad input-pad__panel ${lowerPadPanelClass('colors', 'active')}`}
              role="toolbar"
              aria-label="Brush colors"
              aria-hidden={visibleLowerPad !== 'colors'}
            >
              {renderColorPad()}
            </div>
            {lowerPadOverlayView === 'colors' && (
              <div
                className={`number-pad brush-color-pad input-pad__panel input-pad__panel--overlay ${lowerPadPanelClass('colors', 'overlay')}`}
                role="presentation"
                aria-hidden="true"
              >
                {renderColorPad(-1)}
              </div>
            )}
          </div>
        </div>
      </div>
      {candidateOverlay && (
        <>
          <button
            type="button"
            className="brush-candidate-backdrop"
            aria-label="Close candidate painter"
            onClick={closeCandidateOverlay}
          />
          <div
            className="brush-candidate-overlay"
            role="dialog"
            aria-label="Candidate painter"
            style={{
              top: `${candidateOverlay.top}px`,
              left: `${candidateOverlay.left}px`,
              width: `${candidateOverlay.size}px`,
              height: `${candidateOverlay.size}px`,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
              const hasCandidate = overlayCellNotes.includes(d)
              const colorIds = candidateColors[candidateOverlay.r][candidateOverlay.c][d - 1]
              return (
                <button
                  key={d}
                  type="button"
                  className={`brush-candidate-button${hasCandidate ? '' : ' brush-candidate-button--empty'}`}
                  aria-label={hasCandidate ? `Paint candidate ${d}` : `Candidate ${d} unavailable`}
                  disabled={!hasCandidate || overlayHasCellColor}
                  onPointerMove={() => {
                    if (hasCandidate && !overlayHasCellColor) setCandidateOverlayPreviewDigit(d)
                  }}
                  onPointerDown={() => {
                    if (hasCandidate && !overlayHasCellColor) setCandidateOverlayPreviewDigit(d)
                  }}
                  onClick={() => {
                    const changed = applyCandidateBrushColorAt(candidateOverlay.r, candidateOverlay.c, d)
                    if (changed) {
                      setCandidateSelectedDigit(d)
                      closeCandidateOverlay(true)
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
      )}
      {won && (
        <div className="victory-overlay">
          <div className="victory-card">
            <div className="victory-icon" aria-hidden>🎉</div>
            <h2 className="victory-title">Puzzle Complete!</h2>
            <p className="victory-time">{formatTime(finalTime)}</p>
            <div className="victory-actions">
              <button type="button" onClick={handleRetry}>Retry</button>
              {onShare && <button type="button" className={shareCopied ? 'copied' : ''} onClick={() => {
                onShare()
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2200)
              }}>{shareCopied ? 'URL Copied!' : 'Share'}</button>}
              <button type="button" onClick={onNew ?? (() => newGame())}>New Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
