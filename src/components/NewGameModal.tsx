import React from 'react'
import { GENERATORS, DEFAULT_GENERATOR_ID, getGenerator } from '../utils/generators'

const GENERATOR_STORAGE_KEY = 'lastGenerator'

function loadLastGenerator(): string {
  try {
    const v = localStorage.getItem(GENERATOR_STORAGE_KEY)
    if (v && GENERATORS.some(g => g.id === v)) return v
  } catch {}
  return DEFAULT_GENERATOR_ID
}

function loadLastDifficulty(genId: string): string {
  try {
    const gen = getGenerator(genId)
    const v = localStorage.getItem(`lastDifficulty:${genId}`)
    if (v && gen.difficulties.some(d => d.id === v)) return v
    return gen.defaultDifficulty
  } catch {}
  return getGenerator(genId).defaultDifficulty
}

type Props = {
  open: boolean
  onClose: () => void
  onStart: (generatorId: string, difficultyId: string, signal: AbortSignal) => Promise<void>
}

export default function NewGameModal({ open, onClose, onStart }: Props){
  const [generatorId, setGeneratorId] = React.useState<string>(loadLastGenerator)
  const [choice, setChoice] = React.useState<string>(() => loadLastDifficulty(loadLastGenerator()))
  const [generating, setGenerating] = React.useState(false)
  const controllerRef = React.useRef<AbortController | null>(null)
  const cancelledRef = React.useRef(false)

  if(!open) return null

  const currentGen = getGenerator(generatorId)

  function handleGeneratorChange(newGenId: string) {
    setGeneratorId(newGenId)
    setChoice(loadLastDifficulty(newGenId))
  }

  async function handleStart(){
    try {
      localStorage.setItem(`lastDifficulty:${generatorId}`, choice)
      localStorage.setItem(GENERATOR_STORAGE_KEY, generatorId)
    } catch {}
    cancelledRef.current = false
    const controller = new AbortController()
    controllerRef.current = controller
    setGenerating(true)
    try {
      await onStart(generatorId, choice, controller.signal)
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
              style={{borderRadius:12,padding:'10px 16px',textAlign:'left',background:choice===d.id?'var(--accent)':'var(--card)',color:choice===d.id?'#fff':'var(--text)'}}>
              {d.label}
            </button>
          ))}
        </div>
        <div style={{marginTop:14}}>
          <label htmlFor="generator-select" style={{display:'block',fontSize:'0.85rem',fontWeight:600,opacity:0.6,marginBottom:4}}>Generator</label>
          <select
            id="generator-select"
            className="generator-select"
            value={generatorId}
            disabled={generating}
            onChange={e => handleGeneratorChange(e.target.value)}
          >
            {GENERATORS.map(g => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
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
