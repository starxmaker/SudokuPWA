import React, { useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import Home from './components/Home'
import TopBar from './components/TopBar'
import Settings from './components/Settings'
import NewGameModal from './components/NewGameModal'
import PuzzleInfoModal from './components/PuzzleInfoModal'
import PuzzleCreator from './components/PuzzleCreator'
import { loadSaved, loadCompleted, encodeGrid } from './utils/gameStorage'
import { initHaptic, triggerHaptic, triggerErrorHaptic } from './utils/haptic'
import type { Grid } from './utils/sudoku'
import { getPuzzleQueueAvailability, resetPuzzleQueueDaemon, startPuzzleQueueDaemon, subscribePuzzleQueueAvailability, takeQueuedGame } from './utils/appPuzzleQueue'
import type { PuzzleQueueAvailability } from './utils/puzzleQueue'
import { DIFFICULTY_LABELS, GameDifficulty } from './utils/difficulties'
import { type VerifiedPuzzle, verifyPuzzle } from './utils/generators/hodoku'
import { getPreloadedPuzzleAvailability, takePreloadedPuzzle } from './utils/preloadedPuzzles'
import { useI18n } from './utils/i18n'
import { useAppSelector, useAppDispatch } from './store/hooks'
import {
  parseUrlGame, clearPendingImportedPuzzle, markAutoOpenImportedGame,
  shouldAutoOpenImportedGame, clearAutoOpenImportedGame,
  createImportedPuzzleMetadata, createGeneratedPuzzleMetadata, createCreatedPuzzleMetadata,
  cloneGrid,
} from './utils/importedPuzzle'
import { getEffectiveAvailability } from './utils/puzzleMetadata'
import {
  setDifficulty, resetSettings,
} from './store/settingsSlice'
import {
  setShowHome, setCreatorMode, setSettingsOpen, setInfoOpen,
  setNewGameOpen, showToast, setImportVerificationPending, setHomeError,
} from './store/uiSlice'
import { startNewGame, setCurrent, markWon } from './store/gameSlice'

export default function App(){
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const preloadedAvailability = getPreloadedPuzzleAvailability()

  const theme = useAppSelector(s => s.settings.theme)
  const autoCheck = useAppSelector(s => s.settings.autoCheck)
  const autoRemove = useAppSelector(s => s.settings.autoRemove)
  const haptic = useAppSelector(s => s.settings.haptic)
  const pencilMode = useAppSelector(s => s.settings.pencilMode)
  const coordinateLabels = useAppSelector(s => s.settings.coordinateLabels)
  const firstColorFlag = useAppSelector(s => s.settings.firstColorFlag)
  const paintingScope = useAppSelector(s => s.settings.paintingScope)
  const difficultyLabel = useAppSelector(s => s.settings.difficulty)

  const showHome = useAppSelector(s => s.ui.showHome)
  const creatorMode = useAppSelector(s => s.ui.creatorMode)
  const settingsOpen = useAppSelector(s => s.ui.settingsOpen)
  const infoOpen = useAppSelector(s => s.ui.infoOpen)
  const newGameOpen = useAppSelector(s => s.ui.newGameOpen)
  const toast = useAppSelector(s => s.ui.toast)
  const importVerificationPending = useAppSelector(s => s.ui.importVerificationPending)
  const homeError = useAppSelector(s => s.ui.homeError)

  const gameInitial = useAppSelector(s => s.game.initial)
  const gameCurrent = useAppSelector(s => s.game.current)
  const gameSolution = useAppSelector(s => s.game.solution)
  const gamePuzzleMetadata = useAppSelector(s => s.game.puzzleMetadata)
  const gameCompleted = useAppSelector(s => s.game.won)
  const gameId = useAppSelector(s => s.game.gameId)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

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
  const isCompleted = gameCompleted || loadCompleted()
  const hasSaved = (!!gameCurrent && !isCompleted) || (!!savedGame?.current && !isCompleted)
  const autoOpenImportedGame = urlGame.type !== 'game'
    && shouldAutoOpenImportedGame()
    && savedGame?.puzzleMetadata?.source === 'imported'
    && !!savedGame.current
  const localHomeError = useRef(homeError)

  useEffect(() => {
    localHomeError.current = homeError
  }, [homeError])

  useEffect(() => {
    if (urlGame.type === 'error') {
      dispatch(setHomeError(t('app.invalidPuzzleLink')))
    }
  }, [urlGame, t, dispatch])

  useEffect(() => {
    if (urlGame.type === 'game' || autoOpenImportedGame) {
      dispatch(setShowHome(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showHome || creatorMode) {
      dispatch(setInfoOpen(false))
    }
  }, [showHome, creatorMode, dispatch])

  useEffect(() => {
    if (urlGame.type !== 'game') return
    const controller = new AbortController()
    let active = true
    dispatch(setImportVerificationPending(true))
    void verifyPuzzle(urlGame.initial, controller.signal)
      .then((verified) => {
        if (!active || controller.signal.aborted) return
        if (!verified) {
          clearAutoOpenImportedGame()
          dispatch(setHomeError(t('app.noValidSolution')))
          dispatch(setShowHome(true))
          const emptyGrid = urlGame.initial.map(row => row.map(() => 0))
          dispatch(startNewGame({ initial: emptyGrid, current: emptyGrid, solution: emptyGrid, puzzleMetadata: null }))
          return
        }
        const initial = cloneGrid(urlGame.initial)
        const metadata = createImportedPuzzleMetadata(verified)
        dispatch(startNewGame({ initial, current: initial, solution: verified.solution, puzzleMetadata: metadata }))
        dispatch(setDifficulty(metadata.difficultyLabel))
        markAutoOpenImportedGame()
        dispatch(setHomeError(null))
      })
      .catch((error) => {
        if (!active || controller.signal.aborted) return
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Failed to verify imported puzzle:', error)
        clearAutoOpenImportedGame()
        dispatch(setHomeError(t('app.failedVerifyImportedPuzzle')))
        dispatch(setShowHome(true))
      })
      .finally(() => {
        if (active && !controller.signal.aborted) {
          clearPendingImportedPuzzle()
          dispatch(setImportVerificationPending(false))
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [urlGame, dispatch, t])

  useEffect(() => {
    if (urlGame.type === 'game' || urlGame.type === 'error') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleShare() {
    if (!gameInitial) return
    const params = new URLSearchParams()
    params.set('p', encodeGrid(gameInitial))
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    const share = () => {
      dispatch(showToast(t('app.linkCopied')))
      setTimeout(() => dispatch(showToast(null)), 2200)
    }
    if (navigator.share) {
      navigator.share({ title: t('app.title'), url }).catch(() => {
        navigator.clipboard.writeText(url).then(share)
      })
    } else {
      navigator.clipboard.writeText(url).then(share)
    }
  }

  function handleNew(){
    clearAutoOpenImportedGame()
    dispatch(setHomeError(null))
    dispatch(setCreatorMode(false))
    dispatch(setNewGameOpen(true))
  }

  function handleCreated() {
    clearAutoOpenImportedGame()
    dispatch(setHomeError(null))
    dispatch(setCreatorMode(true))
    dispatch(setShowHome(false))
  }

  function handleResetSettings() {
    dispatch(resetSettings())
    resetPuzzleQueueDaemon()
    dispatch(showToast(t('app.settingsReset')))
    setTimeout(() => dispatch(showToast(null)), 2200)
    dispatch(setSettingsOpen(false))
  }

  async function startNewWithDifficulty(difficultyId: GameDifficulty, signal: AbortSignal){
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const queuedGame = await takeQueuedGame(difficultyId)
    const nextGame = queuedGame ?? takePreloadedPuzzle(difficultyId)
    if (!nextGame) throw new Error('This difficulty is still generating.')
    const { puzzle: p, solution: s, score } = nextGame
    const diffLabel = DIFFICULTY_LABELS[difficultyId]
    const metadata = createGeneratedPuzzleMetadata(queuedGame ? 'generated' : 'preloaded', difficultyId, score)
    await new Promise<void>(r => setTimeout(r, 0))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const initial = cloneGrid(p)
    dispatch(startNewGame({ initial, current: p, solution: s, puzzleMetadata: metadata }))
    clearAutoOpenImportedGame()
    dispatch(setDifficulty(diffLabel))
    dispatch(setHomeError(null))
    dispatch(setCreatorMode(false))
    dispatch(setShowHome(false))
  }

  function startCreatedPuzzle(initial: Grid, verified: VerifiedPuzzle) {
    const current = cloneGrid(initial)
    const metadata = createCreatedPuzzleMetadata(verified)
    dispatch(startNewGame({ initial: cloneGrid(initial), current, solution: verified.solution, puzzleMetadata: metadata }))
    clearAutoOpenImportedGame()
    dispatch(setDifficulty(metadata.difficultyLabel))
    dispatch(setHomeError(null))
    dispatch(setCreatorMode(false))
    dispatch(setShowHome(false))
  }

  function handleContinue(){
    const saved = loadSaved()
    clearAutoOpenImportedGame()
    dispatch(setHomeError(null))
    dispatch(setCreatorMode(false))
    if (saved?.puzzleMetadata?.difficultyLabel) {
      dispatch(setDifficulty(saved.puzzleMetadata.difficultyLabel))
    }
    dispatch(setShowHome(false))
  }

  function handleBackToHome() {
    clearAutoOpenImportedGame()
    dispatch(setCreatorMode(false))
    dispatch(setShowHome(true))
  }

  const showBoard = !showHome && !creatorMode && !importVerificationPending

  return (
    <div className="app-root">
      <TopBar
        showBack={!showHome && !importVerificationPending}
        onBack={handleBackToHome}
        onOpenSettings={() => dispatch(setSettingsOpen(true))}
        onOpenInfo={showBoard && !!gameInitial ? () => dispatch(setInfoOpen(true)) : undefined}
        onShare={showBoard && !!gameInitial ? handleShare : undefined}
        onRestart={undefined}
        title={t('app.title')}
      />
      <div className="app">
        {showHome ? (
          <Home hasSaved={hasSaved} onNew={handleNew} onContinue={handleContinue} onCreated={handleCreated} error={homeError} hasAvailablePuzzle={hasAvailablePuzzle} />
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
            <p>{t('app.verifyingImportedPuzzle')}</p>
          </div>
        ) : (
          <Board
            key={gameId}
            puzzle={gameCurrent}
            setPuzzle={(p) => dispatch(setCurrent(p))}
            onBack={handleBackToHome}
            solution={gameSolution}
            autoCheck={autoCheck}
            autoRemove={autoRemove}
            haptic={haptic}
            onTriggerHaptic={triggerHaptic}
            onTriggerErrorHaptic={triggerErrorHaptic}
            onNew={handleNew}
            onShare={handleShare}
            onWin={() => dispatch(markWon())}
            difficulty={difficultyLabel}
            pencilMode={pencilMode}
            coordinateLabels={coordinateLabels}
            firstColorFlag={firstColorFlag}
            paintingScope={paintingScope}
            puzzleMetadata={gamePuzzleMetadata}
          />
         )}
         <Settings open={settingsOpen} onClose={() => dispatch(setSettingsOpen(false))} onReset={handleResetSettings} />
         <PuzzleInfoModal open={infoOpen} onClose={() => dispatch(setInfoOpen(false))} metadata={gamePuzzleMetadata} />
         <NewGameModal open={newGameOpen} onClose={() => dispatch(setNewGameOpen(false))} onStart={startNewWithDifficulty} availability={effectiveAvailability} />
       </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
