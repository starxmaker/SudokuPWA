import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeClipboardText } from './clipboard'

const originalClipboard = navigator.clipboard
const originalUserAgent = navigator.userAgent
const originalPlatform = navigator.platform
const originalMaxTouchPoints = navigator.maxTouchPoints
const originalExecCommand = document.execCommand

function mockNavigator({
  clipboard,
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  platform = 'Win32',
  maxTouchPoints = 0,
}: {
  clipboard: Clipboard | undefined
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
}) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  })
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  })
}

describe('writeClipboardText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: originalPlatform,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints,
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: originalExecCommand,
    })
  })

  it('uses the async clipboard API on non-iOS browsers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const execCommand = vi.fn().mockReturnValue(true)

    mockNavigator({
      clipboard: { writeText } as Clipboard,
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await writeClipboardText('example prompt')

    expect(writeText).toHaveBeenCalledWith('example prompt')
    expect(execCommand).not.toHaveBeenCalled()
  })

  it('falls back to execCommand when the async clipboard API is unavailable', async () => {
    const execCommand = vi.fn().mockReturnValue(true)

    mockNavigator({
      clipboard: undefined,
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await writeClipboardText('example prompt')

    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('prefers the legacy copy path on iOS browsers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    let clipboardNode: Element | null = null
    const execCommand = vi.fn().mockImplementation(() => {
      clipboardNode = document.body.lastElementChild
      return true
    })

    mockNavigator({
      clipboard: { writeText } as Clipboard,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await writeClipboardText('example prompt')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(writeText).not.toHaveBeenCalled()
    expect(clipboardNode).toBeInstanceOf(HTMLDivElement)
    expect(clipboardNode).toHaveProperty('contentEditable', 'true')
    expect(clipboardNode).toHaveTextContent('example prompt')
  })
})
