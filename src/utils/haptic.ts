let _lastVibrate = 0

/** Fire a short selection haptic via the native Vibration API.
 *  Throttled to at most once per 50ms to avoid overwhelming the motor thread on Android.
 *  Silently no-ops on browsers that don't implement navigator.vibrate (e.g. iOS Safari). */
export function triggerHaptic(): void {
  const now = Date.now()
  if (now - _lastVibrate < 50) return
  _lastVibrate = now
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(25)
    }
  } catch { /* ignore */ }
}

/** Fire a buzz haptic for error feedback via the native Vibration API.
 *  Throttled to at most once per 50ms to avoid overwhelming the motor thread on Android.
 *  Silently no-ops on browsers that don't implement navigator.vibrate (e.g. iOS Safari). */
export function triggerErrorHaptic(): void {
  const now = Date.now()
  if (now - _lastVibrate < 50) return
  _lastVibrate = now
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([50, 30, 50, 30, 50])
    }
  } catch { /* ignore */ }
}
