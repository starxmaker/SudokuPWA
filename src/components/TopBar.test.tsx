import React from 'react'
import { render, screen } from '@testing-library/react'
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

  it('calls onOpenSettings when settings button clicked', async () => {
    const onOpenSettings = vi.fn()
    render(<TopBar onOpenSettings={onOpenSettings} />)
    await userEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('hides share button when onShare not provided', () => {
    render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull()
  })

  it('shows share button and calls onShare when provided', async () => {
    const onShare = vi.fn()
    render(<TopBar onOpenSettings={vi.fn()} onShare={onShare} />)
    await userEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(onShare).toHaveBeenCalledOnce()
  })
})
