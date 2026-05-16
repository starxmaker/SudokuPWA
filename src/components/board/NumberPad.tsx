import React from 'react'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  remaining: Record<number, number>
  notesMode: boolean
  paused: boolean
  won: boolean
  candidateSelectedDigit: number | null
  applyDigit: (d: number) => boolean
  toggleReferenceDigitHighlight: (d: number) => void
  haptic: boolean
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
  touchFiredRef: React.MutableRefObject<string | null>
  tabIndex?: number
  interactionDisabled?: boolean
  t: TFunc
}

export default function NumberPad({
  remaining, notesMode, paused, won, candidateSelectedDigit,
  applyDigit, toggleReferenceDigitHighlight,
  haptic, onTriggerHaptic, onTriggerErrorHaptic,
  touchFiredRef, tabIndex, interactionDisabled = false, t,
}: Props) {
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
        <button
          key={d}
          type="button"
          className={`num-key${remaining[d] === 0 ? ' num-key--done' : ''}${notesMode ? ' num-key--notes' : ''}${interactionDisabled ? ' num-key--reference' : ''}`}
          disabled={paused || won || (!interactionDisabled && remaining[d] === 0)}
          aria-pressed={interactionDisabled ? candidateSelectedDigit === d : undefined}
          onPointerDown={(e) => {
            if (interactionDisabled) return
            if (e.pointerType === 'touch') {
              const shouldHandleHapticOnPointerUp = remaining[d] === 1
              if (shouldHandleHapticOnPointerUp && typeof e.currentTarget.setPointerCapture === 'function') {
                e.currentTarget.setPointerCapture(e.pointerId)
              }
              const isError = applyDigit(d)
              touchFiredRef.current = shouldHandleHapticOnPointerUp
                ? (isError ? 'pending-error' : 'pending-ok')
                : (isError ? 'error' : 'ok')
            }
          }}
          onPointerUp={(e) => {
            if (interactionDisabled || e.pointerType !== 'touch') return
            const result = touchFiredRef.current
            if (result !== 'pending-ok' && result !== 'pending-error') return
            touchFiredRef.current = result === 'pending-error' ? 'handled-error' : 'handled-ok'
            if (haptic) {
              if (result === 'pending-error') onTriggerErrorHaptic?.()
              else onTriggerHaptic?.()
            }
            if (typeof e.currentTarget.hasPointerCapture === 'function' && e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
            window.setTimeout(() => {
              if (touchFiredRef.current === 'handled-ok' || touchFiredRef.current === 'handled-error') {
                touchFiredRef.current = null
              }
            }, 0)
          }}
          onClick={() => {
            if (interactionDisabled) {
              toggleReferenceDigitHighlight(d)
              if (haptic) onTriggerHaptic?.()
              return
            }
            if (touchFiredRef.current !== null) {
              const result = touchFiredRef.current
              touchFiredRef.current = null
              if (haptic && (result === 'ok' || result === 'error')) {
                if (result === 'error') onTriggerErrorHaptic?.()
                else onTriggerHaptic?.()
              }
              return
            }
            const isError = applyDigit(d)
            if (haptic) {
              if (isError) onTriggerErrorHaptic?.()
              else onTriggerHaptic?.()
            }
          }}
          aria-label={t('board.remainingDigits', { digit: d, count: remaining[d] })}
          data-digit={d}
          tabIndex={tabIndex}
        >
          <span className="num-key__digit">{remaining[d] === 0 ? '\u00a0' : d}</span>
          <span className="num-key__remaining">{remaining[d] > 0 ? remaining[d] : '\u00a0'}</span>
        </button>
      ))}
    </>
  )
}
