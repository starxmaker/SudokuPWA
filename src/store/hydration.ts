import {
  loadSaved,
  loadElapsed,
  loadCompleted,
  loadBrushPrefs,
  type PuzzleMetadata,
  type CellColorGrid,
  type CandidateColorGrid,
  type FlaggedColorCell,
  emptyCellColors,
  emptyCandidateColors,
} from '../utils/gameStorage'
import { parseCoordinateLabelMode, type CoordinateLabelMode } from '../utils/coordinateLabels'
import {
  DEFAULT_PUZZLE_GENERATION_COUNT,
  normalizePuzzleGenerationCount,
  PUZZLE_GENERATION_COUNT_STORAGE_KEY,
} from '../utils/puzzleGeneration'
import type { Grid } from '../utils/sudoku_types'

import type { BrushColorId, BoardHistoryEntry } from './gameSlice'

type HydratedGameState = {
  initial: Grid | null
  current: Grid | null
  solution: Grid | null
  notes: number[][][]
  cellColors: CellColorGrid
  candidateColors: CandidateColorGrid
  flaggedColorCell: FlaggedColorCell
  puzzleMetadata: PuzzleMetadata | null
  elapsed: number
  paused: boolean
  manualPause: boolean
  won: boolean
  finalTime: number
  history: BoardHistoryEntry[]
  redoHistory: BoardHistoryEntry[]
  selected: { r: number; c: number } | null
  notesMode: boolean
  eraserMode: boolean
  eraserColorPickerMode: boolean
  brushMode: boolean
  candidateToolMode: boolean
  historyToolMode: boolean
  moreToolMode: boolean
  activeBrushColor: BrushColorId
  candidateSelectedDigit: number | null
  shareCopied: boolean
  requiredTechniquesOpen: boolean
  requiredTechniquesLoading: boolean
  requiredTechniquesResult: import('../utils/generators/hodoku').RequiredTechniques | null
  requiredTechniquesError: string | null
  expandedTechniqueSteps: number[]
  gameId: number
}

type HydratedSettingsState = {
  theme: 'light' | 'dark'
  autoCheck: boolean
  autoRemove: boolean
  haptic: boolean
  pencilMode: boolean
  coordinateLabels: CoordinateLabelMode
  firstColorFlag: boolean
  paintingScope: 'digit' | 'candidate'
  puzzleGenerationCount: number
  difficulty: string | null
  brushPrefs: {
    activeColors: string[]
    candidateMode: boolean
    firstColorFlagEnabled: boolean
  }
}

type HydratedState = {
  game: HydratedGameState
  settings: HydratedSettingsState
}

function getDefaultThemePreference(): 'light' | 'dark' {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function hydrateGame(): HydratedGameState {
  const saved = loadSaved()
  return {
    initial: saved?.initial ?? null,
    current: saved?.current ?? null,
    solution: saved?.solution ?? null,
    notes: saved?.notes ?? Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])),
    cellColors: saved?.cellColors ?? emptyCellColors(),
    candidateColors: saved?.candidateColors ?? emptyCandidateColors(),
    flaggedColorCell: saved?.flaggedColorCell ?? null,
    puzzleMetadata: saved?.puzzleMetadata ?? null,
    elapsed: loadElapsed(),
    paused: false,
    manualPause: false,
    won: loadCompleted(),
    finalTime: 0,
    history: [],
    redoHistory: [],
    selected: null,
    notesMode: false,
    eraserMode: false,
    eraserColorPickerMode: false,
    brushMode: false,
    candidateToolMode: false,
    historyToolMode: false,
    moreToolMode: false,
    activeBrushColor: 'rose',
    candidateSelectedDigit: null,
    shareCopied: false,
    requiredTechniquesOpen: false,
    requiredTechniquesLoading: false,
    requiredTechniquesResult: null,
    requiredTechniquesError: null,
    expandedTechniqueSteps: [],
    gameId: 0,
  }
}

function hydrateSettings(): HydratedSettingsState {
  let theme: 'light' | 'dark' = getDefaultThemePreference()
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') theme = saved
  } catch {
    // Ignore unavailable localStorage.
  }

  let autoCheck = true
  try {
    const saved = localStorage.getItem('autoCheck')
    if (saved !== null) autoCheck = saved === 'true'
  } catch {
    // Ignore unavailable localStorage.
  }

  let autoRemove = true
  try {
    const saved = localStorage.getItem('autoRemove')
    if (saved !== null) autoRemove = saved === 'true'
  } catch {
    // Ignore unavailable localStorage.
  }

  let haptic = true
  try {
    const saved = localStorage.getItem('haptic')
    if (saved !== null) haptic = saved === 'true'
  } catch {
    // Ignore unavailable localStorage.
  }

  let pencilMode = false
  try {
    const saved = localStorage.getItem('pencilMode')
    if (saved !== null) pencilMode = saved === 'true'
  } catch {
    // Ignore unavailable localStorage.
  }

  let coordinateLabels: CoordinateLabelMode = 'none'
  try {
    const saved = localStorage.getItem('coordinateLabels')
    coordinateLabels = parseCoordinateLabelMode(saved)
  } catch {
    // Ignore unavailable localStorage.
  }

  let firstColorFlag = false
  try {
    const saved = localStorage.getItem('firstColorFlag')
    if (saved !== null) firstColorFlag = saved === 'true'
  } catch {
    // Ignore unavailable localStorage.
  }

  let puzzleGenerationCount = DEFAULT_PUZZLE_GENERATION_COUNT
  try {
    puzzleGenerationCount = normalizePuzzleGenerationCount(
      localStorage.getItem(PUZZLE_GENERATION_COUNT_STORAGE_KEY),
    )
  } catch {
    // Ignore unavailable localStorage.
  }

  let difficulty: string | null = null
  try {
    difficulty = localStorage.getItem('difficulty')
  } catch {
    // Ignore unavailable localStorage.
  }

  const brushPrefs = loadBrushPrefs()
  const paintingScope: 'digit' | 'candidate' = brushPrefs?.candidateMode ? 'candidate' : 'digit'

  return {
    theme,
    autoCheck,
    autoRemove,
    haptic,
    pencilMode,
    coordinateLabels,
    firstColorFlag,
    paintingScope,
    puzzleGenerationCount,
    difficulty,
    brushPrefs: brushPrefs ?? {
      activeColors: [],
      candidateMode: false,
      firstColorFlagEnabled: true,
    },
  }
}

export function hydrateFromLocalStorage(): HydratedState {
  return {
    game: hydrateGame(),
    settings: hydrateSettings(),
  }
}
