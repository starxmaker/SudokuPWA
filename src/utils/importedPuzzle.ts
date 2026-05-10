import { decodeGrid, type PuzzleMetadata, type PuzzleSource } from './gameStorage'
import { Grid } from './sudoku'
import { DIFFICULTY_LABELS, GameDifficulty } from './difficulties'

type ParsedUrl =
  | { type: 'game'; initial: Grid }
  | { type: 'error'; reason: 'invalidPuzzleLink' }
  | { type: 'none' }

const PENDING_IMPORTED_PUZZLE_KEY = 'pending-imported-puzzle'
const AUTO_OPEN_IMPORTED_GAME_KEY = 'auto-open-imported-game'

function currentLocationUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function storePendingImportedPuzzle(encodedPuzzle: string) {
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

export function readPendingImportedPuzzle(): string | null {
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

export function clearPendingImportedPuzzle() {
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

export function markAutoOpenImportedGame() {
  try {
    sessionStorage.setItem(AUTO_OPEN_IMPORTED_GAME_KEY, '1')
  } catch {}
}

export function shouldAutoOpenImportedGame() {
  try {
    return sessionStorage.getItem(AUTO_OPEN_IMPORTED_GAME_KEY) === '1'
  } catch {
    return false
  }
}

export function clearAutoOpenImportedGame() {
  try {
    sessionStorage.removeItem(AUTO_OPEN_IMPORTED_GAME_KEY)
  } catch {}
}

export function parseUrlGame(): ParsedUrl {
  try {
    const params = new URLSearchParams(window.location.search)
    const directPuzzle = params.get('p')
    const encodedPuzzle = directPuzzle ?? readPendingImportedPuzzle()
    if (!encodedPuzzle) return { type: 'none' }
      const initial = decodeGrid(encodedPuzzle)
      if (!initial) {
        clearPendingImportedPuzzle()
        return { type: 'error', reason: 'invalidPuzzleLink' }
      }
    if (directPuzzle) {
      storePendingImportedPuzzle(encodedPuzzle)
    }
    return { type: 'game', initial }
  } catch {
    return { type: 'error', reason: 'invalidPuzzleLink' }
  }
}

type PuzzleRatingSummary = {
  difficulty: GameDifficulty | null
  score: number | null
}

export function createImportedPuzzleMetadata(rating?: PuzzleRatingSummary | null): PuzzleMetadata {
  const difficulty = rating?.difficulty
  return {
    source: 'imported',
    difficultyLabel: difficulty ? DIFFICULTY_LABELS[difficulty] : null,
    score: rating?.score ?? null,
  }
}

export function createGeneratedPuzzleMetadata(
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

export function createCreatedPuzzleMetadata(rating?: PuzzleRatingSummary | null): PuzzleMetadata {
  const difficulty = rating?.difficulty
  return {
    source: 'created',
    difficultyLabel: difficulty ? DIFFICULTY_LABELS[difficulty] : null,
    score: rating?.score ?? null,
  }
}

export function cloneGrid(g: Grid): Grid { return g.map(r => [...r]) }
