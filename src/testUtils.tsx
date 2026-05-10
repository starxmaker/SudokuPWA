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
  const hydrated = hydrateFromLocalStorage() as Partial<TestRootState>
  const state = preloadedState
    ? { ...hydrated, ...preloadedState, settings: { ...hydrated.settings, ...preloadedState.settings }, ui: { ...hydrated.ui, ...preloadedState.ui }, game: { ...hydrated.game, ...preloadedState.game } }
    : hydrated
  return configureStore({
    reducer: {
      settings: settingsReducer,
      ui: uiReducer,
      game: gameReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(localStorageMiddleware),
    preloadedState: state as any,
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
