import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initSudoku } from './utils/sudoku'

(async function bootstrap(){
  try{
    await initSudoku()
  }catch(e){
    console.warn('Sudoku init failed:', e)
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
  }
})()
