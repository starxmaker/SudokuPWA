import React from 'react'
import { MdPlayArrow } from 'react-icons/md'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  paused: boolean
  won: boolean
  onResume: () => void
  t: TFunc
}

export default function PauseOverlay({ paused, won, onResume, t }: Props) {
  if (!paused || won) return null
  return (
    <div className="board-pause-overlay">
      <button type="button" className="board-pause-btn" aria-label={t('board.resume')} onClick={onResume}>
        <MdPlayArrow size={38} />
      </button>
    </div>
  )
}
