import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  ToolTrayView,
  ToolTrayTransition,
  ToolTraySequence,
  LowerPadView,
  LowerPadTransition,
  CandidateOverlayState,
} from '../components/board/boardUtils'

type PencilOverlayCell = {
  r: number
  c: number
  rect: { top: number; left: number; width: number; height: number }
  initialPointer?: { clientX: number; clientY: number; pointerId: number }
} | null

export type BoardUiState = {
  candidateOverlay: CandidateOverlayState | null
  candidateOverlayPreviewDigit: number | null
  candidateSelectedDigit: number | null
  pencilOverlayCell: PencilOverlayCell
  eraserColorPickerMode: boolean
  visibleToolTray: ToolTrayView
  toolTrayTransition: ToolTrayTransition | null
  toolTraySequence: ToolTraySequence | null
  visibleLowerPad: LowerPadView
  lowerPadTransition: LowerPadTransition | null
  portraitTechniquesSummaryDismissed: boolean
  techniquesOpen: boolean
  techniquesDockedOpen: boolean
}

export const boardUiSlice = createSlice({
  name: 'boardUi',
  initialState: {
    candidateOverlay: null as CandidateOverlayState | null,
    candidateOverlayPreviewDigit: null as number | null,
    candidateSelectedDigit: null as number | null,
    pencilOverlayCell: null as PencilOverlayCell,
    eraserColorPickerMode: false as boolean,
    visibleToolTray: 'main' as ToolTrayView,
    toolTrayTransition: null as ToolTrayTransition | null,
    toolTraySequence: null as ToolTraySequence | null,
    visibleLowerPad: 'numbers' as LowerPadView,
    lowerPadTransition: null as LowerPadTransition | null,
    portraitTechniquesSummaryDismissed: false as boolean,
    techniquesOpen: false as boolean,
    techniquesDockedOpen: false as boolean,
  } as BoardUiState,
  reducers: {
    setCandidateOverlay(state, action: PayloadAction<CandidateOverlayState | null>) {
      state.candidateOverlay = action.payload
    },
    closeCandidateOverlay(state, action: PayloadAction<{ preserveSelectedDigit?: boolean } | undefined>) {
      state.candidateOverlay = null
      state.candidateOverlayPreviewDigit = null
      if (!action.payload?.preserveSelectedDigit) {
        state.candidateSelectedDigit = null
      }
    },
    setCandidateOverlayPreviewDigit(state, action: PayloadAction<number | null>) {
      state.candidateOverlayPreviewDigit = action.payload
    },
    setBoardUiCandidateSelectedDigit(state, action: PayloadAction<number | null>) {
      state.candidateSelectedDigit = action.payload
    },
    openPencilOverlay(state, action: PayloadAction<PencilOverlayCell>) {
      state.pencilOverlayCell = action.payload
    },
    closePencilOverlay(state) {
      state.pencilOverlayCell = null
    },
    toggleEraserColorPickerMode(state) {
      state.eraserColorPickerMode = !state.eraserColorPickerMode
    },
    setEraserColorPickerMode(state, action: PayloadAction<boolean>) {
      state.eraserColorPickerMode = action.payload
    },
    setVisibleToolTray(state, action: PayloadAction<ToolTrayView>) {
      state.visibleToolTray = action.payload
    },
    setToolTrayTransition(state, action: PayloadAction<ToolTrayTransition | null>) {
      state.toolTrayTransition = action.payload
    },
    setToolTraySequence(state, action: PayloadAction<ToolTraySequence | null>) {
      state.toolTraySequence = action.payload
    },
    setVisibleLowerPad(state, action: PayloadAction<LowerPadView>) {
      state.visibleLowerPad = action.payload
    },
    setLowerPadTransition(state, action: PayloadAction<LowerPadTransition | null>) {
      state.lowerPadTransition = action.payload
    },
    dismissPortraitTechniquesSummary(state) {
      state.portraitTechniquesSummaryDismissed = true
    },
    resetPortraitTechniquesSummary(state) {
      state.portraitTechniquesSummaryDismissed = false
    },
    setTechniquesOpen(state, action: PayloadAction<boolean>) {
      state.techniquesOpen = action.payload
    },
    setTechniquesDockedOpen(state, action: PayloadAction<boolean>) {
      state.techniquesDockedOpen = action.payload
    },
    resetBoardUi(state) {
      state.candidateOverlay = null
      state.candidateOverlayPreviewDigit = null
      state.candidateSelectedDigit = null
      state.pencilOverlayCell = null
      state.eraserColorPickerMode = false
      state.visibleToolTray = 'main'
      state.toolTrayTransition = null
      state.toolTraySequence = null
      state.visibleLowerPad = 'numbers'
      state.lowerPadTransition = null
    },
  },
})

export const {
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
  resetPortraitTechniquesSummary,
  setTechniquesOpen,
  setTechniquesDockedOpen,
  resetBoardUi,
} = boardUiSlice.actions

export default boardUiSlice.reducer
