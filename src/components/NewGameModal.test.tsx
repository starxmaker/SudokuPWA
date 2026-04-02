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

  it('renders qqwing difficulty buttons by default', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simple/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^easy$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /intermediate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expert/i })).toBeInTheDocument()
  })

  it('easy is selected by default for qqwing generator', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^easy$/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('changes selected difficulty on click', async () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /intermediate/i }))
    expect(screen.getByRole('button', { name: /intermediate/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^easy$/i }).getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onClose directly when Cancel clicked while not generating', async () => {
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onStart with selected difficulty, generator, and signal, then closes', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^easy$/i }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('qqwing', 'easy', expect.any(AbortSignal)))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('persists last difficulty to localStorage on start', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: /expert/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(localStorage.getItem('lastDifficulty:qqwing')).toBe('expert'))
  })

  it('renders a generator select with at least two options', () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: /generator/i })
    expect(select).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThanOrEqual(2)
  })

  it('persists generator selection to localStorage on start', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={onStart} />)
    const user = userEvent.setup()
    const select = screen.getByRole('combobox', { name: /generator/i })
    await user.selectOptions(select, 'starxmaker')
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(localStorage.getItem('lastGenerator')).toBe('starxmaker'))
  })

  it('restores last generator from localStorage', () => {
    localStorage.setItem('lastGenerator', 'starxmaker')
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: /generator/i }) as HTMLSelectElement
    expect(select.value).toBe('starxmaker')
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
    localStorage.setItem('lastDifficulty:qqwing', 'expert')
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /expert/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('shows starxmaker difficulties when generator is switched', async () => {
    render(<NewGameModal open={true} onClose={vi.fn()} onStart={vi.fn()} />)
    const user = userEvent.setup()
    const select = screen.getByRole('combobox', { name: /generator/i })
    await user.selectOptions(select, 'starxmaker')
    expect(screen.getByRole('button', { name: /medium/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /very hard/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /simple/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /intermediate/i })).toBeNull()
  })
})
