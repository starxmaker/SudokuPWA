import { useCallback, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import {
  setRequiredTechniquesLoading,
  setRequiredTechniquesResult,
  setRequiredTechniquesError,
} from '../../../store/gameSlice'
import {
  dismissPortraitTechniquesSummary,
  setTechniquesOpen,
  setTechniquesDockedOpen,
} from '../../../store/boardUiSlice'
import type { TechniquesSidebarHandle } from '../TechniquesSidebar'
import type { RequiredTechniques } from '../../../utils/generators/hodoku'

export function useTechniques(internalPuzzle: number[][], notes: number[][][]) {
  const dispatch = useAppDispatch()
  const isLandscape = useAppSelector(s => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(orientation: landscape)').matches
  })
  const techniquesOpen = useAppSelector(s => s.boardUi.techniquesOpen)
  const techniquesDockedOpen = useAppSelector(s => s.boardUi.techniquesDockedOpen)
  const portraitDismissed = useAppSelector(s => s.boardUi.portraitTechniquesSummaryDismissed)
  const requiredTechniquesLoading = useAppSelector(s => s.game.requiredTechniquesLoading)
  const requiredTechniquesResult = useAppSelector(s => s.game.requiredTechniquesResult)
  const requiredTechniquesError = useAppSelector(s => s.game.requiredTechniquesError)
  const techniquesRef = useRef<TechniquesSidebarHandle>(null)

  const showRequiredTechniques = useCallback(async () => {
    dispatch(dismissPortraitTechniquesSummary())
    dispatch(setRequiredTechniquesLoading(true))
    try {
      if (typeof window !== 'undefined') {
        await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
      }
      return await (techniquesRef.current?.show({ openSidebar: isLandscape }) ?? Promise.resolve(false))
    } finally {
      dispatch(setRequiredTechniquesLoading(false))
    }
  }, [dispatch, isLandscape])

  const openRequiredTechniquesSidebar = useCallback(() => {
    techniquesRef.current?.open()
  }, [])

  const hideRequiredTechniquesSummary = useCallback(() => {
    dispatch(dismissPortraitTechniquesSummary())
  }, [dispatch])

  const requiredTechniquesSummary =
    !isLandscape &&
    !techniquesOpen &&
    !portraitDismissed &&
    requiredTechniquesError === null &&
    requiredTechniquesResult !== null &&
    requiredTechniquesResult.steps.length > 0
      ? {
          technique: requiredTechniquesResult.steps[0].technique,
          notation: requiredTechniquesResult.steps[0].notation,
        }
      : null

  return {
    techniquesRef,
    showRequiredTechniques,
    openRequiredTechniquesSidebar,
    hideRequiredTechniquesSummary,
    requiredTechniquesLoading,
    requiredTechniquesResult,
    requiredTechniquesError,
    requiredTechniquesSummary,
    techniquesOpen,
    techniquesDockedOpen,
    setTechniquesOpen: (v: boolean) => dispatch(setTechniquesOpen(v)),
    setTechniquesDockedOpen: (v: boolean) => dispatch(setTechniquesDockedOpen(v)),
    setRequiredTechniquesResult: (v: RequiredTechniques | null) => dispatch(setRequiredTechniquesResult(v)),
    setRequiredTechniquesError: (v: string | null) => dispatch(setRequiredTechniquesError(v)),
  }
}
