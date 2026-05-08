function preventGestureZoom(event: Event) {
  event.preventDefault()
}

function preventPinchZoom(event: Event) {
  const touchEvent = event as TouchEvent
  if (touchEvent.touches.length > 1) {
    event.preventDefault()
  }
}

export function installZoomGuards(doc: Document = document) {
  doc.addEventListener('touchmove', preventPinchZoom as EventListener, { passive: false })
  doc.addEventListener('gesturestart', preventGestureZoom as EventListener, { passive: false })
  doc.addEventListener('gesturechange', preventGestureZoom as EventListener, { passive: false })
  doc.addEventListener('gestureend', preventGestureZoom as EventListener, { passive: false })
}
