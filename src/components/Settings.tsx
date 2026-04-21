import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  theme: 'light'|'dark'
  setTheme: (t: 'light'|'dark') => void
  autoCheck: boolean
  setAutoCheck: (v: boolean) => void
  autoRemove: boolean
  setAutoRemove: (v: boolean) => void
  haptic: boolean
  setHaptic: (v: boolean) => void
  pencilMode: boolean
  setPencilMode: (v: boolean) => void
  coordinateLabels: boolean
  setCoordinateLabels: (v: boolean) => void
  paintingScope: 'digit' | 'candidate'
  setPaintingScope: (v: 'digit' | 'candidate') => void
  firstColorFlag: boolean
  setFirstColorFlag: (v: boolean) => void
}

export default function Settings({ open, onClose, theme, setTheme, autoCheck, setAutoCheck, autoRemove, setAutoRemove, haptic, setHaptic, pencilMode, setPencilMode, coordinateLabels, setCoordinateLabels, paintingScope, setPaintingScope, firstColorFlag, setFirstColorFlag }: Props){
  React.useEffect(()=>{
    function onKey(e: KeyboardEvent){ if(e.key === 'Escape') onClose() }
    if(open){ window.addEventListener('keydown', onKey) }
    return ()=> window.removeEventListener('keydown', onKey)
  },[open,onClose])

  if(!open) return null
  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" onClick={(e)=> e.stopPropagation()}>
        <h2>Settings</h2>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12}}>
          <div>Dark mode</div>
          <label className="toggle-switch" aria-label="Toggle dark mode">
            <input
              type="checkbox"
              role="switch"
              aria-checked={theme === 'dark'}
              checked={theme === 'dark'}
              onChange={(e)=> setTheme(e.target.checked ? 'dark' : 'light')}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{marginTop:16}}>
          <div>
            <div>Painting scope</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Choose whether painting applies to digits or candidates</div>
          </div>
          <div role="group" aria-label="Painting scope" style={{display:'grid',gridTemplateColumns:'repeat(2, minmax(0, 1fr))',gap:8,marginTop:10}}>
            <button
              type="button"
              aria-pressed={paintingScope === 'digit'}
              onClick={() => setPaintingScope('digit')}
              style={{
                borderRadius:12,
                padding:'10px 14px',
                textAlign:'center',
                background:paintingScope === 'digit' ? 'var(--accent)' : 'var(--card)',
                color:paintingScope === 'digit' ? '#fff' : 'var(--text)',
                border:paintingScope === 'digit' ? 'none' : '1px solid rgba(128,128,128,0.35)',
              }}
            >
              Digits
            </button>
            <button
              type="button"
              aria-pressed={paintingScope === 'candidate'}
              onClick={() => setPaintingScope('candidate')}
              style={{
                borderRadius:12,
                padding:'10px 14px',
                textAlign:'center',
                background:paintingScope === 'candidate' ? 'var(--accent)' : 'var(--card)',
                color:paintingScope === 'candidate' ? '#fff' : 'var(--text)',
                border:paintingScope === 'candidate' ? 'none' : '1px solid rgba(128,128,128,0.35)',
              }}
            >
              Candidates
            </button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>Auto-check errors</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Highlight wrong numbers in red</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle auto-check errors">
            <input
              type="checkbox"
              role="switch"
              aria-checked={autoCheck}
              checked={autoCheck}
              onChange={(e)=> setAutoCheck(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>Auto-remove candidates</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Remove notes from same row, column &amp; box</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle auto-remove candidates">
            <input
              type="checkbox"
              role="switch"
              aria-checked={autoRemove}
              checked={autoRemove}
              onChange={(e)=> setAutoRemove(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>Haptic feedback</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Vibration when tapping cells &amp; numbers</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle haptic feedback">
            <input
              type="checkbox"
              role="switch"
              aria-checked={haptic}
              checked={haptic}
              onChange={(e)=> setHaptic(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>Pencil mode</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Draw digits with your finger or stylus</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle pencil mode">
            <input
              type="checkbox"
              role="switch"
              aria-checked={pencilMode}
              checked={pencilMode}
              onChange={(e)=> setPencilMode(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>Coordinate labels</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Show row letters A-I and column numbers 1-9</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle coordinate labels">
            <input
              type="checkbox"
              role="switch"
              aria-checked={coordinateLabels}
              checked={coordinateLabels}
              onChange={(e)=> setCoordinateLabels(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>First color flag</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Flag the first colored cell for quick reference</div>
          </div>
          <label className="toggle-switch" aria-label="Toggle first color flag">
            <input
              type="checkbox"
              role="switch"
              aria-checked={firstColorFlag}
              checked={firstColorFlag}
              onChange={(e)=> setFirstColorFlag(e.target.checked)}
            />
            <span className="switch" />
          </label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
