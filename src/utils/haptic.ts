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

/** Fire a buzz haptic for error feedback. */
export function triggerErrorHaptic(): void {
  try {
    getInstance().trigger([{ duration: 300, intensity: 1 }])
  } catch { /* ignore */ }
}
