import React from 'react'
import type { PuzzleQueueAvailability } from '../utils/puzzleQueue'
import { DIFFICULTY_LABELS, GameDifficulty } from '../utils/difficulties'
import { useI18n } from '../utils/i18n'

const LAST_DIFFICULTY_KEY = 'lastDifficulty:hodoku'
const DEFAULT_DIFFICULTY: GameDifficulty = 'MEDIUM'
function loadLastDifficulty(): GameDifficulty {
  try {
    const v = localStorage.getItem(LAST_DIFFICULTY_KEY)
    if (v && Object.keys(DIFFICULTY_LABELS).includes(v)) return v as GameDifficulty
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
  return (Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]).find(
    difficulty => availability[difficulty] > 0,
  ) ?? null
}

export default function NewGameModal({ open, onClose, onStart, availability }: Props){
  const { getDifficultyLabel, t } = useI18n()
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
        <h2>{t('newGame.title')}</h2>
        <p>{t('newGame.selectDifficulty')}</p>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
          {Object.keys(DIFFICULTY_LABELS).map(d => d as GameDifficulty).map(d => (
            <button key={d} onClick={()=>{ if(!generating && availability[d] > 0) setChoice(d) }} aria-pressed={choice===d} disabled={generating || availability[d] === 0}
              style={{borderRadius:12,padding:'10px 16px',textAlign:'left',background:choice===d?'var(--accent)':'var(--card)',color:choice===d?'#fff':'var(--text)',border:choice===d?'none':'1px solid rgba(128,128,128,0.35)'}}>
              {getDifficultyLabel(d)}
            </button>
          ))}
        </div>
        {!anyDifficultyAvailable && (
          <p style={{margin:'10px 0 0',color:'var(--muted, #666)'}}>{t('newGame.generatingBackground')}</p>
        )}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
          <button onClick={handleCancel}>{t('newGame.cancel')}</button>
          <button onClick={handleStart} disabled={generating || !selectedDifficultyAvailable} style={{display:'flex',alignItems:'center',gap:6}}>
            {generating && <span className="spinner" />}
            {generating ? t('newGame.generating') : t('newGame.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
