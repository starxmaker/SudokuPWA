import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { MdContentCopy } from 'react-icons/md'
import { ImNewTab } from 'react-icons/im'
import { analyzeRequiredTechniques, type RequiredTechniques } from '../../utils/generators/hodoku'
import type { Grid } from '../../utils/sudoku'
import { encodeGridWithCandidates } from '../../utils/gameStorage'
import { writeClipboardText } from '../../utils/clipboard'

type TFunc = (key: string, params?: Record<string, string | number>) => string

export type TechniquesSidebarHandle = {
  reset: () => void
  show: () => Promise<boolean>
}

type Props = {
  internalPuzzle: Grid
  notes: number[][][]
  currentPuzzleState: string
  onTriggerHaptic?: () => void
  onCloseCandidateOverlay: () => void
  t: TFunc
}

type CacheEntry = { puzzle: string; analysis: RequiredTechniques }

const TechniquesSidebar = forwardRef<TechniquesSidebarHandle, Props>(function TechniquesSidebar(
  { internalPuzzle, notes, currentPuzzleState, onTriggerHaptic, onCloseCandidateOverlay, t }, ref
) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RequiredTechniques | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<number[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<CacheEntry | null>(null)

  const close = useCallback(() => setOpen(false), [])
  const toggleStep = useCallback((step: number) => {
    setExpandedSteps(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step])
  }, [])

  const buildPrompt = useCallback((step: RequiredTechniques['steps'][number]) => {
    return t('board.requiredTechniquesPromptTemplate', {
      puzzle: currentPuzzleState,
      technique: step.technique,
      notation: step.notation,
    })
  }, [currentPuzzleState, t])

  const copyPromptText = useCallback(async (prompt: string, shouldHaptic = true) => {
    if (shouldHaptic) onTriggerHaptic?.()
    setError(null)
    try {
      await writeClipboardText(prompt)
      return true
    } catch {
      setError(t('board.requiredTechniquesCopyFailed'))
      return false
    }
  }, [onTriggerHaptic, t])

  const copyPrompt = useCallback(async (step: RequiredTechniques['steps'][number]) => {
    const prompt = buildPrompt(step)
    const copied = await copyPromptText(prompt)
    return copied ? prompt : null
  }, [buildPrompt, copyPromptText])

  const openOnChatGpt = useCallback(async (step: RequiredTechniques['steps'][number]) => {
    onTriggerHaptic?.()
    setError(null)
    const prompt = buildPrompt(step)
    const chatGptUrl = `https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`
    try {
      window.open(chatGptUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setError(t('board.requiredTechniquesOpenChatGptFailed'))
      return
    }
    await copyPromptText(prompt, false)
  }, [buildPrompt, copyPromptText, onTriggerHaptic, t])

  const show = useCallback(async () => {
    onCloseCandidateOverlay()
    abortRef.current?.abort()
    abortRef.current = null
    const puzzleState = encodeGridWithCandidates(internalPuzzle, notes)
    const cachedAnalysis = cacheRef.current?.puzzle === puzzleState
      ? cacheRef.current.analysis
      : null

    setError(null)
    setExpandedSteps([])

    if (cachedAnalysis) {
      setLoading(false)
      if (cachedAnalysis.unsolvable) {
        setOpen(true)
        setResult(null)
        setError(t('board.requiredTechniquesUnsolvable'))
        return false
      }
      setOpen(true)
      setResult(cachedAnalysis)
      return true
    }

    const controller = new AbortController()
    abortRef.current = controller
    setOpen(true)
    setLoading(true)
    setResult(null)

    try {
      const analysis = await analyzeRequiredTechniques(internalPuzzle, notes, controller.signal)
      if (controller.signal.aborted) return false
      if (analysis === null) {
        setResult(null)
        setError(t('board.requiredTechniquesFailed'))
        return false
      }
      cacheRef.current = { puzzle: puzzleState, analysis }
      if (analysis.unsolvable) {
        setResult(null)
        setError(t('board.requiredTechniquesUnsolvable'))
        return false
      }
      setResult(analysis)
      return true
    } catch {
      if (controller.signal.aborted) return false
      setResult(null)
      setError(t('board.requiredTechniquesFailed'))
      return false
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }, [internalPuzzle, notes, onCloseCandidateOverlay, t])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setOpen(false)
    setLoading(false)
    setResult(null)
    setError(null)
    setExpandedSteps([])
  }, [])

  useImperativeHandle(ref, () => ({ reset, show }), [reset, show])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  if (!open) return null

  return createPortal(
    <>
      <div className="sidebar-backdrop open" data-testid="required-techniques-backdrop" onClick={close} aria-hidden="true" />
      <aside className="sidebar sidebar--techniques open" role="dialog" aria-label={t('board.requiredTechniquesSidebar')} aria-modal="true">
        <div className="sidebar-header sidebar-header--title">
          <h2 className="sidebar-title">{t('board.requiredTechniquesTitle')}</h2>
          <button type="button" className="sidebar-close" aria-label={t('board.closeRequiredTechniques')} onClick={close}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16"/><line x1="16" y1="2" x2="2" y2="16"/>
            </svg>
          </button>
        </div>
        <div className="board-techniques-sidebar">
          {error && <p className="creator-error board-techniques-sidebar__error" role="status">{error}</p>}
          {loading ? (
            <p className="board-techniques-sidebar__summary">{t('board.requiredTechniquesLoading')}</p>
          ) : result ? (
            <>
              <p className="board-techniques-sidebar__summary">{t('board.requiredTechniquesCount', { count: result.steps.length })}</p>
              {result.steps.length === 0 ? (
                <p className="board-techniques-sidebar__empty">{t('board.requiredTechniquesEmpty')}</p>
              ) : (
                <ol className="board-techniques-sidebar__list">
                  {result.steps.map((step, index) => {
                    const expanded = expandedSteps.includes(step.stepNumber)
                    const showCopyPrompt = expanded && index === 0
                    return (
                      <li key={`${step.stepNumber}-${step.technique}`} className="board-techniques-step">
                        <button type="button" className="board-techniques-step__button" aria-expanded={expanded} onClick={() => toggleStep(step.stepNumber)}>
                          <span className="board-techniques-step__number">{step.stepNumber}.</span>
                          <span className="board-techniques-step__technique">{step.technique}</span>
                        </button>
                        {expanded && (step.notation.length > 0 || index === 0) && (
                          <div className="board-techniques-step__details">
                            {step.notation.length > 0 && <p className="board-techniques-step__notation">{step.notation}</p>}
                            {showCopyPrompt && (
                              <div className="board-techniques-step__actions">
                                <button type="button" className="board-techniques-step__action-button" onClick={() => void copyPrompt(step)}>
                                  <MdContentCopy size={16} aria-hidden="true" /><span>{t('board.copyPrompt')}</span>
                                </button>
                                <button type="button" className="board-techniques-step__action-button board-techniques-step__action-button--open" onClick={() => void openOnChatGpt(step)}>
                                  <ImNewTab size={14} aria-hidden="true" /><span>{t('board.openOnChatGpt')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </>,
    document.body
  )
})

export default TechniquesSidebar
