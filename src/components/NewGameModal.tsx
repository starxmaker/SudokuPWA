import React from 'react'
import type { Difficulty } from '../utils/sudoku'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert']
const LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
}
const STORAGE_KEY = 'lastDifficulty'

function loadLast(): Difficulty {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Difficulty | null
    if (v && DIFFICULTIES.includes(v)) return v
  } catch {}
  return 'medium'
}

type Props = {
  open: boolean
  onClose: () => void
  onStart: (difficulty: Difficulty, signal: AbortSignal) => Promise<void>
}

export default function NewGameModal({ open, onClose, onStart }: Props){
  const [choice, setChoice] = React.useState<Difficulty>(loadLast)
  const [generating, setGenerating] = React.useState(false)
  const controllerRef = React.useRef<AbortController | null>(null)
  const cancelledRef = React.useRef(false)

  if(!open) return null

  async function handleStart(){
    try { localStorage.setItem(STORAGE_KEY, choice) } catch {}
    cancelledRef.current = false
    const controller = new AbortController()
    controllerRef.current = controller
    setGenerating(true)
    try {
      await onStart(choice, controller.signal)
      if (!cancelledRef.current) onClose()
    } catch {
      // aborted or error — stay open
    } finally {
      setGenerating(false)
      controllerRef.current = null
    }
  }

  function handleCancel(){
    if (generating) {
      cancelledRef.current = true
      controllerRef.current?.abort()
      setGenerating(false) // stop spinner immediately
    } else {
      onClose()
    }
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" onClick={generating ? undefined : onClose}>
      <div className="settings-panel" onClick={e=>e.stopPropagation()}>
        <h2>New Game</h2>
        <p>Select difficulty</p>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={()=>{ if(!generating) setChoice(d) }} aria-pressed={choice===d} disabled={generating}
              style={{borderRadius:12,padding:'10px 16px',textAlign:'left',background:choice===d?'var(--accent)':'var(--card)',color:choice===d?'#fff':'var(--text)'}}>
              {LABELS[d]}
            </button>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
          <button onClick={handleCancel}>{generating ? 'Cancel' : 'Cancel'}</button>
          <button onClick={handleStart} disabled={generating} style={{display:'flex',alignItems:'center',gap:6}}>
            {generating && <span className="spinner" />}
            {generating ? 'Generating…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
