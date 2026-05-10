import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import './index.css'
import { initSudoku } from './utils/sudoku'
import { startPuzzleQueueDaemon } from './utils/appPuzzleQueue'
import { LocalizationProvider } from './utils/i18n'
import { installZoomGuards } from './utils/zoomGuards'

function hideSplashScreen() {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('app-splash--hidden')
  window.setTimeout(() => splash.remove(), 180)
}

(async function bootstrap(){
  installZoomGuards()
  try{
    await initSudoku()
  }catch(e){
    console.warn('Sudoku init failed:', e)
  }
  startPuzzleQueueDaemon()

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <LocalizationProvider>
          <App />
        </LocalizationProvider>
      </Provider>
    </React.StrictMode>
  )
  requestAnimationFrame(() => hideSplashScreen())

  // Service worker is registered automatically by vite-plugin-pwa (injectRegister: 'auto')
})()
