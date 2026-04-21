import React, { useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import Home from './components/Home'
import TopBar from './components/TopBar'
import Settings from './components/Settings'
import NewGameModal from './components/NewGameModal'
import { generateGame, solveGrid, Grid } from './utils/sudoku'
import { getGenerator } from './utils/generators'
import { loadSaved, saveGame, clearElapsed, clearCompleted, loadCompleted, saveCompleted, encodeGrid, decodeGrid, loadBrushPrefs, saveBrushPrefs } from './utils/gameStorage'
import { initHaptic, triggerHaptic, triggerErrorHaptic } from './utils/haptic'

/** Parse ?p= once, synchronously, and solve the puzzle. */
type ParsedUrl =
  | { type: 'game'; initial: Grid; solution: Grid }
  | { type: 'error'; message: string }
  | { type: 'none' }

function parseUrlGame(): ParsedUrl {
  try {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('p')
    if (!p) return { type: 'none' }
    const initial = decodeGrid(p)
    if (!initial) return { type: 'error', message: 'Invalid puzzle link.' }
    const solution = solveGrid(initial)
    if (!solution) return { type: 'error', message: 'This puzzle has no valid solution.' }
    return { type: 'game', initial, solution }
  } catch {
    return { type: 'error', message: 'Invalid puzzle link.' }
  }
}

function cloneGrid(g: Grid): Grid { return g.map(r => [...r]) }

export default function App(){
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if(saved === 'dark' || saved === 'light') return saved
    } catch {}
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  const [autoCheck, setAutoCheck] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('autoCheck')
      if (saved !== null) return saved === 'true'
    } catch {}
    return true
  })

  const [autoRemove, setAutoRemove] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('autoRemove')
      if (saved !== null) return saved === 'true'
    } catch {}
    return true
  })

  useEffect(()=>{
    const root = document.documentElement
    if(theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  useEffect(()=>{
    try { localStorage.setItem('autoCheck', autoCheck ? 'true' : 'false') } catch {}
  }, [autoCheck])

  useEffect(()=>{
    try { localStorage.setItem('autoRemove', autoRemove ? 'true' : 'false') } catch {}
  }, [autoRemove])

  const [haptic, setHaptic] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('haptic')
      if (saved !== null) return saved === 'true'
    } catch {}
    return true
  })

  useEffect(() => {
    try { localStorage.setItem('haptic', haptic ? 'true' : 'false') } catch {}
  }, [haptic])

  const [pencilMode, setPencilMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pencilMode')
      if (saved !== null) return saved === 'true'
    } catch {}
    return false
  })

  useEffect(() => {
    try { localStorage.setItem('pencilMode', pencilMode ? 'true' : 'false') } catch {}
  }, [pencilMode])

  const [coordinateLabels, setCoordinateLabels] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('coordinateLabels')
      if (saved !== null) return saved === 'true'
    } catch {}
    return false
  })

  useEffect(() => {
    try { localStorage.setItem('coordinateLabels', coordinateLabels ? 'true' : 'false') } catch {}
  }, [coordinateLabels])

  const [firstColorFlag, setFirstColorFlag] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('firstColorFlag')
      if (saved !== null) return saved === 'true'
    } catch {}
    return false
  })

  useEffect(() => {
    try { localStorage.setItem('firstColorFlag', firstColorFlag ? 'true' : 'false') } catch {}
  }, [firstColorFlag])

  useEffect(() => { initHaptic() }, [])

  // Parse URL game synchronously so StrictMode double-effects don't clobber it.
  // Also persist to localStorage immediately so Board's useState initializer reads the URL game,
  // not the previously active game.
  const [urlGame] = useState(() => {
    const parsed = parseUrlGame()
    if (parsed.type === 'game') {
      saveGame(parsed.initial, parsed.initial, parsed.solution)
    }
    return parsed
  })
  const urlError = urlGame.type === 'error' ? urlGame.message : null

  const [showHome, setShowHome] = useState(() => urlGame.type !== 'game')
  const [puzzle, setPuzzle] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return cloneGrid(urlGame.initial)
    return loadSaved()?.current ?? null
  })
  const [solution, setSolution] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return urlGame.solution
    const saved = loadSaved()
    if (saved?.solution) return saved.solution
    if (saved?.initial) return solveGrid(saved.initial)
    return null
  })
  // Track the original blank clues separately so Share always encodes the unsolved puzzle
  const [initialGrid, setInitialGrid] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return cloneGrid(urlGame.initial)
    return loadSaved()?.initial ?? null
  })

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [gameId, setGameId] = useState(0)
  const [gameCompleted, setGameCompleted] = useState<boolean>(() => loadCompleted())
  const boardRestartRef = useRef<(() => void) | null>(null)
  const clearColorsRef = useRef<(() => void) | null>(null)
  const clearDrawingsRef = useRef<(() => void) | null>(null)
  const identifyCandidatesRef = useRef<(() => void) | null>(null)
  const [canClearPainting, setCanClearPainting] = useState(false)
  const [canClearDrawings, setCanClearDrawings] = useState(false)
  const [canIdentifyCandidates, setCanIdentifyCandidates] = useState(false)
  const [paintingScope, setPaintingScope] = useState<'digit' | 'candidate'>(() =>
    loadBrushPrefs()?.candidateMode ? 'candidate' : 'digit'
  )

  const [difficulty, setDifficulty] = useState<string | null>(() => {
    if (urlGame.type === 'game') return null
    try {
      const saved = localStorage.getItem('difficulty')
      if (saved) return saved
    } catch {}
    return null
  })

  useEffect(() => {
    try {
      if (difficulty) localStorage.setItem('difficulty', difficulty)
      else localStorage.removeItem('difficulty')
    } catch {}
  }, [difficulty])

  useEffect(() => {
    const savedBrushPrefs = loadBrushPrefs()
    saveBrushPrefs(
      savedBrushPrefs?.activeColors ?? [],
      paintingScope === 'candidate',
      savedBrushPrefs?.activeDrawingColors ?? [],
      savedBrushPrefs?.firstColorFlagEnabled ?? true,
    )
  }, [paintingScope])

  useEffect(() => {
    if (showHome) {
      setCanClearPainting(false)
      setCanClearDrawings(false)
      setCanIdentifyCandidates(false)
    }
  }, [showHome])

  // Clean the URL after loading (safe to run twice in StrictMode)
  useEffect(() => {
    if (urlGame.type === 'game' || urlGame.type === 'error') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleShare() {
    if (!initialGrid) return
    const params = new URLSearchParams()
    params.set('p', encodeGrid(initialGrid))
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    const share = () => {
      setToast('Link copied!')
      setTimeout(() => setToast(null), 2200)
    }
    if (navigator.share) {
      navigator.share({ title: 'Sudoku', url }).catch(() => {
        navigator.clipboard.writeText(url).then(share)
      })
    } else {
      navigator.clipboard.writeText(url).then(share)
    }
  }

  function handleNew(){
    setNewGameOpen(true)
  }

  async function startNewWithDifficulty(generatorId: string, difficultyId: string, signal: AbortSignal){
    const { puzzle: p, solution: s } = await generateGame(difficultyId, generatorId, signal)
    const diffLabel = getGenerator(generatorId).difficulties.find(d => d.id === difficultyId)?.label ?? difficultyId
    // Yield to the event loop so any queued cancel clicks fire before we apply state
    await new Promise<void>(r => setTimeout(r, 0))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const initial = cloneGrid(p)
    setPuzzle(p)
    setSolution(s)
    setInitialGrid(initial)
    clearElapsed()
    clearCompleted()
    setGameCompleted(false)
    saveGame(initial, p, s)
    setDifficulty(diffLabel)
    setGameId(id => id + 1)
    setShowHome(false)
  }

  function handleContinue(){
    const saved = loadSaved()
    if(saved?.current) {
      setPuzzle(saved.current)
      setSolution(saved.solution ?? null)
      setInitialGrid(saved.initial)
      setShowHome(false)
    } else {
      handleNew()
    }
  }

  return (
    <div className="app-root">
      <TopBar
        showBack={!showHome}
        onBack={() => setShowHome(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onShare={!showHome && !!initialGrid ? handleShare : undefined}
        onRestart={!showHome && !!initialGrid ? () => boardRestartRef.current?.() : undefined}
        onClearPainting={!showHome ? () => clearColorsRef.current?.() : undefined}
        canClearPainting={canClearPainting}
        onClearDrawings={!showHome ? () => clearDrawingsRef.current?.() : undefined}
        canClearDrawings={canClearDrawings}
        onIdentifyCandidates={!showHome ? () => identifyCandidatesRef.current?.() : undefined}
        canIdentifyCandidates={canIdentifyCandidates}
        title="Sudoku"
      />
      <div className="app">
        {showHome ? (
          <Home hasSaved={!!puzzle && !gameCompleted} onNew={handleNew} onContinue={handleContinue} error={urlError} />
        ) : (
          <Board
            key={gameId}
            puzzle={puzzle || undefined}
            setPuzzle={(p)=> setPuzzle(p)}
            onBack={() => setShowHome(true)}
            solution={solution}
            autoCheck={autoCheck}
            autoRemove={autoRemove}
            haptic={haptic}
            onTriggerHaptic={triggerHaptic}
            onTriggerErrorHaptic={triggerErrorHaptic}
            onNew={handleNew}
            onShare={handleShare}
            onWin={() => { setGameCompleted(true); saveCompleted() }}
            difficulty={urlGame.type === 'game' ? null : difficulty}
            pencilMode={pencilMode}
            coordinateLabels={coordinateLabels}
            firstColorFlag={firstColorFlag}
            restartRef={boardRestartRef}
            clearColorsRef={clearColorsRef}
            clearDrawingsRef={clearDrawingsRef}
            identifyCandidatesRef={identifyCandidatesRef}
            onClearPaintingAvailabilityChange={setCanClearPainting}
            onClearDrawingsAvailabilityChange={setCanClearDrawings}
            onIdentifyCandidatesAvailabilityChange={setCanIdentifyCandidates}
            paintingScope={paintingScope}
          />
        )}
        <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={(t)=> setTheme(t)} autoCheck={autoCheck} setAutoCheck={setAutoCheck} autoRemove={autoRemove} setAutoRemove={setAutoRemove} haptic={haptic} setHaptic={setHaptic} pencilMode={pencilMode} setPencilMode={setPencilMode} coordinateLabels={coordinateLabels} setCoordinateLabels={setCoordinateLabels} paintingScope={paintingScope} setPaintingScope={setPaintingScope} firstColorFlag={firstColorFlag} setFirstColorFlag={setFirstColorFlag} />
        <NewGameModal open={newGameOpen} onClose={() => setNewGameOpen(false)} onStart={startNewWithDifficulty} />
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
