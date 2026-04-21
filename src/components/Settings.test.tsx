import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'
import { describe, it, expect, vi } from 'vitest'

const base = {
  open: true,
  onClose: vi.fn(),
  theme: 'light' as const,
  setTheme: vi.fn(),
  autoCheck: false,
  setAutoCheck: vi.fn(),
  autoRemove: false,
  setAutoRemove: vi.fn(),
  haptic: false,
  setHaptic: vi.fn(),
  pencilMode: false,
  setPencilMode: vi.fn(),
  coordinateLabels: false,
  setCoordinateLabels: vi.fn(),
  paintingScope: 'digit' as const,
  setPaintingScope: vi.fn(),
  firstColorFlag: false,
  setFirstColorFlag: vi.fn(),
}

describe('Settings', () => {
  it('renders nothing when closed', () => {
    render(<Settings {...base} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders all settings when open', () => {
    render(<Settings {...base} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /dark mode/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /auto-check/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /auto-remove/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /coordinate labels/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /painting scope/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /digits/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /candidates/i })).toBeInTheDocument()
  })

  it('calls onClose when Close button clicked', async () => {
    const onClose = vi.fn()
    render(<Settings {...base} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay background clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<Settings {...base} onClose={onClose} />)
    await userEvent.click(container.querySelector('.settings-overlay')!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<Settings {...base} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when inner panel clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<Settings {...base} onClose={onClose} />)
    await userEvent.click(container.querySelector('.settings-panel')!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls setTheme("dark") when dark mode toggled on', async () => {
    const setTheme = vi.fn()
    render(<Settings {...base} theme="light" setTheme={setTheme} />)
    await userEvent.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme("light") when dark mode toggled off', async () => {
    const setTheme = vi.fn()
    render(<Settings {...base} theme="dark" setTheme={setTheme} />)
    await userEvent.click(screen.getByRole('switch', { name: /dark mode/i }))
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('calls setAutoCheck(true) when auto-check toggled on', async () => {
    const setAutoCheck = vi.fn()
    render(<Settings {...base} autoCheck={false} setAutoCheck={setAutoCheck} />)
    await userEvent.click(screen.getByRole('switch', { name: /auto-check/i }))
    expect(setAutoCheck).toHaveBeenCalledWith(true)
  })

  it('calls setAutoRemove(true) when auto-remove toggled on', async () => {
    const setAutoRemove = vi.fn()
    render(<Settings {...base} autoRemove={false} setAutoRemove={setAutoRemove} />)
    await userEvent.click(screen.getByRole('switch', { name: /auto-remove/i }))
    expect(setAutoRemove).toHaveBeenCalledWith(true)
  })

  it('calls setCoordinateLabels(true) when coordinate labels toggled on', async () => {
    const setCoordinateLabels = vi.fn()
    render(<Settings {...base} coordinateLabels={false} setCoordinateLabels={setCoordinateLabels} />)
    await userEvent.click(screen.getByRole('switch', { name: /coordinate labels/i }))
    expect(setCoordinateLabels).toHaveBeenCalledWith(true)
  })

  it('calls setPaintingScope("candidate") when painting scope toggled on', async () => {
    const setPaintingScope = vi.fn()
    render(<Settings {...base} paintingScope="digit" setPaintingScope={setPaintingScope} />)
    await userEvent.click(screen.getByRole('button', { name: /candidates/i }))
    expect(setPaintingScope).toHaveBeenCalledWith('candidate')
  })

  it('does not register Escape listener when closed', () => {
    const onClose = vi.fn()
    render(<Settings {...base} open={false} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
