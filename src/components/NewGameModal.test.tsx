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

  it('renders hodoku difficulty buttons', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^very easy$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^easy$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^medium$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^hard$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^very hard$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^expert$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^nightmare$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^diabolical$/i })).toBeInTheDocument()
  })

  it('does not render a generator selector', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.queryByRole('combobox', { name: /generator/i })).toBeNull()
  })

  it('medium is selected by default', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^medium$/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('changes selected difficulty on click', async () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^hard$/i }))
    expect(screen.getByRole('button', { name: /^hard$/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^medium$/i }).getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onClose directly when Cancel clicked while not generating', async () => {
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onStart with selected difficulty, generator id, and signal, then closes', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^hard$/i }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('hodoku', 'HARD', expect.any(AbortSignal)))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('persists last difficulty to localStorage on start', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: /^diabolical$/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(localStorage.getItem('lastDifficulty:hodoku')).toBe('DIABOLICAL'))
  })

  it('loads last difficulty from localStorage', () => {
    localStorage.setItem('lastDifficulty:hodoku', 'VERY_HARD')
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^very hard$/i }).getAttribute('aria-pressed')).toBe('true')
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
})
