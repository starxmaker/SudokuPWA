import type { Middleware } from '@reduxjs/toolkit'
import type { RootState } from './index'
import {
  saveGame,
  saveElapsed,
  saveBrushPrefs,
} from '../utils/gameStorage'
import { PUZZLE_GENERATION_COUNT_STORAGE_KEY } from '../utils/puzzleGeneration'

const GAME_PERSIST_ACTIONS = new Set([
  'game/setCurrent',
  'game/setNotes',
  'game/setCellColors',
  'game/setCandidateColors',
  'game/setFlaggedColorCell',
  'game/setInitial',
  'game/setSolution',
  'game/setPuzzleMetadata',
  'game/startNewGame',
  'game/handleRetry',
  'game/clearAllColors',
  'game/clearAllNotes',
  'game/clearColorFromBoard',
  'game/clearSelectedBrushColors',
  'game/undo',
  'game/redo',
  'game/writeDigit',
  'game/toggleNote',
  'game/eraseCell',
  'game/applyCellBrushColor',
  'game/applyCandidateBrushColor',
  'game/removeCandidate',
  'game/fillAllCandidates',
  'game/applySingleCandidatesToDigits',
])

export const localStorageMiddleware: Middleware<unknown, RootState> = store => next => action => {
  const result = next(action)

  if (typeof action !== 'object' || action === null || !('type' in action)) {
    return result
  }

  const actionType = action.type as string
  const state = store.getState()

  if (actionType.startsWith('settings/')) {
    persistSettings(state)
  }

  if (GAME_PERSIST_ACTIONS.has(actionType)) {
    persistGame(state)
  }

  if (actionType === 'game/startNewGame' || actionType === 'game/handleRetry') {
    try { localStorage.removeItem('sudoku-pwa-completed') } catch { /* Ignore storage errors. */ }
    try { localStorage.removeItem('sudoku-pwa-elapsed') } catch { /* Ignore storage errors. */ }
  }

  if (actionType === 'game/tickElapsed') {
    try { localStorage.setItem('sudoku-pwa-elapsed', String(state.game.elapsed)) } catch { /* Ignore storage errors. */ }
  }

  if (actionType === 'game/winGame') {
    try { localStorage.setItem('sudoku-pwa-completed', '1') } catch { /* Ignore storage errors. */ }
  }

  return result
}

function persistSettings(state: RootState) {
  const s = state.settings
  try { localStorage.setItem('theme', s.theme) } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('autoCheck', s.autoCheck ? 'true' : 'false') } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('autoRemove', s.autoRemove ? 'true' : 'false') } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('haptic', s.haptic ? 'true' : 'false') } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('pencilMode', s.pencilMode ? 'true' : 'false') } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('coordinateLabels', s.coordinateLabels) } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem('firstColorFlag', s.firstColorFlag ? 'true' : 'false') } catch { /* Ignore storage errors. */ }
  try { localStorage.setItem(PUZZLE_GENERATION_COUNT_STORAGE_KEY, String(s.puzzleGenerationCount)) } catch { /* Ignore storage errors. */ }
  if (s.difficulty) {
    try { localStorage.setItem('difficulty', s.difficulty) } catch { /* Ignore storage errors. */ }
  } else {
    try { localStorage.removeItem('difficulty') } catch { /* Ignore storage errors. */ }
  }

  saveBrushPrefs(
    s.brushPrefs?.activeColors ?? [],
    s.paintingScope === 'candidate',
    s.firstColorFlag,
  )
}

function persistGame(state: RootState) {
  const g = state.game
  if (!g.initial || !g.current) return

  saveGame(
    g.initial,
    g.current,
    g.solution,
    g.notes,
    g.cellColors,
    g.candidateColors,
    g.flaggedColorCell,
    g.puzzleMetadata,
  )
  saveElapsed(g.elapsed)
}
