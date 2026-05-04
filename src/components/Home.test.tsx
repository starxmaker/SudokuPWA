import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let standaloneMode = false

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function dispatchBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt') as Event & {
    preventDefault: ReturnType<typeof vi.fn>
    stopPropagation: ReturnType<typeof vi.fn>
    stopImmediatePropagation: ReturnType<typeof vi.fn>
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    platforms: string[]
  }
  Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
  Object.defineProperty(event, 'stopPropagation', { value: vi.fn() })
  Object.defineProperty(event, 'stopImmediatePropagation', { value: vi.fn() })
  Object.defineProperty(event, 'prompt', { value: vi.fn().mockResolvedValue(undefined) })
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  })
  Object.defineProperty(event, 'platforms', { value: ['web'] })
  window.dispatchEvent(event)
  return event
}

beforeEach(() => {
  localStorage.clear()
  standaloneMode = false
  mockMatchMedia(standaloneMode)
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: 0,
  })
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: false,
  })
})

describe('Home', () => {
  const base = { hasSaved: false, onNew: vi.fn(), onContinue: vi.fn(), onCreated: vi.fn(), hasAvailablePuzzle: true }

  it('renders welcome heading and New Game button', () => {
    render(<Home {...base} />)
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^new game$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new game/i })).toBeInTheDocument()
  })

  it('does not show Continue button when no saved game', () => {
    render(<Home {...base} />)
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull()
  })

  it('shows Continue button when hasSaved is true', () => {
    render(<Home {...base} hasSaved={true} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows no-saved-game hint when no saved and no error', () => {
    render(<Home {...base} />)
    expect(screen.getByText(/no saved game found/i)).toBeInTheDocument()
  })

  it('shows error and hides no-saved hint when error provided', () => {
    render(<Home {...base} error="Bad link." />)
    expect(screen.getByText('Bad link.')).toBeInTheDocument()
    expect(screen.queryByText(/no saved game found/i)).toBeNull()
  })

  it('hides no-saved hint when saved game exists', () => {
    render(<Home {...base} hasSaved={true} />)
    expect(screen.queryByText(/no saved game found/i)).toBeNull()
  })

  it('calls onNew when New Game clicked', async () => {
    const onNew = vi.fn()
    render(<Home {...base} onNew={onNew} />)
    await userEvent.click(screen.getByRole('button', { name: /^new game$/i }))
    expect(onNew).toHaveBeenCalledOnce()
  })

  it('calls onContinue when Continue clicked', async () => {
    const onContinue = vi.fn()
    render(<Home hasSaved={true} onNew={vi.fn()} onContinue={onContinue} onCreated={vi.fn()} hasAvailablePuzzle={true} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('disables New Game while no queued puzzle is ready', () => {
    render(<Home {...base} hasAvailablePuzzle={false} />)
    const button = screen.getByRole('button', { name: /loading/i })
    expect(button).toBeDisabled()
  })

  it('calls onCreated when Create new game clicked', async () => {
    const onCreated = vi.fn()
    render(<Home {...base} onCreated={onCreated} />)
    await userEvent.click(screen.getByRole('button', { name: /create new game/i }))
    expect(onCreated).toHaveBeenCalledOnce()
  })

  it('renders version string', () => {
    render(<Home {...base} />)
    expect(screen.getByText(/^v\d/)).toBeInTheDocument()
  })

  it('renders GitHub link with correct href', () => {
    render(<Home {...base} />)
    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('https://github.com/starxmaker/SudokuPWA/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('GitHub link appears above the version string', () => {
    render(<Home {...base} />)
    const link = screen.getByRole('link', { name: /view on github/i })
    const version = screen.getByText(/^v\d/)
    // compareDocumentPosition: DOCUMENT_POSITION_FOLLOWING = 4 means link comes before version
    expect(link.compareDocumentPosition(version) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows install link outside standalone mode', async () => {
    render(<Home {...base} />)
    expect(await screen.findByRole('link', { name: /install app/i })).toBeInTheDocument()
  })

  it('hides install link when running as installed pwa', async () => {
    standaloneMode = true
    mockMatchMedia(standaloneMode)

    render(<Home {...base} />)

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /install app/i })).toBeNull()
    })
  })

  it('triggers the install modal when install link is clicked', async () => {
    render(<Home {...base} />)
    dispatchBeforeInstallPrompt()

    const installElement = screen.getByTestId('pwa-install-element') as HTMLElement & {
      install?: ReturnType<typeof vi.fn>
      showDialog?: ReturnType<typeof vi.fn>
    }
    installElement.install = vi.fn()
    installElement.showDialog = vi.fn()

    await userEvent.click(await screen.findByRole('link', { name: /install app/i }))

    expect(installElement.showDialog).toHaveBeenCalledWith(true)
    expect(installElement.install).not.toHaveBeenCalled()
  })

  it('uses apple instruction path on iphone-like browsers', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    })

    render(<Home {...base} />)

    const installElement = screen.getByTestId('pwa-install-element') as HTMLElement & {
      install?: ReturnType<typeof vi.fn>
      showDialog?: ReturnType<typeof vi.fn>
      isAppleMobilePlatform?: boolean
      isInstallAvailable?: boolean
    }
    installElement.install = vi.fn()
    installElement.showDialog = vi.fn()

    await userEvent.click(await screen.findByRole('link', { name: /install app/i }))

    expect(installElement.isAppleMobilePlatform).toBe(true)
    expect(installElement.isInstallAvailable).toBe(true)
    expect(installElement.showDialog).toHaveBeenCalledWith(true)
    expect(installElement.install).toHaveBeenCalledOnce()
  })
})
