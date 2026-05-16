import React, { useEffect, useState } from 'react'
import { generateGame, Grid } from '../utils/sudoku'
import type { CoordinateLabelMode } from '../utils/coordinateLabels'
import PencilOverlay from './PencilOverlay'
import {
  type CandidateColorGrid,
  type CellColorGrid,
  type DrawingStroke,
  type FlaggedColorCell,
  type PuzzleMetadata,
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
import { useI18n } from '../utils/i18n'
import type { RequiredTechniques } from '../utils/generators/hodoku'
import type { BoardHistoryEntry, BrushColorId } from '../store/gameTypes'
import {
  cloneGrid, cloneNotesGrid, cloneCellColorsGrid, cloneCandidateColorsGrid,
  cloneDrawingStrokesGrid, cloneFlaggedColorCell, makeHistoryEntry,
  BRUSH_COLORS, BRUSH_SWATCH_MAP, DEFAULT_BRUSH_COLOR,
  toggleColorInSelection,
  type ToolTrayView, type ToolTrayTransition, type LowerPadView,
  type LowerPadTransition,
  type ToolTraySequence, type CandidateOverlayState,
  TOOL_TRAY_ANIMATION_MS,
  formatTime, hasCellBrushColorsAt, hasAnyBrushColorsOnBoard,
  resolveFlaggedColorCell, emptyCandidateColorCell,
} from './board/boardUtils'
import BoardControlsPanel from './board/BoardControlsPanel'
import BoardGrid from './board/BoardGrid'
import BoardSurface from './board/BoardSurface'
import VictoryOverlay from './board/VictoryOverlay'
import CandidateOverlayComp from './board/CandidateOverlay'
import TechniquesSidebar, { type TechniquesSidebarHandle } from './board/TechniquesSidebar'

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
  pencilMode?: boolean
  coordinateLabels?: CoordinateLabelMode
  firstColorFlag?: boolean
  restartRef?: React.MutableRefObject<(() => void) | null>
  clearColorsRef?: React.MutableRefObject<(() => void) | null>
  clearDrawingsRef?: React.MutableRefObject<(() => void) | null>
  identifyCandidatesRef?: React.MutableRefObject<(() => void) | null>
  onClearPaintingAvailabilityChange?: (available: boolean) => void
  onClearDrawingsAvailabilityChange?: (available: boolean) => void
  onIdentifyCandidatesAvailabilityChange?: (available: boolean) => void
  paintingScope?: 'digit' | 'candidate'
  puzzleMetadata?: PuzzleMetadata | null
}


export default function Board({
  puzzle: initialProp,
  setPuzzle: setPuzzleProp,
  onBack,
  solution: solutionProp,
  autoCheck,
  autoRemove,
  haptic,
  onTriggerHaptic,
  onTriggerErrorHaptic,
  onNew,
  onShare,
  onWin,
  difficulty,
  pencilMode,
  coordinateLabels,
  firstColorFlag,
  restartRef,
  clearColorsRef,
  clearDrawingsRef,
  identifyCandidatesRef,
  onClearPaintingAvailabilityChange,
  onClearDrawingsAvailabilityChange,
  onIdentifyCandidatesAvailabilityChange,
  paintingScope,
  puzzleMetadata,
}: Props){
  const { localizeDifficultyLabel, t } = useI18n()
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
    return null
  })

  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [eraserMode, setEraserMode] = useState(false)
  const [pencilOverlayCell, setPencilOverlayCell] = useState<{ r: number; c: number; rect: { top: number; left: number; width: number; height: number }; initialPointer?: { clientX: number; clientY: number; pointerId: number } } | null>(null)
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
  const [savedPuzzleMetadata] = useState<PuzzleMetadata | null>(() => loadSaved()?.puzzleMetadata ?? null)
  const activePuzzleMetadata = puzzleMetadata ?? savedPuzzleMetadata
  const flaggedColorCellRef = React.useRef(flaggedColorCell)
  flaggedColorCellRef.current = flaggedColorCell
  const [drawingDraft, setDrawingDraft] = useState<DrawingStroke | null>(null)
  const drawingDraftRef = React.useRef(drawingDraft)
  drawingDraftRef.current = drawingDraft
  const [history, setHistory] = useState<BoardHistoryEntry[]>([])
  const [redoHistory, setRedoHistory] = useState<BoardHistoryEntry[]>([])
  // Guards against touch ghost-click: onPointerDown applies immediately, and onClick skips re-applying.
  // For the last remaining digit, the button disables before click arrives, so haptic is deferred to pointerup.
  const touchFiredRef = React.useRef<
    'ok' | 'error' | 'pending-ok' | 'pending-error' | 'handled-ok' | 'handled-error' | null
  >(null)
  const [elapsed, setElapsed] = useState(() => loadElapsed())
  const [paused, setPaused] = useState(false)
  const [, setManualPause] = useState(false)
  const [won, setWon] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  // shareCopied → VictoryOverlay component
  const [brushMode, setBrushMode] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [candidateToolMode, setCandidateToolMode] = useState(false)
  const [historyToolMode, setHistoryToolMode] = useState(false)
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
  const activePaintingScope = paintingScope ?? (savedBrushPrefs?.candidateMode ? 'candidate' : 'digit')
  const candidateBrushMode = brushMode && activePaintingScope === 'candidate'
  const firstColorFlagEnabled = firstColorFlag ?? false
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
  const boardRef = React.useRef<HTMLDivElement | null>(null)
  const techniquesRef = React.useRef<TechniquesSidebarHandle>(null)
  const toolTrayRef = React.useRef<HTMLDivElement | null>(null)
  const [boardPixelWidth, setBoardPixelWidth] = useState<number | null>(null)
  const [requiredTechniquesLoading, setRequiredTechniquesLoading] = useState(false)
  const [requiredTechniquesResult, setRequiredTechniquesResult] = useState<RequiredTechniques | null>(null)
  const [requiredTechniquesError, setRequiredTechniquesError] = useState<string | null>(null)
  const [portraitTechniquesSummaryDismissed, setPortraitTechniquesSummaryDismissed] = useState(false)
  const [techniquesOpen, setTechniquesOpen] = useState(false)
  const [techniquesDockedOpen, setTechniquesDockedOpen] = useState(false)
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
  )
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

  const closeCandidateOverlay = React.useCallback((preserveSelectedDigit = false) => {
    setCandidateOverlay(null)
    setCandidateOverlayPreviewDigit(null)
    if (!preserveSelectedDigit) {
      setCandidateSelectedDigit(null)
    }
  }, [])

  function disableDrawingMode() {
    setDrawingDraft(null)
    drawingPointerIdRef.current = null
    setDrawingMode(false)
  }

  const updatePaused = React.useCallback((next: boolean) => {
    if (next) {
      closeCandidateOverlay()
      setDrawingDraft(null)
      drawingPointerIdRef.current = null
    }
    setPaused(next)
  }, [closeCandidateOverlay])

  // Auto-pause when the tab/window loses focus; never auto-resume.
  // Using focusout on document: relatedTarget is non-null for within-page
  // focus transitions, and null when focus leaves the document entirely.
  useEffect(() => {
    function onBlur() { updatePaused(true) }
    function onVisibility() { if (document.hidden) updatePaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [updatePaused])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setElapsed(s => { saveElapsed(s + 1); return s + 1 }), 1000)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    const boardElement = boardRef.current
    if (boardElement === null) return

    const updateBoardPixelWidth = () => {
      const nextWidth = Math.round(boardElement.getBoundingClientRect().width)
      setBoardPixelWidth(prev => (prev === nextWidth ? prev : nextWidth))
    }

    updateBoardPixelWidth()
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateBoardPixelWidth())
      : null

    resizeObserver?.observe(boardElement)
    window.addEventListener('resize', updateBoardPixelWidth)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateBoardPixelWidth)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mediaQuery = window.matchMedia('(orientation: landscape)')
    const updateLandscape = (event?: MediaQueryListEvent) => {
      setIsLandscape(event?.matches ?? mediaQuery.matches)
    }
    updateLandscape()
    mediaQuery.addEventListener('change', updateLandscape)
    return () => mediaQuery.removeEventListener('change', updateLandscape)
  }, [])

  useEffect(() => {
    saveBrushPrefs([activeBrushColor], activePaintingScope === 'candidate', [activeDrawingColor], false)
  }, [activeBrushColor, activeDrawingColor, activePaintingScope])

  useEffect(() => () => {
    techniquesRef.current?.reset()
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


  /* eslint-disable react-hooks/set-state-in-effect */
  // Win detection commits the solved state exactly once when the grid matches the solution.
  useEffect(() => {
    if (won) return
    if (!solutionGrid || internalPuzzle.length !== 9) return
    const complete = internalPuzzle.every((row, r) => row.every((n, c) => n === solutionGrid[r][c]))
    if (complete) {
      setWon(true)
      updatePaused(true)
      setFinalTime(elapsed)
      saveCompleted()
      onWin?.()
    }
  }, [elapsed, internalPuzzle, onWin, solutionGrid, updatePaused, won])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (internalPuzzle.length !== 9 || !initialGrid) return
    saveGame(initialGrid, internalPuzzle, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell, activePuzzleMetadata)
  }, [internalPuzzle, initialGrid, solutionGrid, notes, cellColors, candidateColors, drawingStrokes, flaggedColorCell, activePuzzleMetadata])

  useEffect(() => {
    if (initialProp && initialProp.length === 9) return
    if (internalPuzzle.length > 0) return
    generateGame().then(({ puzzle, solution }) => {
      setInitialGrid(cloneGrid(puzzle))
      setInternalPuzzle(puzzle)
      setSolutionGrid(solution)
    })
  }, [initialProp]) // eslint-disable-line react-hooks/exhaustive-deps

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
    techniquesRef.current?.reset()
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
    setRedoHistory([])
    setElapsed(0)
    clearElapsed()
    drawingPointerIdRef.current = null
    updatePaused(false)
    setManualPause(false)
    setWon(false)
    setHistoryToolMode(false)
    setBrushMode(false)
    setDrawingMode(false)
    setCandidateToolMode(false)
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
    saveGame(initial, p, s, undefined, undefined, undefined, emptyDrawingStrokes(), null, activePuzzleMetadata)
    setSelected(null)
  }

  function handleRetry() {
    if (!initialGrid) return
    techniquesRef.current?.reset()
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
    setRedoHistory([])
    setElapsed(0)
    clearElapsed()
    drawingPointerIdRef.current = null
    updatePaused(false)
    setManualPause(false)
    setWon(false)
    setHistoryToolMode(false)
    setBrushMode(false)
    setDrawingMode(false)
    setCandidateToolMode(false)
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
    saveGame(initialGrid, cloneGrid(initialGrid), solutionGrid, undefined, undefined, undefined, emptyDrawingStrokes(), null, activePuzzleMetadata)
  }

  if (restartRef) restartRef.current = handleRetry
  if (clearColorsRef) clearColorsRef.current = () => { clearAllColors() }
  if (clearDrawingsRef) clearDrawingsRef.current = () => { clearAllDrawings() }
  if (identifyCandidatesRef) identifyCandidatesRef.current = () => { fillAllCandidates() }

  function isClue(r: number, c: number): boolean {
    return initialGrid !== null && initialGrid[r][c] !== 0
  }

  function selectCell(r: number, c: number) {
    setCandidateSelectedDigit(null)
    setSelected(prev => (prev?.r === r && prev?.c === c ? null : { r, c }))
  }

  function focusCell(r: number, c: number) {
    setSelected({ r, c })
  }

  function openPencilOverlayForCell(
    r: number,
    c: number,
    target: HTMLButtonElement,
    initialPointer: { clientX: number; clientY: number; pointerId: number },
  ) {
    setSelected({ r, c })
    const domRect = target.getBoundingClientRect()
    setPencilOverlayCell({
      r,
      c,
      rect: { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height },
      initialPointer,
    })
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
    if (internalPuzzle[r][c] !== 0) return false
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
    pushHistoryEntry(historyEntry)
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
    pushHistoryEntry(historyEntry)
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
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

  function pushHistoryEntry(entry: BoardHistoryEntry) {
    setHistory(prev => [...prev.slice(-50), entry])
    setRedoHistory([])
  }

  function getCurrentHistoryEntry() {
    return makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
  }

  function restoreHistoryEntry(entry: BoardHistoryEntry) {
    const restoredPuzzle = cloneGrid(entry.puzzle)
    const restoredNotes = cloneNotesGrid(entry.notes)
    const restoredCellColors = cloneCellColorsGrid(entry.cellColors)
    const restoredCandidateColors = cloneCandidateColorsGrid(entry.candidateColors)
    const restoredDrawingStrokes = cloneDrawingStrokesGrid(entry.drawingStrokes)
    const restoredFlaggedColorCell = cloneFlaggedColorCell(entry.flaggedColorCell)
    closeCandidateOverlay()
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
  }

  function toggleNotesTools() {
    const next = !notesMode
    closeCandidateOverlay()
    setNotesMode(next)
    setEraserMode(false)
    setCandidateToolMode(false)
    setHistoryToolMode(false)
    if (next) {
      setBrushMode(false)
      disableDrawingMode()
      switchLowerPad('numbers', 'backward')
    }
  }

  function toggleBrushTools() {
    const next = !brushMode
    setBrushMode(next)
    setEraserMode(false)
    setCandidateToolMode(false)
    setHistoryToolMode(false)
    if (next) {
      closeCandidateOverlay()
      setNotesMode(false)
      disableDrawingMode()
      switchLowerPad('colors', 'forward')
    } else {
      closeCandidateOverlay()
      switchLowerPad('numbers', 'backward')
    }
  }

  function toggleDrawingTools() {
    const next = !drawingMode
    closeCandidateOverlay()
    setEraserMode(false)
    setCandidateToolMode(false)
    setHistoryToolMode(false)
    if (next) {
      setDrawingMode(true)
      setNotesMode(false)
      setBrushMode(false)
      switchLowerPad('colors', 'forward')
    } else {
      disableDrawingMode()
      switchLowerPad('numbers', 'backward')
    }
  }

  function toggleCandidateTools() {
    const next = !candidateToolMode
    closeCandidateOverlay()
    setCandidateToolMode(next)
    setEraserMode(false)
    setHistoryToolMode(false)
    if (next) {
      setNotesMode(false)
      setBrushMode(false)
      disableDrawingMode()
      switchLowerPad('numbers', 'backward')
    }
  }

  function toggleHistoryTools() {
    closeCandidateOverlay(true)
    setHistoryToolMode(prev => !prev)
  }

  function toggleEraserMode() {
    closeCandidateOverlay()
    setHistoryToolMode(false)
    setCandidateToolMode(false)
    setEraserMode(prev => !prev)
  }

  function handleMomentaryButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => boolean,
    alwaysHaptic = false,
  ) {
    const changed = action()
    event.currentTarget.blur()
    if (haptic && (alwaysHaptic || changed)) onTriggerHaptic?.()
  }

  function handleModeButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    action()
    event.currentTarget.blur()
    if (haptic) onTriggerHaptic?.()
  }



  // techniques functions → TechniquesSidebar



  // techniques functions → TechniquesSidebar

  // techniques functions → TechniquesSidebar

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
    pushHistoryEntry(historyEntry)
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCellColors(nextCellColors)
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function openCandidateOverlay(
    r: number,
    c: number,
    target: HTMLElement,
    mode: CandidateOverlayState['mode'] = 'paint',
  ) {
    if (mode === 'paint') {
      setCandidateSelectedDigit(null)
    }
    setSelected({ r, c })
    if (
      internalPuzzle[r][c] !== 0 ||
      notesRef.current[r][c].length === 0 ||
      (mode === 'paint' && cellColorsRef.current[r][c].length > 0)
    ) {
      setCandidateOverlay(null)
      return false
    }
    const { top, left, size } = getCandidateOverlayPosition(target.getBoundingClientRect())
    if (mode === 'paint') {
      setCandidateSelectedDigit(null)
    }
    setCandidateOverlayPreviewDigit(null)
    setCandidateOverlay({ r, c, top, left, size, mode })
    return true
  }

  function removeCandidateAt(r: number, c: number, d: number) {
    if (!notesRef.current[r][c].includes(d)) return false

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

    pushHistoryEntry(historyEntry)
    setNotes(prev => {
      const next = prev.map(row => row.map(cell => [...cell]))
      next[r][c] = next[r][c].filter(candidate => candidate !== d)
      return next
    })
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
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

  function applyDigit(d: number, overrideCell?: { r: number; c: number }): boolean {
    const target = overrideCell ?? selected
    if (!target) return false
    const { r, c } = target
    if (isClue(r, c)) return false
    if (remaining[d] === 0) return false
    if (brushMode || drawingMode) return false
    const existingDigit = internalPuzzle[r][c]
    if (existingDigit !== 0 && solutionGrid !== null && existingDigit === solutionGrid[r][c]) return false
    if (notesMode) {
      setCandidateSelectedDigit(d)
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
      pushHistoryEntry(historyEntry)
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        const cell = next[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0 && !pencilMode) cell.splice(idx, 1)
        else if (idx < 0) cell.push(d)
        return next
      })
      flaggedColorCellRef.current = nextFlaggedColorCell
      setCandidateColors(nextCandidateColors)
      setFlaggedColorCell(nextFlaggedColorCell)
    } else {
      setCandidateSelectedDigit(null)
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
      pushHistoryEntry(historyEntry)
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

  function clearCellAt(r: number, c: number): boolean {
    if (isClue(r, c)) return false
    setCandidateOverlay(null)
    setSelected({ r, c })
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
    pushHistoryEntry(historyEntry)
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

  function clearCell() {
    if (!selected) return false
    const { r, c } = selected
    if (drawingMode) return false
    return clearCellAt(r, c)
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
    pushHistoryEntry(historyEntry)
    setNotes(nextNotes)
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateColors(nextCandidateColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    return true
  }

  function applySingleCandidatesToDigits() {
    const hasSingleCandidate = internalPuzzle.some((row, r) =>
      row.some((n, c) => !isClue(r, c) && n === 0 && notesRef.current[r][c].length === 1)
    )
    if (!hasSingleCandidate) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
      drawingStrokesRef.current,
      flaggedColorCellRef.current,
    )
    const nextPuzzle = cloneGrid(internalPuzzle)
    const nextNotes = cloneNotesGrid(notesRef.current)
    const nextCellColors = cloneCellColorsGrid(cellColorsRef.current)
    const nextCandidateColors = cloneCandidateColorsGrid(candidateColorsRef.current)
    let changed = false
    let keepPromoting = true

    while (keepPromoting) {
      keepPromoting = false
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (isClue(r, c) || nextPuzzle[r][c] !== 0 || nextNotes[r][c].length !== 1) continue
          const d = nextNotes[r][c][0]
          nextPuzzle[r][c] = d
          nextNotes[r][c] = []
          nextCellColors[r][c] = []
          nextCandidateColors[r][c] = emptyCandidateColorCell()

          const canValidateEntry = autoCheck && solutionGrid !== null
          const isCorrectEntry = solutionGrid !== null && d === solutionGrid[r][c]
          const shouldAutoRemove = autoRemove && (!canValidateEntry || isCorrectEntry)
          if (shouldAutoRemove) {
            const boxR = Math.floor(r / 3) * 3
            const boxC = Math.floor(c / 3) * 3
            for (let i = 0; i < 9; i++) {
              if (nextNotes[r][i].length) nextNotes[r][i] = nextNotes[r][i].filter(n => n !== d)
              if (nextNotes[i][c].length) nextNotes[i][c] = nextNotes[i][c].filter(n => n !== d)
              nextCandidateColors[r][i][d - 1] = []
              nextCandidateColors[i][c][d - 1] = []
            }
            for (let br = boxR; br < boxR + 3; br++) {
              for (let bc = boxC; bc < boxC + 3; bc++) {
                if (nextNotes[br][bc].length) nextNotes[br][bc] = nextNotes[br][bc].filter(n => n !== d)
                nextCandidateColors[br][bc][d - 1] = []
              }
            }
          }

          changed = true
          keepPromoting = true
        }
      }
    }

    if (!changed) return false
    const nextFlaggedColorCell = resolveFlaggedColorCell(
      flaggedColorCellRef.current,
      nextCellColors,
      nextCandidateColors,
      false,
      null,
      firstColorFlagEnabled,
    )
    pushHistoryEntry(historyEntry)
    flaggedColorCellRef.current = nextFlaggedColorCell
    setCandidateSelectedDigit(null)
    setNotes(nextNotes)
    setCandidateColors(nextCandidateColors)
    setCellColors(nextCellColors)
    setFlaggedColorCell(nextFlaggedColorCell)
    setInternalPuzzle(nextPuzzle)
    if (setPuzzleProp) setPuzzleProp(nextPuzzle)
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
    pushHistoryEntry(historyEntry)
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
    pushHistoryEntry(historyEntry)
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
    pushHistoryEntry(historyEntry)
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
    const currentEntry = getCurrentHistoryEntry()
    restoreHistoryEntry(entry)
    setHistory(prev => prev.slice(0, -1))
    setRedoHistory(prev => [...prev.slice(-50), currentEntry])
    return true
  }

  function redo() {
    const entry = redoHistory[redoHistory.length - 1]
    if (!entry) return false
    const currentEntry = getCurrentHistoryEntry()
    restoreHistoryEntry(entry)
    setRedoHistory(prev => prev.slice(0, -1))
    setHistory(prev => [...prev.slice(-50), currentEntry])
    return true
  }

  const hasAnyFillableCell = internalPuzzle.some((row, r) =>
    row.some((n, c) => !isClue(r, c) && n === 0 && notes[r][c].length === 0)
  )
  const hasAnyColors = hasAnyBrushColorsOnBoard(cellColors, candidateColors)
  const hasAnyDrawings = drawingStrokes.length > 0
  useEffect(() => {
    onClearPaintingAvailabilityChange?.(hasAnyColors)
  }, [hasAnyColors, onClearPaintingAvailabilityChange])
  useEffect(() => {
    onClearDrawingsAvailabilityChange?.(hasAnyDrawings)
  }, [hasAnyDrawings, onClearDrawingsAvailabilityChange])
  useEffect(() => {
    onIdentifyCandidatesAvailabilityChange?.(hasAnyFillableCell)
  }, [hasAnyFillableCell, onIdentifyCandidatesAvailabilityChange])

  const showRequiredTechniques = React.useCallback(async () => {
    setPortraitTechniquesSummaryDismissed(false)
    setRequiredTechniquesLoading(true)
    try {
      if (typeof window !== 'undefined') {
        await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
      }
      return await (techniquesRef.current?.show({ openSidebar: isLandscape }) ?? Promise.resolve(false))
    } finally {
      setRequiredTechniquesLoading(false)
    }
  }, [isLandscape])

  const openRequiredTechniquesSidebar = React.useCallback(() => {
    techniquesRef.current?.open()
  }, [])

  const hideRequiredTechniquesSummary = React.useCallback(() => {
    setPortraitTechniquesSummaryDismissed(true)
  }, [])

  if(internalPuzzle.length===0) return null

  // count how many of each digit (1-9) are correctly placed (or just placed) in the grid
  const digitCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  for (const row of internalPuzzle) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  const remaining: Record<number, number> = {}
  for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])

  const selectedDigit =
    selected !== null ? internalPuzzle[selected.r][selected.c] : 0
  const highlightedDigit = candidateOverlayPreviewDigit ?? candidateSelectedDigit ?? selectedDigit
  const selectedHasCellColor =
    selected !== null && cellColors[selected.r][selected.c].length > 0
  const selectedHasCandidateColors =
    selected !== null && candidateColors[selected.r][selected.c].some(color => color.length > 0)
  const selectedHasAnyColors = selectedHasCellColor || selectedHasCandidateColors
  const overlayCellNotes = candidateOverlay ? notes[candidateOverlay.r][candidateOverlay.c] : []
  const overlayHasCellColor =
    candidateOverlay !== null && cellColors[candidateOverlay.r][candidateOverlay.c].length > 0
  const hasSingleCandidates = notes.some((row, r) =>
    row.some((cell, c) => !isClue(r, c) && internalPuzzle[r][c] === 0 && cell.length === 1)
  )
  const undoDisabled = history.length === 0 || paused || won
  const redoDisabled = redoHistory.length === 0 || paused || won
  const activeFlaggedColorCell =
    firstColorFlagEnabled &&
    flaggedColorCell !== null &&
    hasCellBrushColorsAt(cellColors, candidateColors, flaggedColorCell.r, flaggedColorCell.c)
      ? flaggedColorCell
      : null
  const renderedDrawingStrokes = drawingDraft === null ? drawingStrokes : [...drawingStrokes, drawingDraft]

  function toggleReferenceDigitHighlight(d: number) {
    setCandidateOverlay(null)
    setCandidateOverlayPreviewDigit(null)
    setSelected(null)
    setCandidateSelectedDigit(prev => (prev === d ? null : d))
  }

  const displayedDifficulty = localizeDifficultyLabel(difficulty ?? puzzleMetadata?.difficultyLabel) ?? t('board.customDifficulty')
  const requiredTechniquesSummary =
    !isLandscape &&
    !techniquesOpen &&
    !portraitTechniquesSummaryDismissed &&
    requiredTechniquesError === null &&
    requiredTechniquesResult !== null &&
    requiredTechniquesResult.steps.length > 0
      ? {
          technique: requiredTechniquesResult.steps[0].technique,
          notation: requiredTechniquesResult.steps[0].notation,
        }
      : null

  return (
    <div className="game-layout game-layout--board">
      {!onBack && <div style={{alignSelf:'flex-end'}}><button type="button" onClick={newGame}>{t('board.new')}</button></div>}
      <div className={`game-main game-main--board${techniquesDockedOpen ? ' game-main--with-techniques-docked' : ''}`}>
        <BoardSurface
          displayedDifficulty={displayedDifficulty}
          boardPixelWidth={boardPixelWidth}
          elapsed={elapsed}
          paused={paused}
          won={won}
          pencilMode={pencilMode}
          coordinateLabels={coordinateLabels}
          boardRef={boardRef}
          drawingMode={drawingMode}
          renderedDrawingStrokes={renderedDrawingStrokes}
          onTogglePause={() => {
            const next = !paused
            setManualPause(next)
            updatePaused(next)
          }}
          onResume={() => {
            setManualPause(false)
            updatePaused(false)
          }}
          startDrawing={startDrawing}
          moveDrawing={moveDrawing}
          stopDrawing={stopDrawing}
          cancelDrawing={cancelDrawing}
          t={t}
        >
          <BoardGrid
            internalPuzzle={internalPuzzle}
            notes={notes}
            cellColors={cellColors}
            candidateColors={candidateColors}
            solutionGrid={solutionGrid}
            selected={selected}
            highlightedDigit={highlightedDigit}
            activeFlaggedColorCell={activeFlaggedColorCell}
            paused={paused}
            won={won}
            autoCheck={autoCheck}
            brushMode={brushMode}
            drawingMode={drawingMode}
            eraserMode={eraserMode}
            pencilMode={pencilMode}
            candidateBrushMode={candidateBrushMode}
            haptic={haptic}
            isClue={isClue}
            clearCellAt={clearCellAt}
            removeCandidateAt={removeCandidateAt}
            openCandidateOverlay={openCandidateOverlay}
            applyCandidateBrushColorAt={applyCandidateBrushColorAt}
            applyCellBrushColorAt={applyCellBrushColorAt}
            closeCandidateOverlay={() => closeCandidateOverlay()}
            selectCell={selectCell}
            focusCell={focusCell}
            setCandidateSelectedDigit={setCandidateSelectedDigit}
            openPencilOverlay={openPencilOverlayForCell}
            onTriggerHaptic={onTriggerHaptic}
          />
        </BoardSurface>
        <BoardControlsPanel
          paused={paused}
          won={won}
          haptic={haptic}
          onTriggerHaptic={onTriggerHaptic}
          onTriggerErrorHaptic={onTriggerErrorHaptic}
          historyToolMode={historyToolMode}
          eraserMode={eraserMode}
          notesMode={notesMode}
          brushMode={brushMode}
          drawingMode={drawingMode}
          pencilMode={pencilMode}
          candidateToolMode={candidateToolMode}
          visibleToolTray={visibleToolTray}
          toolTrayTransition={toolTrayTransition}
          toolTraySequence={toolTraySequence}
          visibleLowerPad={visibleLowerPad}
          lowerPadTransition={lowerPadTransition}
          toolTrayRef={toolTrayRef}
          mainNotesButtonRef={mainNotesButtonRef}
          mainBrushButtonRef={mainBrushButtonRef}
          mainDrawingButtonRef={mainDrawingButtonRef}
          activeNotesButtonRef={activeNotesButtonRef}
          activeBrushButtonRef={activeBrushButtonRef}
          activeDrawingButtonRef={activeDrawingButtonRef}
          measureMainNotesButtonRef={measureMainNotesButtonRef}
          measureMainBrushButtonRef={measureMainBrushButtonRef}
          measureMainDrawingButtonRef={measureMainDrawingButtonRef}
          measureNotesButtonRef={measureNotesButtonRef}
          measureBrushButtonRef={measureBrushButtonRef}
          measureDrawingButtonRef={measureDrawingButtonRef}
          hasAnyColors={hasAnyColors}
          hasAnyDrawings={hasAnyDrawings}
          undoDisabled={undoDisabled}
          redoDisabled={redoDisabled}
          hasAnyFillableCell={hasAnyFillableCell}
          hasSingleCandidates={hasSingleCandidates}
          requiredTechniquesLoading={requiredTechniquesLoading}
          requiredTechniquesOpen={techniquesOpen}
          requiredTechniquesSummary={requiredTechniquesSummary}
          remaining={remaining}
          candidateSelectedDigit={candidateSelectedDigit}
          selectedHasAnyColors={selectedHasAnyColors}
          activeBrushColor={activeBrushColor}
          activeDrawingColor={activeDrawingColor}
          touchFiredRef={touchFiredRef}
          applyDigit={applyDigit}
          toggleReferenceDigitHighlight={toggleReferenceDigitHighlight}
          applyBrushColor={applyBrushColor}
          clearSelectedBrushColors={clearSelectedBrushColors}
          clearAllColors={clearAllColors}
          clearAllDrawings={clearAllDrawings}
          undo={undo}
          redo={redo}
          fillAllCandidates={fillAllCandidates}
          applySingleCandidatesToDigits={applySingleCandidatesToDigits}
          showRequiredTechniques={showRequiredTechniques}
          openRequiredTechniquesSidebar={openRequiredTechniquesSidebar}
          hideRequiredTechniquesSummary={hideRequiredTechniquesSummary}
          toggleHistoryTools={toggleHistoryTools}
          toggleEraserMode={toggleEraserMode}
          toggleNotesTools={toggleNotesTools}
          toggleBrushTools={toggleBrushTools}
          toggleDrawingTools={toggleDrawingTools}
          toggleCandidateTools={toggleCandidateTools}
          onMomentaryButtonClick={handleMomentaryButtonClick}
          onModeButtonClick={handleModeButtonClick}
          t={t}
        />
        <TechniquesSidebar ref={techniquesRef} internalPuzzle={internalPuzzle} notes={notes} onTriggerHaptic={onTriggerHaptic} onCloseCandidateOverlay={closeCandidateOverlay} onOpenChange={setTechniquesOpen} onDockedOpenChange={setTechniquesDockedOpen} onResultChange={setRequiredTechniquesResult} onErrorChange={setRequiredTechniquesError} t={t} />
      </div>
      {candidateOverlay && <CandidateOverlayComp overlay={candidateOverlay} cellNotes={overlayCellNotes} candidateColors={candidateColors} overlayHasCellColor={overlayHasCellColor} onClose={closeCandidateOverlay} onSetPreviewDigit={setCandidateOverlayPreviewDigit} onSelectDigit={setCandidateSelectedDigit} onRemoveCandidate={removeCandidateAt} onApplyCandidateBrushColor={applyCandidateBrushColorAt} haptic={haptic} onTriggerHaptic={onTriggerHaptic} t={t} />}
      <VictoryOverlay won={won} finalTime={finalTime} formatTime={formatTime} onRetry={handleRetry} onShare={onShare} onNew={onNew} onNewGame={newGame} t={t} />
      {pencilOverlayCell !== null && (
        <PencilOverlay
          cellRect={pencilOverlayCell.rect}
          initialPointer={pencilOverlayCell.initialPointer}
          onDigit={(d) => {
            applyDigit(d, { r: pencilOverlayCell.r, c: pencilOverlayCell.c })
            setPencilOverlayCell(null)
          }}
          onClose={() => setPencilOverlayCell(null)}
        />
      )}
    </div>
  )
}
