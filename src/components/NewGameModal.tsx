import React from 'react'
import { DIFFICULTY_CONFIGURATIONS } from '../utils/generators/orchestrator' 
import { GameDifficulty } from '../utils/generators/types'
import type { PuzzleQueueAvailability } from '../utils/puzzleQueue'

const LAST_DIFFICULTY_KEY = 'lastDifficulty:hodoku'
const DEFAULT_DIFFICULTY: GameDifficulty = 'MEDIUM'
function loadLastDifficulty(): GameDifficulty {
  try {
    const v = localStorage.getItem(LAST_DIFFICULTY_KEY)
    if (v && Object.keys(DIFFICULTY_CONFIGURATIONS).includes(v)) return v as GameDifficulty
    return DEFAULT_DIFFICULTY
  } catch {}
  return DEFAULT_DIFFICULTY
}

type Props = {
  open: boolean
  onClose: () => void
  onStart: (difficultyId: GameDifficulty, signal: AbortSignal) => Promise<void>
  availability: PuzzleQueueAvailability
}

function findFirstAvailableDifficulty(availability: PuzzleQueueAvailability): GameDifficulty | null {
  return (Object.keys(DIFFICULTY_CONFIGURATIONS) as GameDifficulty[]).find(
    difficulty => availability[difficulty] > 0,
  ) ?? null
}

export default function NewGameModal({ open, onClose, onStart, availability }: Props){
  const [choice, setChoice] = React.useState<GameDifficulty>(loadLastDifficulty)
  const [generating, setGenerating] = React.useState(false)
  const controllerRef = React.useRef<AbortController | null>(null)
  const cancelledRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    if (availability[choice] > 0) return
    const fallback = findFirstAvailableDifficulty(availability)
    if (fallback && fallback !== choice) setChoice(fallback)
  }, [availability, choice, open])

  if(!open) return null
  const anyDifficultyAvailable = Object.values(availability).some(count => count > 0)
  const selectedDifficultyAvailable = availability[choice] > 0

  async function handleStart(){
    if (!selectedDifficultyAvailable) return
    try {
      localStorage.setItem(LAST_DIFFICULTY_KEY, choice)
    } catch {}
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
          {Object.keys(DIFFICULTY_CONFIGURATIONS).map(d => d as GameDifficulty).map(d => (
            <button key={d} onClick={()=>{ if(!generating && availability[d] > 0) setChoice(d) }} aria-pressed={choice===d} disabled={generating || availability[d] === 0}
              style={{borderRadius:12,padding:'10px 16px',textAlign:'left',background:choice===d?'var(--accent)':'var(--card)',color:choice===d?'#fff':'var(--text)',border:choice===d?'none':'1px solid rgba(128,128,128,0.35)'}}>
              {DIFFICULTY_CONFIGURATIONS[d].label}
            </button>
          ))}
        </div>
        {!anyDifficultyAvailable && (
          <p style={{margin:'10px 0 0',color:'var(--muted, #666)'}}>Generating puzzles in background…</p>
        )}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
          <button onClick={handleCancel}>{generating ? 'Cancel' : 'Cancel'}</button>
          <button onClick={handleStart} disabled={generating || !selectedDifficultyAvailable} style={{display:'flex',alignItems:'center',gap:6}}>
            {generating && <span className="spinner" />}
            {generating ? 'Generating…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
