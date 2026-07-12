import { useCallback, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import {
  setRequiredTechniquesLoading,
  setRequiredTechniquesResult,
  setRequiredTechniquesError,
} from '../../../store/gameSlice'
import {
  dismissPortraitTechniquesSummary,
  resetPortraitTechniquesSummary,
  setTechniquesOpen,
  setTechniquesDockedOpen,
} from '../../../store/boardUiSlice'
import type { TechniquesSidebarHandle } from '../TechniquesSidebar'
import type { RequiredTechniques } from '../../../utils/generators/hodoku'

export function useTechniques(internalPuzzle: number[][], notes: number[][][], isLandscape: boolean) {
  const dispatch = useAppDispatch()
  const techniquesOpen = useAppSelector(s => s.boardUi.techniquesOpen)
  const techniquesDockedOpen = useAppSelector(s => s.boardUi.techniquesDockedOpen)
  const portraitDismissed = useAppSelector(s => s.boardUi.portraitTechniquesSummaryDismissed)
  const requiredTechniquesLoading = useAppSelector(s => s.game.requiredTechniquesLoading)
  const requiredTechniquesResult = useAppSelector(s => s.game.requiredTechniquesResult)
  const requiredTechniquesError = useAppSelector(s => s.game.requiredTechniquesError)
  const techniquesRef = useRef<TechniquesSidebarHandle>(null)

  const showRequiredTechniques = useCallback(async () => {
    dispatch(resetPortraitTechniquesSummary())
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

  const setTechniquesOpenCb = useCallback(
    (v: boolean) => dispatch(setTechniquesOpen(v)), [dispatch])
  const setTechniquesDockedOpenCb = useCallback(
    (v: boolean) => dispatch(setTechniquesDockedOpen(v)), [dispatch])
  const setRequiredTechniquesResultCb = useCallback(
    (v: RequiredTechniques | null) => dispatch(setRequiredTechniquesResult(v)), [dispatch])
  const setRequiredTechniquesErrorCb = useCallback(
    (v: string | null) => dispatch(setRequiredTechniquesError(v)), [dispatch])

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
    setTechniquesOpen: setTechniquesOpenCb,
    setTechniquesDockedOpen: setTechniquesDockedOpenCb,
    setRequiredTechniquesResult: setRequiredTechniquesResultCb,
    setRequiredTechniquesError: setRequiredTechniquesErrorCb,
  }
}
