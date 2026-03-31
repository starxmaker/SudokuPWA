import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopBar from './TopBar'
import { describe, it, expect, vi } from 'vitest'

describe('TopBar', () => {
  it('renders default title', () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /sudoku pwa/i })).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<TopBar onOpenSettings={vi.fn()} title="My Puzzle" />)
    expect(screen.getByRole('heading', { name: /my puzzle/i })).toBeInTheDocument()
  })

  it('hides back button when showBack is false', () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })

  it('shows back button when showBack is true', () => {
    render(<TopBar onOpenSettings={vi.fn()} showBack />)
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls onBack when back button clicked', async () => {
    const onBack = vi.fn()
    render(<TopBar onOpenSettings={vi.fn()} showBack onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('renders a hamburger menu button', () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('menu is closed by default — settings item not visible', () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.queryByRole('menuitem', { name: /settings/i })).toBeNull()
  })

  it('opens the menu on hamburger click', async () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
  })

  it('calls onOpenSettings when Settings menu item clicked', async () => {
    const onOpenSettings = vi.fn()
    render(<TopBar onOpenSettings={onOpenSettings} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /settings/i }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('closes the menu after settings clicked', async () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /settings/i }))
    expect(screen.queryByRole('menuitem', { name: /settings/i })).toBeNull()
  })

  it('does not show share item when onShare not provided', async () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.queryByRole('menuitem', { name: /share/i })).toBeNull()
  })

  it('shows share item and calls onShare when provided', async () => {
    const onShare = vi.fn()
    render(<TopBar onOpenSettings={vi.fn()} onShare={onShare} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /share/i }))
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('closes menu on Escape key', async () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: /settings/i })).toBeNull()
  })

  it('closes menu on outside click (backdrop)', async () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sidebar-backdrop'))
    expect(screen.queryByRole('menuitem', { name: /settings/i })).toBeNull()
  })
})

