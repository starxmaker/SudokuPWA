import { type ReactElement, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, type RenderOptions } from '@testing-library/react'
import settingsReducer, { type SettingsState } from './store/settingsSlice'
import uiReducer, { type UIState } from './store/uiSlice'
import gameReducer, { type GameState } from './store/gameSlice'
import boardUiReducer, { type BoardUiState } from './store/boardUiSlice'
import { localStorageMiddleware } from './store/localStorageMiddleware'
import { hydrateFromLocalStorage } from './store/hydration'

type TestRootState = {
  settings: SettingsState
  ui: UIState
  game: GameState
  boardUi: BoardUiState
}

export function createTestStore(preloadedState?: Partial<TestRootState>) {
  const hydrated = hydrateFromLocalStorage()
  const merged: Partial<TestRootState> = { ...preloadedState }
  merged.settings = { ...hydrated.settings, ...(merged.settings ?? {}) }
  return configureStore({
    reducer: {
      settings: settingsReducer,
      ui: uiReducer,
      game: gameReducer,
      boardUi: boardUiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(localStorageMiddleware),
    preloadedState: merged,
  })
}

export function renderWithProvider(
  ui: ReactElement,
  {
    preloadedState,
    ...renderOptions
  }: Omit<RenderOptions, 'wrapper'> & { preloadedState?: Partial<TestRootState> } = {}
) {
  const store = createTestStore(preloadedState)
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
