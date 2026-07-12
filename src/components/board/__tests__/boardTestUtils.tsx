import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Board from '../../Board'
import { emptyCandidateColors, emptyCellColors, type PuzzleMetadata, loadSaved, loadElapsed } from '../../../utils/gameStorage'
import { analyzeRequiredTechniques } from '../../../utils/generators/hodoku'
import { createTestStore } from '../../../testUtils'
import { type GameState } from '../../../store/gameSlice'
import { Provider } from 'react-redux'

export const mockedAnalyzeRequiredTechniques = vi.mocked(analyzeRequiredTechniques)

export const EMPTY_NOTES = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))

export function resetBoardTestEnvironment() {
  vi.restoreAllMocks()
  localStorage.clear()
  mockedAnalyzeRequiredTechniques.mockReset()
  clipboardMocks.writeClipboardText.mockReset()
}

export const SOLUTION: number[][] = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

export const PUZZLE: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 3, 0, 6, 7, 8, 9, 1, 2] : [...row]
)

export const PUZZLE_WITH_7_REMAINING: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 3, 0, 6, 0, 8, 9, 1, 2] : [...row]
)

export const PUZZLE_WITH_3_REMAINING: number[][] = SOLUTION.map((row, r) => {
  if (r === 0) return [5, 3, 0, 6, 7, 8, 9, 1, 2]
  if (r === 1) return [6, 7, 2, 1, 9, 5, 0, 4, 8]
  return [...row]
})

export const PUZZLE_WITH_MULTIPLE_CANDIDATES: number[][] = SOLUTION.map((row, r) => {
  if (r === 0) return [5, 3, 0, 6, 0, 8, 9, 1, 2]
  if (r === 1) return [6, 0, 2, 1, 9, 5, 3, 4, 8]
  if (r === 7) return [2, 8, 0, 4, 1, 9, 6, 3, 5]
  return [...row]
})

export const FULL_GRID_NO_EMPTY: number[][] = SOLUTION.map((row, r) =>
  r === 0 ? [5, 5, 4, 6, 7, 8, 9, 1, 2] : [...row]
)

export const ALMOST_DONE: number[][] = SOLUTION.map((row, r) =>
  r === 8 ? [...row.slice(0, 8), 0] : [...row]
)

export async function waitForBoard() {
  await screen.findAllByRole('gridcell')
}

export function createBoardTestStore(
  gameOverrides?: Partial<GameState>,
  settingsOverrides?: Record<string, any>
) {
  return createTestStore({
    game: {
      initial: PUZZLE as any,
      current: PUZZLE as any,
      solution: SOLUTION as any,
      notes: EMPTY_NOTES,
      cellColors: emptyCellColors(),
      candidateColors: emptyCandidateColors(),
      flaggedColorCell: null,
      puzzleMetadata: null,
      elapsed: 0,
      paused: false,
      manualPause: false,
      won: false,
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
      gameId: 1,
      ...gameOverrides,
    } as GameState,
    settings: {
      pencilMode: false,
      coordinateLabels: 'none' as any,
      firstColorFlag: false,
      paintingScope: 'digit' as const,
      autoCheck: true,
      autoRemove: true,
      haptic: false,
      ...settingsOverrides,
    } as any,
  })
}

export function renderBoard(
  puzzle: number[][],
  solution: number[][],
  options?: {
    puzzleMetadata?: PuzzleMetadata | null
    pencilMode?: boolean
    coordinateLabels?: string
    firstColorFlag?: boolean
    paintingScope?: 'digit' | 'candidate'
    autoCheck?: boolean
    autoRemove?: boolean
    haptic?: boolean
    onBack?: () => void
    onNew?: () => void
    onShare?: () => void
    onTriggerHaptic?: () => void
    onTriggerErrorHaptic?: () => void
    useLocalStorage?: boolean
  }
) {
  let gameOverrides: Partial<GameState> = {
    initial: puzzle as any,
    current: puzzle as any,
    solution: solution as any,
    puzzleMetadata: options?.puzzleMetadata ?? null,
  }

  if (options?.useLocalStorage) {
    const saved = loadSaved()
    if (saved) {
      gameOverrides = {
        initial: saved.initial as any,
        current: saved.current as any,
        solution: saved.solution as any,
        notes: saved.notes,
        cellColors: saved.cellColors,
        candidateColors: saved.candidateColors,
        flaggedColorCell: saved.flaggedColorCell,
        puzzleMetadata: saved.puzzleMetadata,
        elapsed: loadElapsed(),
      }
    }
  }

  const store = createBoardTestStore(
    gameOverrides,
    {
      pencilMode: options?.pencilMode ?? false,
      coordinateLabels: (options?.coordinateLabels ?? 'none') as any,
      firstColorFlag: options?.firstColorFlag ?? false,
      paintingScope: options?.paintingScope ?? 'digit',
      autoCheck: options?.autoCheck ?? true,
      autoRemove: options?.autoRemove ?? true,
      haptic: options?.haptic ?? false,
    }
  )
  const result = render(
    <Provider store={store}>
      <Board
        onBack={options?.onBack}
        onNew={options?.onNew}
        onShare={options?.onShare}
        onTriggerHaptic={options?.onTriggerHaptic}
        onTriggerErrorHaptic={options?.onTriggerErrorHaptic}
      />
    </Provider>
  )
  return { ...result, store }
}

export async function openMoreTools(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /toggle more tools/i }))
}

export async function openHistoryToolsFromMore(user: ReturnType<typeof userEvent.setup>) {
  await openMoreTools(user)
  await user.click(screen.getByRole('button', { name: /^history$/i }))
}

export function mockCellRect(cell: Element, size = 90, left = 0, top = 0) {
  Object.defineProperty(cell, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: left,
      y: top,
      top,
      left,
      width: size,
      height: size,
      right: left + size,
      bottom: top + size,
      toJSON: () => ({}),
    }),
  })
}

export function emptyNotesGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))
}

export function mockLandscapeOrientation(matches: boolean) {
  const originalMatchMedia = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(orientation: landscape)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  }
}
