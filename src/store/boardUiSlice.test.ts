import { describe, it, expect } from 'vitest'
import boardUiReducer, {
  setCandidateOverlay,
  closeCandidateOverlay,
  setCandidateOverlayPreviewDigit,
  setBoardUiCandidateSelectedDigit,
  openPencilOverlay,
  closePencilOverlay,
  toggleEraserColorPickerMode,
  setEraserColorPickerMode,
  setVisibleToolTray,
  setToolTrayTransition,
  setToolTraySequence,
  setVisibleLowerPad,
  setLowerPadTransition,
  dismissPortraitTechniquesSummary,
  setTechniquesOpen,
  setTechniquesDockedOpen,
  resetBoardUi,
  type BoardUiState,
} from './boardUiSlice'

function createInitialState(overrides?: Partial<BoardUiState>): BoardUiState {
  return {
    candidateOverlay: null,
    candidateOverlayPreviewDigit: null,
    candidateSelectedDigit: null,
    pencilOverlayCell: null,
    eraserColorPickerMode: false,
    visibleToolTray: 'main',
    toolTrayTransition: null,
    toolTraySequence: null,
    visibleLowerPad: 'numbers',
    lowerPadTransition: null,
    portraitTechniquesSummaryDismissed: false,
    techniquesOpen: false,
    techniquesDockedOpen: false,
    ...overrides,
  }
}

describe('boardUiSlice reducers', () => {
  describe('closeCandidateOverlay', () => {
    it('clears overlay and preview digit', () => {
      const state = createInitialState({
        candidateOverlay: { r: 0, c: 0, top: 0, left: 0, size: 100, mode: 'paint' },
        candidateOverlayPreviewDigit: 4,
      })
      const next = boardUiReducer(state, closeCandidateOverlay(undefined))
      expect(next.candidateOverlay).toBeNull()
      expect(next.candidateOverlayPreviewDigit).toBeNull()
    })

    it('preserves selected digit when requested', () => {
      const state = createInitialState({
        candidateOverlay: { r: 0, c: 0, top: 0, left: 0, size: 100, mode: 'paint' },
        candidateSelectedDigit: 4,
      })
      const next = boardUiReducer(state, closeCandidateOverlay({ preserveSelectedDigit: true }))
      expect(next.candidateOverlay).toBeNull()
      expect(next.candidateSelectedDigit).toBe(4)
    })
  })

  describe('toggleEraserColorPickerMode', () => {
    it('toggles the mode', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, toggleEraserColorPickerMode())
      expect(next.eraserColorPickerMode).toBe(true)
      const next2 = boardUiReducer(next, toggleEraserColorPickerMode())
      expect(next2.eraserColorPickerMode).toBe(false)
    })
  })

  describe('resetBoardUi', () => {
    it('resets all ephemeral UI state', () => {
      const state = createInitialState({
        candidateOverlay: { r: 0, c: 0, top: 0, left: 0, size: 100, mode: 'paint' },
        candidateOverlayPreviewDigit: 4,
        candidateSelectedDigit: 5,
        pencilOverlayCell: { r: 0, c: 0, rect: { top: 0, left: 0, width: 50, height: 50 } },
        eraserColorPickerMode: true,
        visibleToolTray: 'brush',
        visibleLowerPad: 'colors',
      })
      const next = boardUiReducer(state, resetBoardUi())
      expect(next.candidateOverlay).toBeNull()
      expect(next.candidateOverlayPreviewDigit).toBeNull()
      expect(next.candidateSelectedDigit).toBeNull()
      expect(next.pencilOverlayCell).toBeNull()
      expect(next.eraserColorPickerMode).toBe(false)
      expect(next.visibleToolTray).toBe('main')
      expect(next.visibleLowerPad).toBe('numbers')
    })
  })

  describe('setToolTrayTransition', () => {
    it('sets transition', () => {
      const state = createInitialState()
      const transition = { from: 'main' as const, to: 'brush' as const, direction: 'forward' as const }
      const next = boardUiReducer(state, setToolTrayTransition(transition))
      expect(next.toolTrayTransition).toEqual(transition)
    })

    it('clears transition', () => {
      const state = createInitialState({ toolTrayTransition: { from: 'main' as const, to: 'brush' as const, direction: 'forward' as const } })
      const next = boardUiReducer(state, setToolTrayTransition(null))
      expect(next.toolTrayTransition).toBeNull()
    })
  })

  describe('setLowerPadTransition', () => {
    it('sets transition', () => {
      const state = createInitialState()
      const transition = { from: 'numbers' as const, to: 'colors' as const, direction: 'forward' as const }
      const next = boardUiReducer(state, setLowerPadTransition(transition))
      expect(next.lowerPadTransition).toEqual(transition)
    })
  })

  describe('dismissPortraitTechniquesSummary', () => {
    it('sets dismissed flag', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, dismissPortraitTechniquesSummary())
      expect(next.portraitTechniquesSummaryDismissed).toBe(true)
    })
  })

  describe('setTechniquesOpen', () => {
    it('sets techniques open', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setTechniquesOpen(true))
      expect(next.techniquesOpen).toBe(true)
    })
  })

  describe('setTechniquesDockedOpen', () => {
    it('sets techniques docked open', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setTechniquesDockedOpen(true))
      expect(next.techniquesDockedOpen).toBe(true)
    })
  })

  describe('setVisibleToolTray', () => {
    it('sets visible tool tray', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setVisibleToolTray('brush'))
      expect(next.visibleToolTray).toBe('brush')
    })
  })

  describe('setVisibleLowerPad', () => {
    it('sets visible lower pad', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setVisibleLowerPad('colors'))
      expect(next.visibleLowerPad).toBe('colors')
    })
  })

  describe('openPencilOverlay', () => {
    it('opens pencil overlay', () => {
      const state = createInitialState()
      const overlay = { r: 0, c: 0, rect: { top: 0, left: 0, width: 50, height: 50 } }
      const next = boardUiReducer(state, openPencilOverlay(overlay))
      expect(next.pencilOverlayCell).toEqual(overlay)
    })
  })

  describe('closePencilOverlay', () => {
    it('closes pencil overlay', () => {
      const state = createInitialState({ pencilOverlayCell: { r: 0, c: 0, rect: { top: 0, left: 0, width: 50, height: 50 } } })
      const next = boardUiReducer(state, closePencilOverlay())
      expect(next.pencilOverlayCell).toBeNull()
    })
  })

  describe('setEraserColorPickerMode', () => {
    it('sets eraser color picker mode', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setEraserColorPickerMode(true))
      expect(next.eraserColorPickerMode).toBe(true)
    })
  })

  describe('setCandidateOverlay', () => {
    it('sets candidate overlay', () => {
      const state = createInitialState()
      const overlay = { r: 0, c: 0, top: 0, left: 0, size: 100, mode: 'paint' as const }
      const next = boardUiReducer(state, setCandidateOverlay(overlay))
      expect(next.candidateOverlay).toEqual(overlay)
    })
  })

  describe('setCandidateOverlayPreviewDigit', () => {
    it('sets preview digit', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setCandidateOverlayPreviewDigit(4))
      expect(next.candidateOverlayPreviewDigit).toBe(4)
    })
  })

  describe('setBoardUiCandidateSelectedDigit', () => {
    it('sets selected digit', () => {
      const state = createInitialState()
      const next = boardUiReducer(state, setBoardUiCandidateSelectedDigit(5))
      expect(next.candidateSelectedDigit).toBe(5)
    })
  })
})
