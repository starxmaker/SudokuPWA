import { configureStore } from '@reduxjs/toolkit'
import settingsReducer, { type SettingsState } from './settingsSlice'
import uiReducer, { type UIState } from './uiSlice'
import gameReducer, { type GameState } from './gameSlice'
import { localStorageMiddleware } from './localStorageMiddleware'
import { hydrateFromLocalStorage } from './hydration'

export type RootState = {
  settings: SettingsState
  ui: UIState
  game: GameState
}

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    ui: uiReducer,
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
  preloadedState: hydrateFromLocalStorage() as unknown as Partial<RootState>,
})

export type AppDispatch = typeof store.dispatch
