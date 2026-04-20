import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaEraser } from 'react-icons/fa'
import { MdOutlineFormatColorReset } from 'react-icons/md'
import { TbNumbers } from 'react-icons/tb'

type Props = {
  showBack?: boolean
  onBack?: () => void
  onOpenSettings: () => void
  onShare?: () => void
  onRestart?: () => void
  onClearPainting?: () => void
  onClearDrawings?: () => void
  onIdentifyCandidates?: () => void
  canIdentifyCandidates?: boolean
  title?: string
}

export default function TopBar({
  showBack,
  onBack,
  onOpenSettings,
  onShare,
  onRestart,
  onClearPainting,
  onClearDrawings,
  onIdentifyCandidates,
  canIdentifyCandidates = false,
  title = 'Sudoku PWA',
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const sidebar = (
    <>
      <div
        className={`sidebar-backdrop${menuOpen ? ' open' : ''}`}
        data-testid="sidebar-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <nav
        className={`sidebar${menuOpen ? ' open' : ''}`}
        role="menu"
        aria-label="Main menu"
        aria-hidden={!menuOpen}
      >
        <div className="sidebar-header">
          <button className="sidebar-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16"/>
              <line x1="16" y1="2" x2="2" y2="16"/>
            </svg>
          </button>
        </div>
        {onRestart && (
          <button role="menuitem" onClick={() => { setMenuOpen(false); onRestart() }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Restart
          </button>
        )}
        {onClearPainting && (
          <button role="menuitem" onClick={() => { setMenuOpen(false); onClearPainting() }}>
            <MdOutlineFormatColorReset size={20} style={{flexShrink:0}} />
            Clean painting
          </button>
        )}
        {onClearDrawings && (
          <button role="menuitem" onClick={() => { setMenuOpen(false); onClearDrawings() }}>
            <FaEraser size={18} style={{flexShrink:0}} />
            Clean drawings
          </button>
        )}
        {onIdentifyCandidates && (
          <button
            role="menuitem"
            disabled={!canIdentifyCandidates}
            onClick={() => { setMenuOpen(false); onIdentifyCandidates() }}
          >
            <TbNumbers size={20} style={{flexShrink:0}} />
            Show basic candidates
          </button>
        )}
        {onShare && (
          <button role="menuitem" onClick={() => { setMenuOpen(false); onShare() }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        )}
        <button role="menuitem" onClick={() => { setMenuOpen(false); onOpenSettings() }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </nav>
    </>
  )

  return (
    <>
      <header className="topbar">
        <div className="left">
          {showBack ? <button aria-label="Back" onClick={onBack}>←</button> : <div style={{width:36}} />}
        </div>
        <div className="center">
          <h1 className="title">{title}</h1>
        </div>
        <div className="right">
          <button
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen(v => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1"/>
              <rect y="9" width="20" height="2" rx="1"/>
              <rect y="15" width="20" height="2" rx="1"/>
            </svg>
          </button>
        </div>
      </header>
      {createPortal(sidebar, document.body)}
    </>
  )
}

