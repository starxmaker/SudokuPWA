import React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProvider } from '../testUtils'

const onClose = vi.fn()
const onReset = vi.fn()

function renderSettings(open = true) {
  return renderWithProvider(<Settings open={open} onClose={onClose} onReset={onReset} />, {
    preloadedState: {
      settings: {
        theme: 'light',
        autoCheck: false,
        autoRemove: false,
        haptic: false,
        pencilMode: false,
        coordinateLabels: false,
        firstColorFlag: false,
        paintingScope: 'digit',
        difficulty: null,
        brushPrefs: { activeColors: [], activeDrawingColors: [], candidateMode: false, firstColorFlagEnabled: true },
      },
    },
  })
}

describe('Settings', () => {
  it('renders nothing when closed', () => {
    renderSettings(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders all settings when open', () => {
    renderSettings()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /dark mode/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /auto-check/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /auto-remove/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /coordinate labels/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /painting scope/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /digits/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset settings/i })).toBeInTheDocument()
  })

  it('calls onClose when Close button clicked', async () => {
    const closeFn = vi.fn()
    renderWithProvider(<Settings open onClose={closeFn} onReset={onReset} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(closeFn).toHaveBeenCalledOnce()
  })

  it('calls onReset when Reset settings clicked', async () => {
    const resetFn = vi.fn()
    renderWithProvider(<Settings open onClose={onClose} onReset={resetFn} />)
    await userEvent.click(screen.getByRole('button', { name: /reset settings/i }))
    expect(resetFn).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay background clicked', async () => {
    const closeFn = vi.fn()
    const { container } = renderWithProvider(<Settings open onClose={closeFn} onReset={onReset} />)
    await userEvent.click(container.querySelector('.settings-overlay')!)
    expect(closeFn).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const closeFn = vi.fn()
    renderWithProvider(<Settings open onClose={closeFn} onReset={onReset} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeFn).toHaveBeenCalledOnce()
  })

  it('does not close when inner panel clicked', async () => {
    const closeFn = vi.fn()
    const { container } = renderWithProvider(<Settings open onClose={closeFn} onReset={onReset} />)
    await userEvent.click(container.querySelector('.settings-panel')!)
    expect(closeFn).not.toHaveBeenCalled()
  })

  it('sets theme to dark when dark mode toggled on', async () => {
    const { store } = renderSettings()
    await userEvent.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(store.getState().settings.theme).toBe('dark')
  })

  it('sets theme to light when dark mode toggled off', async () => {
    const { store } = renderWithProvider(<Settings open onClose={onClose} onReset={onReset} />, {
      preloadedState: { settings: { theme: 'dark' } as any },
    })
    await userEvent.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(store.getState().settings.theme).toBe('light')
  })

  it('sets autoCheck to true when toggled on', async () => {
    const { store } = renderSettings()
    await userEvent.click(screen.getByRole('switch', { name: /auto-check/i }))
    expect(store.getState().settings.autoCheck).toBe(true)
  })

  it('sets autoRemove to true when toggled on', async () => {
    const { store } = renderSettings()
    await userEvent.click(screen.getByRole('switch', { name: /auto-remove/i }))
    expect(store.getState().settings.autoRemove).toBe(true)
  })

  it('sets coordinateLabels to true when toggled on', async () => {
    const { store } = renderSettings()
    await userEvent.click(screen.getByRole('switch', { name: /coordinate labels/i }))
    expect(store.getState().settings.coordinateLabels).toBe(true)
  })

  it('sets paintingScope to candidate when toggled', async () => {
    const { store } = renderSettings()
    await userEvent.click(screen.getByRole('button', { name: /candidates/i }))
    expect(store.getState().settings.paintingScope).toBe('candidate')
  })

  it('renders language combobox', async () => {
    renderSettings()
    const combobox = screen.getByRole('combobox', { name: /language/i })
    expect(combobox).toBeInTheDocument()
    expect((combobox as HTMLSelectElement).value).toBe('system')
  })

  it('does not register Escape listener when closed', () => {
    const closeFn = vi.fn()
    renderWithProvider(<Settings open={false} onClose={closeFn} onReset={onReset} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeFn).not.toHaveBeenCalled()
  })
})
