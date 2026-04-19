import React, { useEffect, useState } from 'react'
import { MdPlayArrow, MdPause, MdUndo } from 'react-icons/md'
import { FaEraser, FaPencilAlt } from 'react-icons/fa'
import { FaBrush, FaWandMagic, FaWandMagicSparkles } from 'react-icons/fa6'
import { GiMagicBroom } from 'react-icons/gi'
import { TbNumbers } from 'react-icons/tb'
import { generateGame, solveGrid, Grid } from '../utils/sudoku'
import {
  type CandidateColorGrid,
  type CellColorGrid,
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
  return colors.map(row => [...row])
}

function cloneCandidateColorsGrid(colors: CandidateColorGrid): CandidateColorGrid {
  return colors.map(row => row.map(cell => [...cell]))
}

function emptyCandidateColorCell(): (string | null)[] {
  return Array.from({ length: 9 }, () => null)
}

function makeHistoryEntry(
  puzzle: Grid,
  notes: number[][][],
  cellColors: CellColorGrid,
  candidateColors: CandidateColorGrid,
) {
  return {
    puzzle: cloneGrid(puzzle),
    notes: cloneNotesGrid(notes),
    cellColors: cloneCellColorsGrid(cellColors),
    candidateColors: cloneCandidateColorsGrid(candidateColors),
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
type ToolTrayView = 'main' | 'notes' | 'brush'
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

const BRUSH_COLOR_MAP: Record<BrushColorId, string> = Object.fromEntries(
  BRUSH_COLORS.map(color => [color.id, color.fill])
) as Record<BrushColorId, string>
const DEFAULT_BRUSH_COLOR: BrushColorId = BRUSH_COLORS[0].id
const TOOL_TRAY_ANIMATION_MS = 220

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
  const [history, setHistory] = useState<{
    puzzle: Grid
    notes: number[][][]
    cellColors: CellColorGrid
    candidateColors: CandidateColorGrid
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
  const [activeBrushColor, setActiveBrushColor] = useState<BrushColorId>(
    () => BRUSH_COLORS.find(color => color.id === savedBrushPrefs?.activeColor)?.id ?? DEFAULT_BRUSH_COLOR
  )
  const [candidateBrushMode, setCandidateBrushMode] = useState<boolean>(() => savedBrushPrefs?.candidateMode ?? false)
  const [candidateOverlay, setCandidateOverlay] = useState<CandidateOverlayState | null>(null)
  const [visibleToolTray, setVisibleToolTray] = useState<ToolTrayView>('main')
  const [toolTrayTransition, setToolTrayTransition] = useState<ToolTrayTransition | null>(null)
  const toolTrayTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [visibleLowerPad, setVisibleLowerPad] = useState<LowerPadView>('numbers')
  const [lowerPadTransition, setLowerPadTransition] = useState<LowerPadTransition | null>(null)
  const lowerPadTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null)

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
    if (paused) setCandidateOverlay(null)
  }, [paused])

  useEffect(() => {
    saveBrushPrefs(activeBrushColor, candidateBrushMode)
  }, [activeBrushColor, candidateBrushMode])

  useEffect(() => () => {
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
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
    saveGame(initialGrid, internalPuzzle, solutionGrid, notes, cellColors, candidateColors)
  }, [internalPuzzle, initialGrid, solutionGrid, notes, cellColors, candidateColors])

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
    saveGame(frozen, internalPuzzle, solutionGrid, notes, cellColors, candidateColors)
  }, [internalPuzzle, initialGrid, setPuzzleProp, solutionGrid, notes, cellColors, candidateColors])

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
    setHistory([])
    setElapsed(0)
    clearElapsed()
    setPaused(false)
    setManualPause(false)
    setWon(false)
    setBrushMode(false)
    setCandidateOverlay(null)
    setToolTrayTransition(null)
    setVisibleToolTray('main')
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
      toolTrayTimerRef.current = null
    }
    setLowerPadTransition(null)
    setVisibleLowerPad('numbers')
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
      lowerPadTimerRef.current = null
    }
    if(setPuzzleProp) setPuzzleProp(p)
    saveGame(initial, p, s)
    setSelected(null)
  }

  function handleRetry() {
    if (!initialGrid) return
    setInternalPuzzle(cloneGrid(initialGrid))
    setNotes(Array.from({length: 9}, () => Array.from({length: 9}, () => [])))
    setCellColors(emptyCellColors())
    setCandidateColors(emptyCandidateColors())
    setHistory([])
    setElapsed(0)
    clearElapsed()
    setPaused(false)
    setManualPause(false)
    setWon(false)
    setBrushMode(false)
    setCandidateOverlay(null)
    setToolTrayTransition(null)
    setVisibleToolTray('main')
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
      toolTrayTimerRef.current = null
    }
    setLowerPadTransition(null)
    setVisibleLowerPad('numbers')
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
      lowerPadTimerRef.current = null
    }
    setSelected(null)
    saveGame(initialGrid, cloneGrid(initialGrid), solutionGrid)
  }

  function isClue(r: number, c: number): boolean {
    return initialGrid !== null && initialGrid[r][c] !== 0
  }

  function selectCell(r: number, c: number) {
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
    if (candidateColorsRef.current[r][c].some(color => color !== null)) return false
    const currentColor = cellColorsRef.current[r][c]
    const nextColor = currentColor === colorId ? null : colorId
    if (currentColor === nextColor) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setCellColors(prev => {
      const next = cloneCellColorsGrid(prev)
      next[r][c] = nextColor
      return next
    })
    return true
  }

  function applyCandidateBrushColorAt(r: number, c: number, d: number) {
    if (cellColorsRef.current[r][c] !== null) return false
    if (!notesRef.current[r][c].includes(d)) return false

    const currentColor = candidateColorsRef.current[r][c][d - 1]
    const nextColor = currentColor === activeBrushColor ? null : activeBrushColor

    if (currentColor === nextColor) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setCandidateColors(prev => {
      const next = cloneCandidateColorsGrid(prev)
      next[r][c][d - 1] = nextColor
      return next
    })
    return true
  }

  function closeCandidateOverlay() {
    setCandidateOverlay(null)
  }

  function switchToolTray(next: ToolTrayView, direction: ToolTrayTransition['direction']) {
    if (visibleToolTray === next) return
    if (toolTrayTimerRef.current !== null) {
      window.clearTimeout(toolTrayTimerRef.current)
    }
    setToolTrayTransition({
      from: visibleToolTray,
      to: next,
      direction,
    })
    setVisibleToolTray(next)
    toolTrayTimerRef.current = window.setTimeout(() => {
      setToolTrayTransition(null)
      toolTrayTimerRef.current = null
    }, TOOL_TRAY_ANIMATION_MS)
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

  function openNotesTools() {
    closeCandidateOverlay()
    setBrushMode(false)
    setNotesMode(true)
    switchToolTray('notes', 'forward')
    switchLowerPad('numbers', 'backward')
  }

  function openBrushTools() {
    closeCandidateOverlay()
    setNotesMode(false)
    setBrushMode(true)
    switchToolTray('brush', 'forward')
    switchLowerPad('colors', 'forward')
  }

  function closeActiveToolTray() {
    closeCandidateOverlay()
    if (visibleToolTray === 'notes') {
      setNotesMode(false)
    }
    if (visibleToolTray === 'brush') {
      setBrushMode(false)
      switchLowerPad('numbers', 'backward')
    }
    switchToolTray('main', 'backward')
  }

  function toggleNotesTools() {
    if (visibleToolTray === 'notes') {
      closeActiveToolTray()
      return
    }
    openNotesTools()
  }

  function toggleBrushTools() {
    if (visibleToolTray === 'brush') {
      closeActiveToolTray()
      return
    }
    openBrushTools()
  }

  function clearSelectedBrushColors() {
    if (!selected) return false
    const { r, c } = selected
    const hasCellColor = cellColorsRef.current[r][c] !== null
    const hasCandidateColor = candidateColorsRef.current[r][c].some(color => color !== null)
    if (!hasCellColor && !hasCandidateColor) return false

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setCellColors(prev => {
      const next = cloneCellColorsGrid(prev)
      next[r][c] = null
      return next
    })
    setCandidateColors(prev => {
      const next = cloneCandidateColorsGrid(prev)
      next[r][c] = emptyCandidateColorCell()
      return next
    })
    return true
  }

  function openCandidateOverlay(r: number, c: number, target: HTMLElement) {
    setSelected({ r, c })
    if (
      internalPuzzle[r][c] !== 0 ||
      notesRef.current[r][c].length === 0 ||
      cellColorsRef.current[r][c] !== null
    ) {
      setCandidateOverlay(null)
      return false
    }
    const { top, left, size } = getCandidateOverlayPosition(target.getBoundingClientRect())
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
    if (brushMode) return false
    if (notesMode) {
      const historyEntry = makeHistoryEntry(
        internalPuzzle,
        notesRef.current,
        cellColorsRef.current,
        candidateColorsRef.current,
      )
      const hadCandidate = notesRef.current[r][c].includes(d)
      setHistory(h => [...h.slice(-50), historyEntry])
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        const cell = next[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0) cell.splice(idx, 1)
        else cell.push(d)
        return next
      })
      setCandidateColors(prev => {
        const next = cloneCandidateColorsGrid(prev)
        next[r][c][d - 1] = null
        return next
      })
    } else {
      const canValidateEntry = autoCheck && solutionGrid !== null
      const isCorrectEntry = solutionGrid !== null && d === solutionGrid[r][c]
      const shouldAutoRemove = autoRemove && (!canValidateEntry || isCorrectEntry)
      const historyEntry = makeHistoryEntry(
        internalPuzzle,
        notesRef.current,
        cellColorsRef.current,
        candidateColorsRef.current,
      )
      setHistory(h => [...h.slice(-50), historyEntry])
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        next[r][c] = []
        if (shouldAutoRemove) {
          const boxR = Math.floor(r / 3) * 3
          const boxC = Math.floor(c / 3) * 3
          for (let i = 0; i < 9; i++) {
            if (next[r][i].length) next[r][i] = next[r][i].filter(n => n !== d)
            if (next[i][c].length) next[i][c] = next[i][c].filter(n => n !== d)
          }
          for (let br = boxR; br < boxR + 3; br++) {
            for (let bc = boxC; bc < boxC + 3; bc++) {
              if (next[br][bc].length) next[br][bc] = next[br][bc].filter(n => n !== d)
            }
          }
        }
        return next
      })
      setCandidateColors(prev => {
        const next = cloneCandidateColorsGrid(prev)
        next[r][c] = emptyCandidateColorCell()
        if (shouldAutoRemove) {
          const boxR = Math.floor(r / 3) * 3
          const boxC = Math.floor(c / 3) * 3
          for (let i = 0; i < 9; i++) {
            next[r][i][d - 1] = null
            next[i][c][d - 1] = null
          }
          for (let br = boxR; br < boxR + 3; br++) {
            for (let bc = boxC; bc < boxC + 3; bc++) {
              next[br][bc][d - 1] = null
            }
          }
        }
        return next
      })
      setCellColors(prev => {
        const next = cloneCellColorsGrid(prev)
        next[r][c] = null
        return next
      })
      onInput(r, c, d)
      if (autoCheck && solutionGrid !== null && d !== solutionGrid[r][c]) {
        return true
      }
    }
    return false
  }

  function clearCell() {
    if (!selected) return
    const { r, c } = selected
    if (isClue(r, c)) return
    setCandidateOverlay(null)
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(prev => {
      const next = prev.map(row => row.map(cell => [...cell]))
      next[r][c] = []
      return next
    })
    setCandidateColors(prev => {
      const next = cloneCandidateColorsGrid(prev)
      next[r][c] = emptyCandidateColorCell()
      return next
    })
    setCellColors(prev => {
      const next = cloneCellColorsGrid(prev)
      next[r][c] = null
      return next
    })
    onInput(r, c, 0)
  }

  function fillCandidates() {
    if (!selected) return
    const { r, c } = selected
    if (isClue(r, c) || internalPuzzle[r][c] !== 0 || notesRef.current[r][c].length > 0) return
    const candidates = getSimpleCandidates(r, c)
    if (candidates.length === 0) return
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(prev => {
      const next = cloneNotesGrid(prev)
      next[r][c] = candidates
      return next
    })
    setCandidateColors(prev => {
      const next = cloneCandidateColorsGrid(prev)
      next[r][c] = emptyCandidateColorCell()
      return next
    })
  }

  function fillAllCandidates() {
    const hasFillableCell = internalPuzzle.some((row, r) =>
      row.some((n, c) => !isClue(r, c) && n === 0 && notesRef.current[r][c].length === 0)
    )
    if (!hasFillableCell) return

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

    if (!changed) return
    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setNotes(nextNotes)
    setCandidateColors(prev => {
      const next = cloneCandidateColorsGrid(prev)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (isClue(r, c) || internalPuzzle[r][c] !== 0 || notesRef.current[r][c].length > 0) continue
          next[r][c] = emptyCandidateColorCell()
        }
      }
      return next
    })
  }

  function applyBrushColor(colorId: BrushColorId) {
    setActiveBrushColor(colorId)
  }

  function clearAllColors() {
    const hasCellColors = cellColorsRef.current.some(row => row.some(color => color !== null))
    const hasCandidateColors = candidateColorsRef.current.some(row =>
      row.some(cell => cell.some(color => color !== null))
    )
    if (!hasCellColors && !hasCandidateColors) return

    const historyEntry = makeHistoryEntry(
      internalPuzzle,
      notesRef.current,
      cellColorsRef.current,
      candidateColorsRef.current,
    )
    setHistory(h => [...h.slice(-50), historyEntry])
    setCellColors(emptyCellColors())
    setCandidateColors(emptyCandidateColors())
  }

  function undo() {
    const entry = history[history.length - 1]
    if (!entry) return
    const restoredPuzzle = cloneGrid(entry.puzzle)
    const restoredNotes = cloneNotesGrid(entry.notes)
    const restoredCellColors = cloneCellColorsGrid(entry.cellColors)
    const restoredCandidateColors = cloneCandidateColorsGrid(entry.candidateColors)
    setInternalPuzzle(restoredPuzzle)
    if (setPuzzleProp) setPuzzleProp(restoredPuzzle)
    setNotes(restoredNotes)
    setCellColors(restoredCellColors)
    setCandidateColors(restoredCandidateColors)
    setHistory(prev => prev.slice(0, -1))
  }

  if(internalPuzzle.length===0) return null

  // count how many of each digit (1-9) are correctly placed (or just placed) in the grid
  const digitCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  for (const row of internalPuzzle) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  const remaining: Record<number, number> = {}
  for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])

  const selectedDigit =
    selected !== null ? internalPuzzle[selected.r][selected.c] : 0
  const canFillSelectedCandidates =
    selected !== null &&
    !isClue(selected.r, selected.c) &&
    internalPuzzle[selected.r][selected.c] === 0 &&
    notes[selected.r][selected.c].length === 0
  const hasAnyFillableCell = internalPuzzle.some((row, r) =>
    row.some((n, c) => !isClue(r, c) && n === 0 && notes[r][c].length === 0)
  )
  const hasAnyColors =
    cellColors.some(row => row.some(color => color !== null)) ||
    candidateColors.some(row => row.some(cell => cell.some(color => color !== null)))
  const candidateEntryMode = notesMode
  const selectedHasCellColor =
    selected !== null && cellColors[selected.r][selected.c] !== null
  const selectedHasCandidateColors =
    selected !== null && candidateColors[selected.r][selected.c].some(color => color !== null)
  const selectedHasAnyColors = selectedHasCellColor || selectedHasCandidateColors
  const overlayCellNotes = candidateOverlay ? notes[candidateOverlay.r][candidateOverlay.c] : []
  const overlayHasCellColor =
    candidateOverlay !== null && cellColors[candidateOverlay.r][candidateOverlay.c] !== null
  const toolTrayOverlayView = toolTrayTransition?.from ?? null
  const undoDisabled = history.length === 0 || paused || won

  function toolTrayPanelClass(view: ToolTrayView, layer: 'active' | 'overlay') {
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

  function lowerPadPanelClass(view: LowerPadView) {
    if (visibleLowerPad !== view) {
      return 'input-pad__panel--hidden'
    }
    if (lowerPadTransition?.to === view) {
      return lowerPadTransition.direction === 'forward'
        ? 'input-pad__panel--enter-right'
        : 'input-pad__panel--enter-left'
    }
    return 'input-pad__panel--active'
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
        selected !== null &&
        selectedDigit !== 0 &&
        n === selectedDigit &&
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
      const cellColorId = cellColors[r][c] as BrushColorId | null
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
          {cellColorId && (
            <span
              className="cell-color-layer"
              style={{ '--annotation-color': BRUSH_COLOR_MAP[cellColorId] } as React.CSSProperties}
            />
          )}
          {hasNotes ? (
            <div className="cell-notes">
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <span
                  key={d}
                  className={`cell-note${selectedDigit !== 0 && cellNotes.includes(d) && d === selectedDigit ? ' cell-note--highlight' : ''}${cellNotes.includes(d) && candidateColors[r][c][d - 1] ? ' cell-note--colored' : ''}`}
                  style={cellNotes.includes(d) && candidateColors[r][c][d - 1]
                    ? ({ '--annotation-color': BRUSH_COLOR_MAP[candidateColors[r][c][d - 1] as BrushColorId] } as React.CSSProperties)
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
          <div className={`tool-tray tool-tray--${visibleToolTray}`} aria-live="polite">
            <div
              className={`num-pad-toolbar tool-tray__panel ${toolTrayPanelClass('main', 'active')}`}
              role="toolbar"
              aria-label="Game tools"
              aria-hidden={visibleToolTray !== 'main'}
            >
              <button
                type="button"
                className="num-key clear"
                aria-label="Undo"
                disabled={undoDisabled}
                onClick={undo}
              >
                <MdUndo size={24} />
              </button>
              <button
                type="button"
                className="num-key clear"
                aria-label="Clear cell"
                disabled={paused || won}
                onClick={clearCell}
              >
                <FaEraser size={22} />
              </button>
              <button
                type="button"
                className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''}`}
                aria-label="Toggle notes mode"
                aria-pressed={notesMode}
                disabled={paused || won}
                onClick={toggleNotesTools}
              >
                <FaPencilAlt size={20} />
              </button>
              <button
                type="button"
                className={`num-key brush-toggle${brushMode ? ' brush-toggle--active' : ''}`}
                aria-label="Toggle brush mode"
                aria-pressed={brushMode}
                disabled={paused || won}
                onClick={toggleBrushTools}
              >
                <FaBrush size={20} />
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
                className="num-key notes-toggle notes-toggle--active"
                aria-label="Toggle notes mode"
                aria-pressed={true}
                disabled={paused || won}
                onClick={toggleNotesTools}
              >
                <FaPencilAlt size={20} />
              </button>
              <div className="tool-tray__content tool-tray__content--notes">
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Undo"
                  disabled={undoDisabled}
                  onClick={undo}
                >
                  <MdUndo size={24} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Fill candidates"
                  disabled={paused || won || !canFillSelectedCandidates}
                  onClick={fillCandidates}
                >
                  <FaWandMagic size={20} />
                </button>
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Fill all candidates"
                  disabled={paused || won || !hasAnyFillableCell}
                  onClick={fillAllCandidates}
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
                className="num-key brush-toggle brush-toggle--active"
                aria-label="Toggle brush mode"
                aria-pressed={true}
                disabled={paused || won}
                onClick={toggleBrushTools}
              >
                <FaBrush size={20} />
              </button>
              <div className="tool-tray__content tool-tray__content--brush">
                <button
                  type="button"
                  className="num-key clear"
                  aria-label="Undo"
                  disabled={undoDisabled}
                  onClick={undo}
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
                  className="num-key clear"
                  aria-label="Clear colors"
                  disabled={paused || won || !hasAnyColors}
                  onClick={clearAllColors}
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
                  <button type="button" className="num-key clear" tabIndex={-1}>
                    <GiMagicBroom size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className={`input-pad-switcher input-pad-switcher--${visibleLowerPad}`}>
            <div
              className={`number-pad input-pad__panel ${lowerPadPanelClass('numbers')}`}
              role="toolbar"
              aria-label="Number entry"
              aria-hidden={visibleLowerPad !== 'numbers'}
            >
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
                >
                  <span className="num-key__digit">{remaining[d] === 0 ? '\u00a0' : d}</span>
                  <span className="num-key__remaining">{remaining[d] > 0 ? remaining[d] : '\u00a0'}</span>
                </button>
              ))}
            </div>
            <div
              className={`number-pad brush-color-pad input-pad__panel ${lowerPadPanelClass('colors')}`}
              role="toolbar"
              aria-label="Brush colors"
              aria-hidden={visibleLowerPad !== 'colors'}
            >
              {BRUSH_COLORS.map((color, index) => (
                <button
                  key={color.id}
                  type="button"
                  className={`brush-color-button${activeBrushColor === color.id ? ' brush-color-button--active' : ''}`}
                  aria-label={`Brush color ${index + 1}`}
                  aria-pressed={activeBrushColor === color.id}
                  disabled={paused || won}
                  onClick={() => applyBrushColor(color.id)}
                  style={{ '--annotation-color': color.fill, '--swatch-color': color.swatch } as React.CSSProperties}
                />
              ))}
              <button
                type="button"
                className="brush-color-button brush-color-button--clear"
                aria-label="Brush color remover"
                aria-pressed={false}
                disabled={paused || won || !selectedHasAnyColors}
                onClick={() => {
                  const changed = clearSelectedBrushColors()
                  if (changed && haptic) onTriggerHaptic?.()
                }}
              >
                <span className="brush-color-button__clear-mark" aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {candidateOverlay && (
        <>
          <button
            type="button"
            className="brush-candidate-backdrop"
            aria-label="Close candidate painter"
            onClick={() => setCandidateOverlay(null)}
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
              const colorId = candidateColors[candidateOverlay.r][candidateOverlay.c][d - 1] as BrushColorId | null
              return (
                <button
                  key={d}
                  type="button"
                  className={`brush-candidate-button${hasCandidate ? '' : ' brush-candidate-button--empty'}`}
                  aria-label={hasCandidate ? `Paint candidate ${d}` : `Candidate ${d} unavailable`}
                  disabled={!hasCandidate || overlayHasCellColor}
                  onClick={() => {
                    const changed = applyCandidateBrushColorAt(candidateOverlay.r, candidateOverlay.c, d)
                    if (changed && haptic) onTriggerHaptic?.()
                  }}
                  style={colorId
                    ? ({ '--annotation-color': BRUSH_COLOR_MAP[colorId] } as React.CSSProperties)
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
