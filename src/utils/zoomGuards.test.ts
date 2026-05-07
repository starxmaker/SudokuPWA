import { describe, expect, it } from 'vitest'
import { installZoomGuards } from './zoomGuards'

function createTouchEvent(type: string, touchesCount: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: Array.from({ length: touchesCount }, () => ({})),
  })
  return event
}

describe('installZoomGuards', () => {
  it('prevents pinch touchmove gestures', () => {
    const doc = document.implementation.createHTMLDocument('zoom-guards')
    installZoomGuards(doc)

    const event = createTouchEvent('touchmove', 2)
    doc.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('allows single-touch moves', () => {
    const doc = document.implementation.createHTMLDocument('zoom-guards')
    installZoomGuards(doc)

    const event = createTouchEvent('touchmove', 1)
    doc.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('prevents iOS gesture events', () => {
    const doc = document.implementation.createHTMLDocument('zoom-guards')
    installZoomGuards(doc)

    const event = new Event('gesturestart', { bubbles: true, cancelable: true })
    doc.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
