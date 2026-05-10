import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useStore } from 'react-redux'
import type { RootState } from '../../store'
import {
  setRequiredTechniquesOpen,
  setRequiredTechniquesLoading,
  setRequiredTechniquesResult,
  setRequiredTechniquesError,
  setExpandedTechniqueSteps,
} from '../../store/gameSlice'
import { analyzeRequiredTechniques, type RequiredTechniques } from '../../utils/generators/hodoku'
import { encodeGrid } from '../../utils/gameStorage'

type RequiredTechniquesCacheEntry = {
  puzzle: string
  analysis: RequiredTechniques
}

export function useRequiredTechniques() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()

  const open = useAppSelector(s => s.game.requiredTechniquesOpen)
  const loading = useAppSelector(s => s.game.requiredTechniquesLoading)
  const result = useAppSelector(s => s.game.requiredTechniquesResult)
  const error = useAppSelector(s => s.game.requiredTechniquesError)
  const expandedSteps = useAppSelector(s => s.game.expandedTechniqueSteps)

  const abortRef = { current: null as AbortController | null }
  const cacheRef = { current: null as RequiredTechniquesCacheEntry | null }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dispatch(setRequiredTechniquesOpen(false))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, dispatch])

  function close() {
    dispatch(setRequiredTechniquesOpen(false))
  }

  function reset() {
    abortRef.current?.abort()
    dispatch(setRequiredTechniquesLoading(false))
    dispatch(setRequiredTechniquesResult(null))
    dispatch(setRequiredTechniquesError(null))
  }

  function toggleStep(step: number) {
    dispatch(setExpandedTechniqueSteps(
      expandedSteps.includes(step)
        ? expandedSteps.filter(s => s !== step)
        : [...expandedSteps, step]
    ))
  }

  async function showRequiredTechniques() {
    const current = store.getState().game.current
    if (!current || current.length !== 9) return
    const puzzleKey = encodeGrid(current)

    if (cacheRef.current?.puzzle === puzzleKey) {
      dispatch(setRequiredTechniquesResult(cacheRef.current.analysis))
      dispatch(setRequiredTechniquesOpen(true))
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch(setRequiredTechniquesLoading(true))
    dispatch(setRequiredTechniquesOpen(true))
    dispatch(setRequiredTechniquesResult(null))
    dispatch(setRequiredTechniquesError(null))

    try {
      const analysis = await analyzeRequiredTechniques(current, controller.signal)
      if (controller.signal.aborted) return
      cacheRef.current = { puzzle: puzzleKey, analysis }
      dispatch(setRequiredTechniquesResult(analysis))
    } catch (err) {
      if (controller.signal.aborted) return
      const msg = err instanceof Error ? err.message : String(err)
      dispatch(setRequiredTechniquesError(msg || 'Failed to analyze required techniques'))
    } finally {
      if (!controller.signal.aborted) {
        dispatch(setRequiredTechniquesLoading(false))
      }
    }
  }

  function buildTechniquePrompt(technique: { name: string; notation: string }): string {
    return `${technique.name}: ${technique.notation}`
  }

  return {
    open,
    loading,
    result,
    error,
    expandedSteps,
    close,
    reset,
    toggleStep,
    showRequiredTechniques,
    buildTechniquePrompt,
  }
}
