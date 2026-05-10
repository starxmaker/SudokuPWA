import React, { useState } from 'react'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  won: boolean
  finalTime: number
  formatTime: (s: number) => string
  onRetry: () => void
  onShare?: () => void
  onNew?: () => void
  onNewGame: () => Promise<void>
  t: TFunc
}

export default function VictoryOverlay({ won, finalTime, formatTime, onRetry, onShare, onNew, onNewGame, t }: Props) {
  const [shareCopied, setShareCopied] = useState(false)

  if (!won) return null

  return (
    <div className="victory-overlay">
      <div className="victory-card">
        <div className="victory-icon" aria-hidden>🎉</div>
        <h2 className="victory-title">{t('board.puzzleComplete')}</h2>
        <p className="victory-time">{formatTime(finalTime)}</p>
        <div className="victory-actions">
          <button type="button" onClick={onRetry}>{t('board.retry')}</button>
          {onShare && <button type="button" className={shareCopied ? 'copied' : ''} onClick={() => {
            onShare()
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 2200)
          }}>{shareCopied ? t('board.urlCopied') : t('topBar.share')}</button>}
          <button type="button" onClick={onNew ?? (() => onNewGame())}>{t('home.newGame')}</button>
        </div>
      </div>
    </div>
  )
}
