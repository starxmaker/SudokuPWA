import { type ReactElement, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, type RenderOptions } from '@testing-library/react'
import settingsReducer, { type SettingsState } from './store/settingsSlice'
import uiReducer, { type UIState } from './store/uiSlice'
import gameReducer, { type GameState } from './store/gameSlice'
import { localStorageMiddleware } from './store/localStorageMiddleware'
import { hydrateFromLocalStorage } from './store/hydration'

type TestRootState = {
  settings: SettingsState
  ui: UIState
  game: GameState
}

export function createTestStore(preloadedState?: Partial<TestRootState>) {
  const hydrated = hydrateFromLocalStorage() as any
  const merged: any = { ...preloadedState }
  // Only hydrate settings from localStorage (game state is too partial)
  if (!merged.settings) merged.settings = {}
  merged.settings = { ...hydrated.settings, ...merged.settings }
  return configureStore({
    reducer: {
      settings: settingsReducer,
      ui: uiReducer,
      game: gameReducer,
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
