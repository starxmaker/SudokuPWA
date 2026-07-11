import { configureStore } from '@reduxjs/toolkit'
import settingsReducer, { type SettingsState } from './settingsSlice'
import uiReducer, { type UIState } from './uiSlice'
import gameReducer, { type GameState } from './gameSlice'
import boardUiReducer, { type BoardUiState } from './boardUiSlice'
import { localStorageMiddleware } from './localStorageMiddleware'
import { hydrateFromLocalStorage } from './hydration'

export type RootState = {
  settings: SettingsState
  ui: UIState
  game: GameState
  boardUi: BoardUiState
}

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    ui: uiReducer,
    game: gameReducer,
    boardUi: boardUiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
  preloadedState: hydrateFromLocalStorage() as unknown as Partial<RootState>,
})

export type AppDispatch = typeof store.dispatch
