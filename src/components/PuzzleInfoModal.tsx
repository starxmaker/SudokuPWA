import React from 'react'
import type { PuzzleMetadata } from '../utils/gameStorage'
import { useI18n } from '../utils/i18n'

type Props = {
  open: boolean
  onClose: () => void
  metadata: PuzzleMetadata | null
}

function getSourceKey(source: PuzzleMetadata['source'] | null | undefined) {
  switch (source) {
    case 'generated':
      return 'puzzleInfo.source.generated'
    case 'preloaded':
      return 'puzzleInfo.source.preloaded'
    case 'imported':
      return 'puzzleInfo.source.imported'
    case 'created':
      return 'puzzleInfo.source.created'
    default:
      return 'puzzleInfo.source.unknown'
  }
}

export default function PuzzleInfoModal({ open, onClose, metadata }: Props) {
  const { localeTag, localizeDifficultyLabel, t } = useI18n()

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
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={t('puzzleInfo.dialog')} onClick={onClose}>
      <div className="settings-panel" onClick={event => event.stopPropagation()}>
        <h2>{t('puzzleInfo.title')}</h2>
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t('puzzleInfo.source')}</div>
            <div>{t(getSourceKey(metadata?.source))}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t('puzzleInfo.difficulty')}</div>
            <div>{localizeDifficultyLabel(metadata?.difficultyLabel) ?? t('puzzleInfo.notAvailable')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t('puzzleInfo.score')}</div>
            <div>{metadata?.score === null ? t('puzzleInfo.notAvailable') : metadata.score.toLocaleString(localeTag)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  )
}
