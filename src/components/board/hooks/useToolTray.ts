import { useCallback, useRef, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import {
  setNotesMode,
  setEraserMode,
  setBrushMode,
  setCandidateToolMode,
  setHistoryToolMode,
  setMoreToolMode,
  setCandidateSelectedDigit,
} from '../../../store/gameSlice'
import {
  closeCandidateOverlay,
  setToolTrayTransition,
  setToolTraySequence,
  setVisibleToolTray,
  setLowerPadTransition,
  setVisibleLowerPad,
  setEraserColorPickerMode,
} from '../../../store/boardUiSlice'
import { TOOL_TRAY_ANIMATION_MS } from '../boardUtils'
import type { LowerPadView, ToolTrayView } from '../boardUtils'

export function useToolTray() {
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)
  const boardUi = useAppSelector(s => s.boardUi)
  const lowerPadTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const toolTrayTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const toolTrayRafRef = useRef<number | null>(null)

  const closeOverlay = useCallback((preserveSelectedDigit = false) => {
    dispatch(closeCandidateOverlay({ preserveSelectedDigit }))
    if (!preserveSelectedDigit) {
      dispatch(setCandidateSelectedDigit(null))
    }
  }, [dispatch])

  const switchLowerPad = useCallback((next: LowerPadView, direction: 'forward' | 'backward') => {
    if (boardUi.visibleLowerPad === next) return
    if (lowerPadTimerRef.current !== null) {
      window.clearTimeout(lowerPadTimerRef.current)
    }
    dispatch(setLowerPadTransition({
      from: boardUi.visibleLowerPad,
      to: next,
      direction,
    }))
    dispatch(setVisibleLowerPad(next))
    lowerPadTimerRef.current = window.setTimeout(() => {
      dispatch(setLowerPadTransition(null))
      lowerPadTimerRef.current = null
    }, TOOL_TRAY_ANIMATION_MS)
  }, [dispatch, boardUi.visibleLowerPad])

  const toggleNotesTools = useCallback(() => {
    const next = !game.notesMode
    closeOverlay()
    dispatch(setNotesMode(next))
    dispatch(setEraserMode(false))
    dispatch(setEraserColorPickerMode(false))
    dispatch(setCandidateToolMode(false))
    dispatch(setHistoryToolMode(false))
    dispatch(setMoreToolMode(false))
    if (next) {
      dispatch(setBrushMode(false))
      switchLowerPad('numbers', 'backward')
    }
  }, [dispatch, game.notesMode, closeOverlay, switchLowerPad])

  const toggleBrushTools = useCallback(() => {
    const next = !game.brushMode
    dispatch(setBrushMode(next))
    dispatch(setEraserMode(false))
    dispatch(setEraserColorPickerMode(false))
    dispatch(setCandidateToolMode(false))
    dispatch(setHistoryToolMode(false))
    dispatch(setMoreToolMode(false))
    if (next) {
      closeOverlay()
      dispatch(setNotesMode(false))
      switchLowerPad('colors', 'forward')
    } else {
      closeOverlay()
      switchLowerPad('numbers', 'backward')
    }
  }, [dispatch, game.brushMode, closeOverlay, switchLowerPad])

  const toggleCandidateTools = useCallback(() => {
    const next = !game.candidateToolMode
    closeOverlay()
    dispatch(setCandidateToolMode(next))
    dispatch(setEraserMode(false))
    dispatch(setEraserColorPickerMode(false))
    dispatch(setHistoryToolMode(false))
    dispatch(setMoreToolMode(false))
    if (next) {
      dispatch(setNotesMode(false))
      dispatch(setBrushMode(false))
      switchLowerPad('numbers', 'backward')
    }
  }, [dispatch, game.candidateToolMode, closeOverlay, switchLowerPad])

  const toggleHistoryTools = useCallback(() => {
    closeOverlay(true)
    dispatch(setMoreToolMode(false))
    dispatch(setHistoryToolMode(!game.historyToolMode))
  }, [dispatch, game.historyToolMode, closeOverlay])

  const toggleMoreTools = useCallback(() => {
    closeOverlay(true)
    dispatch(setHistoryToolMode(false))
    dispatch(setCandidateToolMode(false))
    dispatch(setEraserMode(false))
    dispatch(setEraserColorPickerMode(false))
    dispatch(setMoreToolMode(!game.moreToolMode))
  }, [dispatch, game.moreToolMode, closeOverlay])

  const toggleEraserMode = useCallback(() => {
    closeOverlay()
    dispatch(setHistoryToolMode(false))
    dispatch(setCandidateToolMode(false))
    dispatch(setMoreToolMode(false))
    dispatch(setEraserColorPickerMode(false))
    dispatch(setEraserMode(!game.eraserMode))
  }, [dispatch, game.eraserMode, closeOverlay])

  const toggleEraserColorPicker = useCallback(() => {
    dispatch(setEraserColorPickerMode(!boardUi.eraserColorPickerMode))
  }, [dispatch, boardUi.eraserColorPickerMode])

  useEffect(() => () => {
    if (toolTrayTimerRef.current !== null) window.clearTimeout(toolTrayTimerRef.current)
    if (toolTrayRafRef.current !== null) window.cancelAnimationFrame(toolTrayRafRef.current)
    if (lowerPadTimerRef.current !== null) window.clearTimeout(lowerPadTimerRef.current)
  }, [])

  return {
    toggleNotesTools,
    toggleBrushTools,
    toggleCandidateTools,
    toggleHistoryTools,
    toggleMoreTools,
    toggleEraserMode,
    toggleEraserColorPicker,
    switchLowerPad,
    toolTrayTimerRef,
    toolTrayRafRef,
    lowerPadTimerRef,
    visibleToolTray: boardUi.visibleToolTray,
    toolTrayTransition: boardUi.toolTrayTransition,
    toolTraySequence: boardUi.toolTraySequence,
    visibleLowerPad: boardUi.visibleLowerPad,
    lowerPadTransition: boardUi.lowerPadTransition,
    eraserColorPickerMode: boardUi.eraserColorPickerMode,
  }
}
