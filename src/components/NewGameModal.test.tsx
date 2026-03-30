import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewGameModal from './NewGameModal'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => localStorage.clear())

describe('NewGameModal', () => {
  it('renders nothing when closed', () => {
    render(<NewGameModal open={false} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders all four difficulty buttons when open', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /medium/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expert/i })).toBeInTheDocument()
  })

  it('medium is selected by default', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /medium/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('changes selected difficulty on click', async () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /hard/i }))
    expect(screen.getByRole('button', { name: /hard/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /medium/i }).getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onClose directly when Cancel clicked while not generating', async () => {
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onStart with selected difficulty and closes on success', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /easy/i }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('easy', expect.any(AbortSignal)))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('persists last difficulty to localStorage on start', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: /expert/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(localStorage.getItem('lastDifficulty')).toBe('expert'))
  })

  it('shows generating state after Start clicked', async () => {
    const onStart = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument()
    )
  })

  it('stops spinner immediately when Cancel clicked during generation', async () => {
    const onStart = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /generating/i })).toBeNull()
    )
  })

  it('loads last difficulty from localStorage', () => {
    localStorage.setItem('lastDifficulty', 'expert')
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /expert/i }).getAttribute('aria-pressed')).toBe('true')
  })
})
