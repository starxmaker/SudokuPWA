import React from 'react'
import type { PuzzleMetadata } from '../utils/gameStorage'

type Props = {
  open: boolean
  onClose: () => void
  metadata: PuzzleMetadata | null
}

function formatSource(source: PuzzleMetadata['source'] | null | undefined) {
  switch (source) {
    case 'generated':
      return 'Generated'
    case 'imported':
      return 'Imported'
    case 'created':
      return 'Created'
    default:
      return 'Unknown'
  }
}

function formatScore(score: number | null) {
  return score === null ? 'Not available' : score.toLocaleString()
}

export default function PuzzleInfoModal({ open, onClose, metadata }: Props) {
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', onKey)
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Puzzle info" onClick={onClose}>
      <div className="settings-panel" onClick={event => event.stopPropagation()}>
        <h2>Puzzle Info</h2>
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Source</div>
            <div>{formatSource(metadata?.source)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Difficulty</div>
            <div>{metadata?.difficultyLabel ?? 'Not available'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Score</div>
            <div>{formatScore(metadata?.score ?? null)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
