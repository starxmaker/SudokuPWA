import React, { useEffect, useState } from 'react'
import { MdPlayArrow, MdPause, MdUndo } from 'react-icons/md'
import { FaEraser, FaPencilAlt } from 'react-icons/fa'
import { generateGame, solveGrid, Grid } from '../utils/sudoku'
import { loadSaved, saveGame } from '../utils/gameStorage'

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
  difficulty?: string | null
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row])
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function Board({ puzzle: initialProp, setPuzzle: setPuzzleProp, onBack, solution: solutionProp, autoCheck, autoRemove, haptic, onTriggerHaptic, onTriggerErrorHaptic, onNew, onShare, difficulty }: Props){
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
  const [history, setHistory] = useState<{puzzle: Grid; notes: number[][][]}[]>([])
  // Guards against touch ghost-click: onPointerDown sets this, onClick checks and clears it.
  const touchFiredRef = React.useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [won, setWon] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)

  // Auto-pause when the tab/window loses focus
  useEffect(() => {
    function onHide() { setPaused(true) }
    function onShow() { setPaused(prev => prev && !manualPause ? false : prev) }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide(); else onShow()
    })
    window.addEventListener('blur', onHide)
    window.addEventListener('focus', () => { if (!manualPause) setPaused(false) })
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', onHide)
    }
  }, [manualPause])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [paused])

  // Win detection
  useEffect(() => {
    if (won) return
    if (!solutionGrid || internalPuzzle.length !== 9) return
    const complete = internalPuzzle.every((row, r) => row.every((n, c) => n === solutionGrid[r][c]))
    if (complete) {
      setWon(true)
      setPaused(true)
      setFinalTime(prev => elapsed) // capture current elapsed
    }
  }, [internalPuzzle, solutionGrid, won, elapsed])

  // determine whether to use external setter or internal
  const setPuzzle = (p: Grid) => {
    if(setPuzzleProp) setPuzzleProp(p)
    setInternalPuzzle(p)
  }

  useEffect(() => {
    if (internalPuzzle.length !== 9 || !initialGrid) return
    saveGame(initialGrid, internalPuzzle, solutionGrid, notes)
  }, [internalPuzzle, initialGrid, solutionGrid, notes])

  useEffect(() => {
    if (solutionProp != null) setSolutionGrid(solutionProp)
  }, [solutionProp])

  useEffect(() => {
    if (initialProp && initialProp.length === 9) return
    if (internalPuzzle.length > 0) return
    generateGame('medium').then(({ puzzle, solution }) => {
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
    saveGame(frozen, internalPuzzle, solutionGrid, notes)
  }, [internalPuzzle, initialGrid, setPuzzleProp, solutionGrid])

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
    const { puzzle: p, solution: s } = await generateGame('medium')
    const initial = cloneGrid(p)
    setInitialGrid(initial)
    setInternalPuzzle(p)
    setSolutionGrid(s)
    setNotes(Array.from({length: 9}, () => Array.from({length: 9}, () => [])))
    setHistory([])
    setElapsed(0)
    setPaused(false)
    setManualPause(false)
    setWon(false)
    if(setPuzzleProp) setPuzzleProp(p)
    saveGame(initial, p, s)
    setSelected(null)
  }

  function handleRetry() {
    if (!initialGrid) return
    setInternalPuzzle(cloneGrid(initialGrid))
    setNotes(Array.from({length: 9}, () => Array.from({length: 9}, () => [])))
    setHistory([])
    setElapsed(0)
    setPaused(false)
    setManualPause(false)
    setWon(false)
    setSelected(null)
    saveGame(initialGrid, cloneGrid(initialGrid), solutionGrid)
  }

  function isClue(r: number, c: number): boolean {
    return initialGrid !== null && initialGrid[r][c] !== 0
  }

  function selectCell(r: number, c: number) {
    setSelected(prev => (prev?.r === r && prev?.c === c ? null : { r, c }))
  }

  function applyDigit(d: number) {
    if (!selected) return
    const { r, c } = selected
    if (isClue(r, c)) return
    if (notesMode) {
      setHistory(h => [...h.slice(-50), {
        puzzle: internalPuzzle.map(row => [...row]),
        notes: notesRef.current.map(row => row.map(cell => [...cell]))
      }])
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        const cell = next[r][c]
        const idx = cell.indexOf(d)
        if (idx >= 0) cell.splice(idx, 1)
        else cell.push(d)
        return next
      })
    } else {
      setHistory(h => [...h.slice(-50), {
        puzzle: internalPuzzle.map(row => [...row]),
        notes: notesRef.current.map(row => row.map(cell => [...cell]))
      }])
      setNotes(prev => {
        const next = prev.map(row => row.map(cell => [...cell]))
        next[r][c] = []
        if (autoRemove) {
          const boxR = Math.floor(r / 3) * 3
          const boxC = Math.floor(c / 3) * 3
          for (let i = 0; i < 9; i++) {
            if (next[r][i].length) next[r][i] = next[r][i].filter(n => n !== d)
            if (next[i][c].length) next[i][c] = next[i][c].filter(n => n !== d)
          }
          for (let br = boxR; br < boxR + 3; br++)
            for (let bc = boxC; bc < boxC + 3; bc++)
              if (next[br][bc].length) next[br][bc] = next[br][bc].filter(n => n !== d)
        }
        return next
      })
      onInput(r, c, d)
      if (haptic && autoCheck && solutionGrid !== null && d !== solutionGrid[r][c]) {
        onTriggerErrorHaptic?.()
      }
    }
  }

  function clearCell() {
    if (!selected) return
    const { r, c } = selected
    if (isClue(r, c)) return
    setHistory(h => [...h.slice(-50), {
      puzzle: internalPuzzle.map(row => [...row]),
      notes: notesRef.current.map(row => row.map(cell => [...cell]))
    }])
    setNotes(prev => {
      const next = prev.map(row => row.map(cell => [...cell]))
      next[r][c] = []
      return next
    })
    onInput(r, c, 0)
  }

  function undo() {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const entry = prev[prev.length - 1]
      setInternalPuzzle(entry.puzzle.map(r => [...r]))
      if (setPuzzleProp) setPuzzleProp(entry.puzzle)
      setNotes(entry.notes.map(r => r.map(c => [...c])))
      return prev.slice(0, -1)
    })
  }

  if(internalPuzzle.length===0) return null

  // count how many of each digit (1-9) are correctly placed (or just placed) in the grid
  const digitCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  for (const row of internalPuzzle) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  const remaining: Record<number, number> = {}
  for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])

  const selectedDigit =
    selected !== null ? internalPuzzle[selected.r][selected.c] : 0

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
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          role="gridcell"
          tabIndex={0}
          aria-selected={selectedHere}
          aria-disabled={clue}
          className={`cell ${clue ? 'given' : ''} ${userEntry ? 'user' : ''} ${selectedHere ? 'selected' : ''} ${sameDigit ? 'same-digit' : ''} ${inCross ? 'cross' : ''} ${isError ? 'error' : ''}`}
          onClick={() => { if (haptic) onTriggerHaptic?.(); selectCell(r, c) }}
        >
          {hasNotes ? (
            <div className="cell-notes">
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <span key={d} className={`cell-note${selectedDigit !== 0 && cellNotes.includes(d) && d === selectedDigit ? ' cell-note--highlight' : ''}`}>{cellNotes.includes(d) ? d : ''}</span>
              ))}
            </div>
          ) : (
            n === 0 ? '\u00a0' : n
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
      <div className="num-pad-toolbar">
        <button
          type="button"
          className="num-key clear"
          aria-label="Undo"
          disabled={history.length === 0}
          onClick={undo}
        >
          <MdUndo size={24} />
        </button>
        <button
          type="button"
          className="num-key clear"
          aria-label="Clear cell"
          onClick={clearCell}
        >
          <FaEraser size={22} />
        </button>
        <button
          type="button"
          className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''}`}
          aria-label="Toggle notes mode"
          aria-pressed={notesMode}
          onClick={() => setNotesMode(v => !v)}
        >
          <FaPencilAlt size={20} />
        </button>
      </div>
      <div className="number-pad" role="toolbar" aria-label="Number entry">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            type="button"
            className={`num-key${remaining[d] === 0 ? ' num-key--done' : ''}${notesMode ? ' num-key--notes' : ''}`}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                touchFiredRef.current = true
                applyDigit(d)
                if (haptic) onTriggerHaptic?.()
              }
            }}
            onClick={() => {
              // iOS fires a ghost click after pointerdown — skip it if touch already handled this.
              if (touchFiredRef.current) { touchFiredRef.current = false; return }
              applyDigit(d)
              if (haptic) onTriggerHaptic?.()
            }}
            aria-label={`${d}, ${remaining[d]} remaining`}
            data-digit={d}
          >
            <span className="num-key__digit">{remaining[d] === 0 ? '\u00a0' : d}</span>
            <span className="num-key__remaining">{remaining[d] > 0 ? remaining[d] : '\u00a0'}</span>
          </button>
        ))}
      </div>
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
