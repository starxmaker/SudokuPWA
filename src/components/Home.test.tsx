import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => localStorage.clear())

describe('Home', () => {
  const base = { hasSaved: false, onNew: vi.fn(), onContinue: vi.fn() }

  it('renders welcome heading and New Game button', () => {
    render(<Home {...base} />)
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(onNew).toHaveBeenCalledOnce()
  })

  it('calls onContinue when Continue clicked', async () => {
    const onContinue = vi.fn()
    render(<Home hasSaved={true} onNew={vi.fn()} onContinue={onContinue} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledOnce()
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
})
