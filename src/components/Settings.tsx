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
}

export default function Settings({ open, onClose, theme, setTheme, autoCheck, setAutoCheck, autoRemove, setAutoRemove }: Props){
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
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
