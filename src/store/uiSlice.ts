import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UIState = {
  showHome: boolean
  creatorMode: boolean
  settingsOpen: boolean
  infoOpen: boolean
  newGameOpen: boolean
  toast: string | null
  importVerificationPending: boolean
  homeError: string | null
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    showHome: true as boolean,
    creatorMode: false as boolean,
    settingsOpen: false as boolean,
    infoOpen: false as boolean,
    newGameOpen: false as boolean,
    toast: null as string | null,
    importVerificationPending: false as boolean,
    homeError: null as string | null,
  } as UIState,
  reducers: {
    setShowHome(state, action: PayloadAction<boolean>) {
      state.showHome = action.payload
    },
    setCreatorMode(state, action: PayloadAction<boolean>) {
      state.creatorMode = action.payload
    },
    setSettingsOpen(state, action: PayloadAction<boolean>) {
      state.settingsOpen = action.payload
    },
    setInfoOpen(state, action: PayloadAction<boolean>) {
      state.infoOpen = action.payload
    },
    setNewGameOpen(state, action: PayloadAction<boolean>) {
      state.newGameOpen = action.payload
    },
    showToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload
    },
    setImportVerificationPending(state, action: PayloadAction<boolean>) {
      state.importVerificationPending = action.payload
    },
    setHomeError(state, action: PayloadAction<string | null>) {
      state.homeError = action.payload
    },
  },
})

export const {
  setShowHome,
  setCreatorMode,
  setSettingsOpen,
  setInfoOpen,
  setNewGameOpen,
  showToast,
  setImportVerificationPending,
  setHomeError,
} = uiSlice.actions

export default uiSlice.reducer
