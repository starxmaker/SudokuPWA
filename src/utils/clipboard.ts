export async function readClipboardText(): Promise<string | null> {
  const readText = navigator.clipboard?.readText
  if (typeof readText !== 'function') return null
  return await readText.call(navigator.clipboard)
}

function prefersLegacyClipboardWrite(): boolean {
  const platform = navigator.platform ?? ''
  const userAgent = navigator.userAgent ?? ''
  const maxTouchPoints = navigator.maxTouchPoints ?? 0

  return /iPad|iPhone|iPod/.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1)
}

function createLegacyClipboardNode(text: string): HTMLDivElement | HTMLTextAreaElement {
  if (prefersLegacyClipboardWrite()) {
    const container = document.createElement('div')
    container.textContent = text
    container.contentEditable = 'true'
    container.tabIndex = -1
    container.setAttribute('aria-hidden', 'true')
    container.style.whiteSpace = 'pre-wrap'
    container.style.webkitUserSelect = 'text'
    return container
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.readOnly = true
  textArea.setAttribute('aria-hidden', 'true')
  return textArea
}

function legacyWriteClipboardText(text: string): boolean {
  if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') {
    return false
  }

  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  const selection = typeof window !== 'undefined' ? window.getSelection() : null
  const savedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : []
  const clipboardNode = createLegacyClipboardNode(text)
  clipboardNode.style.position = 'fixed'
  clipboardNode.style.top = '0'
  clipboardNode.style.left = '-9999px'
  clipboardNode.style.opacity = '0'
  clipboardNode.style.pointerEvents = 'none'
  clipboardNode.style.fontSize = '16px'

  document.body.append(clipboardNode)

  if (clipboardNode instanceof HTMLTextAreaElement) {
    clipboardNode.focus()
    clipboardNode.select()
    clipboardNode.setSelectionRange(0, text.length)
  } else {
    clipboardNode.focus()
    const range = document.createRange()
    range.selectNodeContents(clipboardNode)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    clipboardNode.remove()

    if (selection) {
      selection.removeAllRanges()
      for (const range of savedRanges) {
        selection.addRange(range)
      }
    }

    activeElement?.focus()
  }
}

export async function writeClipboardText(text: string): Promise<void> {
  const writeText = navigator.clipboard?.writeText

  if (prefersLegacyClipboardWrite() && legacyWriteClipboardText(text)) {
    return
  }

  if (typeof writeText === 'function') {
    try {
      await writeText.call(navigator.clipboard, text)
      return
    } catch {
      if (legacyWriteClipboardText(text)) {
        return
      }
      throw new Error('Clipboard write is unavailable')
    }
  }

  if (legacyWriteClipboardText(text)) {
    return
  }

  throw new Error('Clipboard write is unavailable')
}
