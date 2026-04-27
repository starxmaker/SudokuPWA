import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initSudoku } from './utils/sudoku'
import { warmupHodoku } from './utils/generators/hodoku'

function hideSplashScreen() {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('app-splash--hidden')
  window.setTimeout(() => splash.remove(), 180)
}

(async function bootstrap(){
  try{
    await initSudoku()
  }catch(e){
    console.warn('Sudoku init failed:', e)
  }

  // Pre-fetch the TeaVM runtime in the background so it's ready when the
  // user clicks "New Game".
  warmupHodoku()

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  requestAnimationFrame(() => hideSplashScreen())

  // Service worker is registered automatically by vite-plugin-pwa (injectRegister: 'auto')
})()
