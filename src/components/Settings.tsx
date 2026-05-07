import React from 'react'
import type { AppLanguageSetting } from '../utils/i18n'
import { useI18n } from '../utils/i18n'

type Props = {
  open: boolean
  onClose: () => void
  onReset: () => void
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
  languageSetting: AppLanguageSetting
  setLanguageSetting: (language: AppLanguageSetting) => void
}

export default function Settings({
  open,
  onClose,
  onReset,
  theme,
  setTheme,
  autoCheck,
  setAutoCheck,
  autoRemove,
  setAutoRemove,
  haptic,
  setHaptic,
  pencilMode,
  setPencilMode,
  coordinateLabels,
  setCoordinateLabels,
  paintingScope,
  setPaintingScope,
  firstColorFlag,
  setFirstColorFlag,
  languageSetting,
  setLanguageSetting,
}: Props){
  const { t } = useI18n()

  React.useEffect(()=>{
    function onKey(e: KeyboardEvent){ if(e.key === 'Escape') onClose() }
    if(open){ window.addEventListener('keydown', onKey) }
    return ()=> window.removeEventListener('keydown', onKey)
  },[open,onClose])

  if(!open) return null
  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" onClick={(e)=> e.stopPropagation()}>
        <h2>{t('settings.title')}</h2>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12}}>
          <div>{t('settings.darkMode')}</div>
          <label className="toggle-switch" aria-label={t('settings.toggleDarkMode')}>
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
          <div>{t('language.label')}</div>
          <select
            aria-label={t('language.label')}
            value={languageSetting}
            onChange={(event) => setLanguageSetting(event.target.value as AppLanguageSetting)}
            style={{marginTop:8,width:'100%'}}
          >
            <option value="system">{t('language.auto')}</option>
            <option value="en">{t('language.english')}</option>
            <option value="es">{t('language.spanish')}</option>
          </select>
        </div>
        <div style={{marginTop:16}}>
          <div>
            <div>{t('settings.paintingScope')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.paintingScopeDescription')}</div>
          </div>
          <div role="group" aria-label={t('settings.paintingScope')} style={{display:'grid',gridTemplateColumns:'repeat(2, minmax(0, 1fr))',gap:8,marginTop:10}}>
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
              {t('settings.digits')}
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
              {t('settings.candidates')}
            </button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
          <div>
            <div>{t('settings.autoCheckErrors')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.autoCheckDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.toggleAutoCheck')}>
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
            <div>{t('settings.autoRemoveCandidates')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.autoRemoveDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.toggleAutoRemove')}>
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
            <div>{t('settings.hapticFeedback')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.hapticDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.toggleHaptic')}>
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
            <div>{t('settings.pencilMode')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.pencilDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.togglePencilMode')}>
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
            <div>{t('settings.coordinateLabels')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.coordinateLabelsDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.toggleCoordinateLabels')}>
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
            <div>{t('settings.firstColorFlag')}</div>
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>{t('settings.firstColorFlagDescription')}</div>
          </div>
          <label className="toggle-switch" aria-label={t('settings.toggleFirstColorFlag')}>
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
        <div style={{display:'flex',justifyContent:'space-between',marginTop:16,gap:12}}>
          <button type="button" onClick={onReset}>{t('settings.reset')}</button>
          <button onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  )
}
