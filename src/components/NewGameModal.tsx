import React from 'react'
import { DEFAULT_GENERATOR_ID, getGenerator } from '../utils/generators'

const GENERATOR_ID = DEFAULT_GENERATOR_ID

function loadLastDifficulty(): string {
  try {
    const gen = getGenerator()
    const v = localStorage.getItem(`lastDifficulty:${GENERATOR_ID}`)
    if (v && gen.difficulties.some(d => d.id === v)) return v
    return gen.defaultDifficulty
  } catch {}
  return getGenerator().defaultDifficulty
}

type Props = {
  open: boolean
  onClose: () => void
  onStart: (generatorId: string, difficultyId: string, signal: AbortSignal) => Promise<void>
}

export default function NewGameModal({ open, onClose, onStart }: Props){
  const [choice, setChoice] = React.useState<string>(loadLastDifficulty)
  const [generating, setGenerating] = React.useState(false)
  const controllerRef = React.useRef<AbortController | null>(null)
  const cancelledRef = React.useRef(false)

  if(!open) return null

  const currentGen = getGenerator()

  async function handleStart(){
    try {
      localStorage.setItem(`lastDifficulty:${GENERATOR_ID}`, choice)
    } catch {}
    cancelledRef.current = false
    const controller = new AbortController()
    controllerRef.current = controller
    setGenerating(true)
    try {
      await onStart(GENERATOR_ID, choice, controller.signal)
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
          {currentGen.difficulties.map(d => (
            <button key={d.id} onClick={()=>{ if(!generating) setChoice(d.id) }} aria-pressed={choice===d.id} disabled={generating}
              style={{borderRadius:12,padding:'10px 16px',textAlign:'left',background:choice===d.id?'var(--accent)':'var(--card)',color:choice===d.id?'#fff':'var(--text)',border:choice===d.id?'none':'1px solid rgba(128,128,128,0.35)'}}>
              {d.label}
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
