import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type BrushPrefs = {
  activeColors: string[]
  activeDrawingColors: string[]
  candidateMode: boolean
  firstColorFlagEnabled: boolean
}

export type SettingsState = {
  theme: 'light' | 'dark'
  autoCheck: boolean
  autoRemove: boolean
  haptic: boolean
  pencilMode: boolean
  coordinateLabels: boolean
  firstColorFlag: boolean
  paintingScope: 'digit' | 'candidate'
  difficulty: string | null
  brushPrefs: BrushPrefs
}

function getDefaultTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    theme: getDefaultTheme() as 'light' | 'dark',
    autoCheck: true as boolean,
    autoRemove: true as boolean,
    haptic: true as boolean,
    pencilMode: false as boolean,
    coordinateLabels: false as boolean,
    firstColorFlag: false as boolean,
    paintingScope: 'digit' as 'digit' | 'candidate',
    difficulty: null as string | null,
    brushPrefs: {
      activeColors: [] as string[],
      activeDrawingColors: [] as string[],
      candidateMode: false as boolean,
      firstColorFlagEnabled: true as boolean,
    } as BrushPrefs,
  } as SettingsState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
    },
    setAutoCheck(state, action: PayloadAction<boolean>) {
      state.autoCheck = action.payload
    },
    setAutoRemove(state, action: PayloadAction<boolean>) {
      state.autoRemove = action.payload
    },
    setHaptic(state, action: PayloadAction<boolean>) {
      state.haptic = action.payload
    },
    setPencilMode(state, action: PayloadAction<boolean>) {
      state.pencilMode = action.payload
    },
    setCoordinateLabels(state, action: PayloadAction<boolean>) {
      state.coordinateLabels = action.payload
    },
    setFirstColorFlag(state, action: PayloadAction<boolean>) {
      state.firstColorFlag = action.payload
    },
    setPaintingScope(state, action: PayloadAction<'digit' | 'candidate'>) {
      state.paintingScope = action.payload
    },
    setDifficulty(state, action: PayloadAction<string | null>) {
      state.difficulty = action.payload
    },
    setBrushPrefs(state, action: PayloadAction<BrushPrefs>) {
      state.brushPrefs = action.payload
    },
    resetSettings(state) {
      state.theme = getDefaultTheme()
      state.autoCheck = true
      state.autoRemove = true
      state.haptic = true
      state.pencilMode = false
      state.coordinateLabels = false
      state.firstColorFlag = false
      state.paintingScope = 'digit'
      state.brushPrefs = { activeColors: [], activeDrawingColors: [], candidateMode: false, firstColorFlagEnabled: true }
      state.difficulty = null
    },
  },
})

export const {
  setTheme,
  setAutoCheck,
  setAutoRemove,
  setHaptic,
  setPencilMode,
  setCoordinateLabels,
  setFirstColorFlag,
  setPaintingScope,
  setDifficulty,
  setBrushPrefs,
  resetSettings,
} = settingsSlice.actions

export default settingsSlice.reducer
