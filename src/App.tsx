import React, { useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import Home from './components/Home'
import TopBar from './components/TopBar'
import Settings from './components/Settings'
import NewGameModal from './components/NewGameModal'
import PuzzleInfoModal from './components/PuzzleInfoModal'
import PuzzleCreator from './components/PuzzleCreator'
import { Grid } from './utils/sudoku'
import { loadSaved, saveGame, clearElapsed, clearCompleted, loadCompleted, saveCompleted, encodeGrid, decodeGrid, loadBrushPrefs, saveBrushPrefs, type PuzzleMetadata, type PuzzleSource } from './utils/gameStorage'
import { initHaptic, triggerHaptic, triggerErrorHaptic } from './utils/haptic'
import { getPuzzleQueueAvailability, resetPuzzleQueueDaemon, startPuzzleQueueDaemon, subscribePuzzleQueueAvailability, takeQueuedGame } from './utils/appPuzzleQueue'
import type { PuzzleQueueAvailability } from './utils/puzzleQueue'
import { DIFFICULTY_LABELS, GameDifficulty } from './utils/difficulties'
import { type VerifiedPuzzle, verifyPuzzle } from './utils/generators/hodoku'
import { getPreloadedPuzzleAvailability, takePreloadedPuzzle } from './utils/preloadedPuzzles'

type PuzzleRatingSummary = {
  difficulty: GameDifficulty | null
  score: number | null
}

/** Parse ?p= once, synchronously. Imported puzzle verification runs later via Hodoku. */
type ParsedUrl =
  | { type: 'game'; initial: Grid }
  | { type: 'error'; message: string }
  | { type: 'none' }

const PENDING_IMPORTED_PUZZLE_KEY = 'pending-imported-puzzle'
const AUTO_OPEN_IMPORTED_GAME_KEY = 'auto-open-imported-game'
const DEFAULT_AUTO_CHECK = true
const DEFAULT_AUTO_REMOVE = true
const DEFAULT_HAPTIC = true
const DEFAULT_PENCIL_MODE = false
const DEFAULT_COORDINATE_LABELS = false
const DEFAULT_FIRST_COLOR_FLAG = false
const DEFAULT_PAINTING_SCOPE = 'digit' as const

function getDefaultThemePreference(): 'light' | 'dark' {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function currentLocationUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function storePendingImportedPuzzle(encodedPuzzle: string) {
  try {
    sessionStorage.setItem(PENDING_IMPORTED_PUZZLE_KEY, encodedPuzzle)
  } catch {}
  try {
    const nextState = typeof window.history.state === 'object' && window.history.state !== null
      ? { ...window.history.state, pendingImportedPuzzle: encodedPuzzle }
      : { pendingImportedPuzzle: encodedPuzzle }
    window.history.replaceState(nextState, '', currentLocationUrl())
  } catch {}
}

function readPendingImportedPuzzle(): string | null {
  try {
    const historyState = window.history.state as { pendingImportedPuzzle?: unknown } | null
    if (typeof historyState?.pendingImportedPuzzle === 'string' && historyState.pendingImportedPuzzle.length > 0) {
      return historyState.pendingImportedPuzzle
    }
  } catch {}
  try {
    return sessionStorage.getItem(PENDING_IMPORTED_PUZZLE_KEY)
  } catch {
    return null
  }
}

function clearPendingImportedPuzzle() {
  try {
    sessionStorage.removeItem(PENDING_IMPORTED_PUZZLE_KEY)
  } catch {}
  try {
    const historyState = window.history.state as { pendingImportedPuzzle?: unknown } | null
    if (typeof historyState?.pendingImportedPuzzle === 'string') {
      const { pendingImportedPuzzle: _ignored, ...nextState } = historyState
      window.history.replaceState(Object.keys(nextState).length > 0 ? nextState : null, '', currentLocationUrl())
    }
  } catch {}
}

function markAutoOpenImportedGame() {
  try {
    sessionStorage.setItem(AUTO_OPEN_IMPORTED_GAME_KEY, '1')
  } catch {}
}

function shouldAutoOpenImportedGame() {
  try {
    return sessionStorage.getItem(AUTO_OPEN_IMPORTED_GAME_KEY) === '1'
  } catch {
    return false
  }
}

function clearAutoOpenImportedGame() {
  try {
    sessionStorage.removeItem(AUTO_OPEN_IMPORTED_GAME_KEY)
  } catch {}
}

function parseUrlGame(): ParsedUrl {
  try {
    const params = new URLSearchParams(window.location.search)
    const directPuzzle = params.get('p')
    const encodedPuzzle = directPuzzle ?? readPendingImportedPuzzle()
    if (!encodedPuzzle) return { type: 'none' }
    const initial = decodeGrid(encodedPuzzle)
    if (!initial) {
      clearPendingImportedPuzzle()
      return { type: 'error', message: 'Invalid puzzle link.' }
    }
    if (directPuzzle) {
      storePendingImportedPuzzle(encodedPuzzle)
    }
    return { type: 'game', initial }
  } catch {
    return { type: 'error', message: 'Invalid puzzle link.' }
  }
}

function cloneGrid(g: Grid): Grid { return g.map(r => [...r]) }

function loadStoredDifficultyLabel(): string | null {
  try {
    return localStorage.getItem('difficulty')
  } catch {
    return null
  }
}

function createImportedPuzzleMetadata(rating?: PuzzleRatingSummary | null): PuzzleMetadata {
  const difficulty =  rating?.difficulty
  return {
    source: 'imported',
    difficultyLabel: difficulty ? DIFFICULTY_LABELS[difficulty] : null,
    score: rating?.score ?? null,
  }
}

function createGeneratedPuzzleMetadata(
  source: Extract<PuzzleSource, 'generated' | 'preloaded'>,
  difficultyId: GameDifficulty,
  score: number | null,
): PuzzleMetadata {
  return {
    source,
    difficultyLabel: DIFFICULTY_LABELS[difficultyId],
    score,
  }
}

function createCreatedPuzzleMetadata(rating?: PuzzleRatingSummary | null): PuzzleMetadata {
  const difficulty = rating?.difficulty
  return {
    source: 'created',
    difficultyLabel: difficulty ? DIFFICULTY_LABELS[difficulty] : null,
    score: rating?.score ?? null,
  }
}

function getEffectiveAvailability(
  queueAvailability: PuzzleQueueAvailability,
  preloadedAvailability: PuzzleQueueAvailability,
): PuzzleQueueAvailability {
  return Object.fromEntries(
    (Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]).map(difficulty => [
      difficulty,
      queueAvailability[difficulty] > 0 ? queueAvailability[difficulty] : preloadedAvailability[difficulty],
    ]),
  ) as PuzzleQueueAvailability
}

export default function App(){
  const preloadedAvailability = getPreloadedPuzzleAvailability()
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if(saved === 'dark' || saved === 'light') return saved
    } catch {}
    return getDefaultThemePreference()
  })

  const [autoCheck, setAutoCheck] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('autoCheck')
      if (saved !== null) return saved === 'true'
    } catch {}
    return DEFAULT_AUTO_CHECK
  })

  const [autoRemove, setAutoRemove] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('autoRemove')
      if (saved !== null) return saved === 'true'
    } catch {}
    return DEFAULT_AUTO_REMOVE
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
    return DEFAULT_HAPTIC
  })

  useEffect(() => {
    try { localStorage.setItem('haptic', haptic ? 'true' : 'false') } catch {}
  }, [haptic])

  const [pencilMode, setPencilMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pencilMode')
      if (saved !== null) return saved === 'true'
    } catch {}
    return DEFAULT_PENCIL_MODE
  })

  useEffect(() => {
    try { localStorage.setItem('pencilMode', pencilMode ? 'true' : 'false') } catch {}
  }, [pencilMode])

  const [coordinateLabels, setCoordinateLabels] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('coordinateLabels')
      if (saved !== null) return saved === 'true'
    } catch {}
    return DEFAULT_COORDINATE_LABELS
  })

  useEffect(() => {
    try { localStorage.setItem('coordinateLabels', coordinateLabels ? 'true' : 'false') } catch {}
  }, [coordinateLabels])

  const [firstColorFlag, setFirstColorFlag] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('firstColorFlag')
      if (saved !== null) return saved === 'true'
    } catch {}
    return DEFAULT_FIRST_COLOR_FLAG
  })

  useEffect(() => {
    try { localStorage.setItem('firstColorFlag', firstColorFlag ? 'true' : 'false') } catch {}
  }, [firstColorFlag])

  useEffect(() => { initHaptic() }, [])

  const [puzzleAvailability, setPuzzleAvailability] = useState<PuzzleQueueAvailability>(() => getPuzzleQueueAvailability())
  useEffect(() => {
    const unsubscribe = subscribePuzzleQueueAvailability(setPuzzleAvailability)
    startPuzzleQueueDaemon()
    return unsubscribe
  }, [])
  const effectiveAvailability = getEffectiveAvailability(puzzleAvailability, preloadedAvailability)
  const hasAvailablePuzzle = Object.values(effectiveAvailability).some(count => count > 0)

  const [urlGame] = useState(() => {
    return parseUrlGame()
  })
  const savedGame = loadSaved()
  const autoOpenImportedGame = urlGame.type !== 'game'
    && shouldAutoOpenImportedGame()
    && savedGame?.puzzleMetadata?.source === 'imported'
    && !!savedGame.current
  const [homeError, setHomeError] = useState<string | null>(() => urlGame.type === 'error' ? urlGame.message : null)

  const [showHome, setShowHome] = useState(() => urlGame.type !== 'game' && !autoOpenImportedGame)
  const [creatorMode, setCreatorMode] = useState(false)
  const [puzzle, setPuzzle] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return cloneGrid(urlGame.initial)
    return savedGame?.current ?? null
  })
  const [solution, setSolution] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return null
    if (savedGame?.solution) return savedGame.solution
    return null
  })
  // Track the original blank clues separately so Share always encodes the unsolved puzzle
  const [initialGrid, setInitialGrid] = useState<Grid | null>(() => {
    if (urlGame.type === 'game') return cloneGrid(urlGame.initial)
    return savedGame?.initial ?? null
  })
  const [puzzleMetadata, setPuzzleMetadata] = useState<PuzzleMetadata | null>(() => {
    if (urlGame.type === 'game') return createImportedPuzzleMetadata()
    return savedGame?.puzzleMetadata ?? null
  })

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
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
    loadBrushPrefs()?.candidateMode ? 'candidate' : DEFAULT_PAINTING_SCOPE
  )
  const [importVerificationPending, setImportVerificationPending] = useState(() => urlGame.type === 'game')

  const [difficulty, setDifficulty] = useState<string | null>(() => {
    if (urlGame.type === 'game') return null
    if (savedGame?.puzzleMetadata?.difficultyLabel) return savedGame.puzzleMetadata.difficultyLabel
    return loadStoredDifficultyLabel()
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
      firstColorFlag,
    )
  }, [firstColorFlag, paintingScope])

  useEffect(() => {
    if (showHome || creatorMode) {
      setCanClearPainting(false)
      setCanClearDrawings(false)
      setCanIdentifyCandidates(false)
      setInfoOpen(false)
    }
  }, [showHome, creatorMode])

  useEffect(() => {
    if (urlGame.type !== 'game') return
    const controller = new AbortController()
    let active = true
    setImportVerificationPending(true)
    void verifyPuzzle(urlGame.initial, controller.signal)
      .then((verified) => {
        if (!active || controller.signal.aborted) return
        if (!verified) {
          clearAutoOpenImportedGame()
          setHomeError('This puzzle has no valid solution.')
          setShowHome(true)
          setPuzzle(null)
          setSolution(null)
          setInitialGrid(null)
          setPuzzleMetadata(null)
          setDifficulty(null)
          return
        }

        const initial = cloneGrid(urlGame.initial)
        const metadata = createImportedPuzzleMetadata(verified)
        setPuzzle(initial)
        setSolution(verified.solution)
        setInitialGrid(initial)
        setPuzzleMetadata(metadata)
        setDifficulty(metadata.difficultyLabel)
        clearElapsed()
        clearCompleted()
        setGameCompleted(false)
        markAutoOpenImportedGame()
        saveGame(initial, initial, verified.solution, undefined, undefined, undefined, undefined, undefined, metadata)
        setHomeError(null)
      })
      .catch((error) => {
        if (!active || controller.signal.aborted) return
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Failed to verify imported puzzle:', error)
        clearAutoOpenImportedGame()
        setHomeError('Failed to verify imported puzzle.')
        setShowHome(true)
        setPuzzle(null)
        setSolution(null)
        setInitialGrid(null)
        setPuzzleMetadata(null)
        setDifficulty(null)
      })
      .finally(() => {
        if (active && !controller.signal.aborted) {
          clearPendingImportedPuzzle()
          setImportVerificationPending(false)
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [urlGame])

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
    clearAutoOpenImportedGame()
    setHomeError(null)
    setCreatorMode(false)
    setNewGameOpen(true)
  }

  function handleCreated() {
    clearAutoOpenImportedGame()
    setHomeError(null)
    setCreatorMode(true)
    setShowHome(false)
  }

  function handleResetSettings() {
    setTheme(getDefaultThemePreference())
    setAutoCheck(DEFAULT_AUTO_CHECK)
    setAutoRemove(DEFAULT_AUTO_REMOVE)
    setHaptic(DEFAULT_HAPTIC)
    setPencilMode(DEFAULT_PENCIL_MODE)
    setCoordinateLabels(DEFAULT_COORDINATE_LABELS)
    setPaintingScope(DEFAULT_PAINTING_SCOPE)
    setFirstColorFlag(DEFAULT_FIRST_COLOR_FLAG)
    resetPuzzleQueueDaemon()
    setToast('Settings reset.')
    setTimeout(() => setToast(null), 2200)
    setSettingsOpen(false)
  }

  async function startNewWithDifficulty(difficultyId: GameDifficulty, signal: AbortSignal){
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const queuedGame = await takeQueuedGame(difficultyId)
    const nextGame = queuedGame ?? takePreloadedPuzzle(difficultyId)
    if (!nextGame) throw new Error('This difficulty is still generating.')
    const { puzzle: p, solution: s, score } = nextGame
    const diffLabel = DIFFICULTY_LABELS[difficultyId]
    const metadata = createGeneratedPuzzleMetadata(queuedGame ? 'generated' : 'preloaded', difficultyId, score)
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
    saveGame(initial, p, s, undefined, undefined, undefined, undefined, undefined, metadata)
    clearAutoOpenImportedGame()
    setDifficulty(diffLabel)
    setPuzzleMetadata(metadata)
    setHomeError(null)
    setGameId(id => id + 1)
    setCreatorMode(false)
    setShowHome(false)
  }

  function startCreatedPuzzle(initial: Grid, verified: VerifiedPuzzle) {
    const current = cloneGrid(initial)
    setPuzzle(current)
    setSolution(verified.solution)
    setInitialGrid(cloneGrid(initial))
    clearElapsed()
    clearCompleted()
    setGameCompleted(false)
    const metadata = createCreatedPuzzleMetadata(verified)
    saveGame(initial, current, verified.solution, undefined, undefined, undefined, undefined, undefined, metadata)
    clearAutoOpenImportedGame()
    setDifficulty(metadata.difficultyLabel)
    setPuzzleMetadata(metadata)
    setHomeError(null)
    setGameId(id => id + 1)
    setCreatorMode(false)
    setShowHome(false)
  }

  function handleContinue(){
    const saved = loadSaved()
    if(saved?.current) {
      clearAutoOpenImportedGame()
      setPuzzle(saved.current)
      setSolution(saved.solution ?? null)
      setInitialGrid(saved.initial)
      setPuzzleMetadata(saved.puzzleMetadata ?? null)
      setDifficulty(saved.puzzleMetadata?.difficultyLabel ?? loadStoredDifficultyLabel())
      setHomeError(null)
      setCreatorMode(false)
      setShowHome(false)
    } else {
      handleNew()
    }
  }

  function handleBackToHome() {
    clearAutoOpenImportedGame()
    setCreatorMode(false)
    setShowHome(true)
  }

  const showBoard = !showHome && !creatorMode && !importVerificationPending

  return (
    <div className="app-root">
      <TopBar
        showBack={!showHome && !importVerificationPending}
        onBack={handleBackToHome}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenInfo={showBoard && !!initialGrid ? () => setInfoOpen(true) : undefined}
        onShare={showBoard && !!initialGrid ? handleShare : undefined}
        onRestart={showBoard && !!initialGrid ? () => boardRestartRef.current?.() : undefined}
        onClearPainting={showBoard ? () => clearColorsRef.current?.() : undefined}
        canClearPainting={canClearPainting}
        onClearDrawings={showBoard ? () => clearDrawingsRef.current?.() : undefined}
        canClearDrawings={canClearDrawings}
        onIdentifyCandidates={showBoard ? () => identifyCandidatesRef.current?.() : undefined}
        canIdentifyCandidates={canIdentifyCandidates}
        title="Sudoku"
      />
      <div className="app">
        {showHome ? (
          <Home hasSaved={!!puzzle && !gameCompleted} onNew={handleNew} onContinue={handleContinue} onCreated={handleCreated} error={homeError} hasAvailablePuzzle={hasAvailablePuzzle} />
        ) : creatorMode ? (
          <PuzzleCreator
            onStart={startCreatedPuzzle}
            coordinateLabels={coordinateLabels}
            pencilMode={pencilMode}
            haptic={haptic}
            onTriggerHaptic={triggerHaptic}
            onTriggerErrorHaptic={triggerErrorHaptic}
          />
        ) : importVerificationPending ? (
          <div className="home">
            <p>Verifying imported puzzle...</p>
          </div>
        ) : (
          <Board
            key={gameId}
            puzzle={puzzle || undefined}
            setPuzzle={(p)=> setPuzzle(p)}
            onBack={handleBackToHome}
            solution={solution}
            autoCheck={autoCheck}
            autoRemove={autoRemove}
            haptic={haptic}
            onTriggerHaptic={triggerHaptic}
            onTriggerErrorHaptic={triggerErrorHaptic}
            onNew={handleNew}
            onShare={handleShare}
            onWin={() => { setGameCompleted(true); saveCompleted() }}
            difficulty={difficulty}
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
             puzzleMetadata={puzzleMetadata}
           />
         )}
         <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} onReset={handleResetSettings} theme={theme} setTheme={(t)=> setTheme(t)} autoCheck={autoCheck} setAutoCheck={setAutoCheck} autoRemove={autoRemove} setAutoRemove={setAutoRemove} haptic={haptic} setHaptic={setHaptic} pencilMode={pencilMode} setPencilMode={setPencilMode} coordinateLabels={coordinateLabels} setCoordinateLabels={setCoordinateLabels} paintingScope={paintingScope} setPaintingScope={setPaintingScope} firstColorFlag={firstColorFlag} setFirstColorFlag={setFirstColorFlag} />
         <PuzzleInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} metadata={puzzleMetadata} />
         <NewGameModal open={newGameOpen} onClose={() => setNewGameOpen(false)} onStart={startNewWithDifficulty} availability={effectiveAvailability} />
       </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
