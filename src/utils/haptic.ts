import { WebHaptics } from 'web-haptics'

// Single shared instance — persists in DOM between calls.
let _instance: WebHaptics | null = null

function getInstance(): WebHaptics {
  if (!_instance) _instance = new WebHaptics()
  return _instance
}

/** Pre-create the haptic DOM elements on app mount so they're ready before the first tap. */
export function initHaptic(): void {
  getInstance()
}

/** Fire a short selection haptic. Works via navigator.vibrate on Android,
 *  and via the WebKit <input switch> trick on iOS 18+. */
export function triggerHaptic(): void {
  try {
    getInstance().trigger(25)
  } catch { /* ignore */ }
}

/** Fire a buzz haptic for error feedback.
 *  On Android: navigator.vibrate triple-burst pattern.
 *  On iOS: trigger a 300ms pattern — fires one synchronous click + RAF clicks every ~16ms
 *  for the duration of the pattern, producing a distinctive sustained buzz. */
export function triggerErrorHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([50, 30, 50, 30, 50])
      return
    }
    getInstance().trigger([{ duration: 300, intensity: 1 }])
  } catch { /* ignore */ }
}
