import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import { removeCandidate } from '../../../store/gameSlice'
import {
  setCandidateOverlay,
  closeCandidateOverlay,
  setCandidateOverlayPreviewDigit,
  setBoardUiCandidateSelectedDigit,
  openPencilOverlay,
  closePencilOverlay,
} from '../../../store/boardUiSlice'
import type { CandidateOverlayState } from '../boardUtils'

function getCandidateOverlayPosition(rect: DOMRect) {
  const maxSize = Math.min(window.innerWidth - 16, window.innerHeight - 16, rect.width * 3)
  const size = Math.max(120, maxSize)
  const unclampedLeft = rect.left + rect.width / 2 - size / 2
  const unclampedTop = rect.top + rect.height / 2 - size / 2
  return {
    size,
    left: Math.max(8, Math.min(window.innerWidth - size - 8, unclampedLeft)),
    top: Math.max(8, Math.min(window.innerHeight - size - 8, unclampedTop)),
  }
}

export function useCandidateOverlay() {
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)
  const boardUi = useAppSelector(s => s.boardUi)

  const closeOverlay = useCallback((preserveSelectedDigit = false) => {
    dispatch(closeCandidateOverlay({ preserveSelectedDigit }))
  }, [dispatch])

  const openCandidateOverlay = useCallback((
    r: number,
    c: number,
    target: HTMLElement,
    mode: CandidateOverlayState['mode'] = 'paint',
  ): boolean => {
    if (mode === 'paint') {
      dispatch(setBoardUiCandidateSelectedDigit(null))
    }
    dispatch({ type: 'game/setSelected', payload: { r, c } })
    if (
      game.current && game.current[r][c] !== 0 ||
      game.notes[r][c].length === 0 ||
      (mode === 'paint' && game.cellColors[r][c].length > 0)
    ) {
      dispatch(setCandidateOverlay(null))
      return false
    }
    const { top, left, size } = getCandidateOverlayPosition(target.getBoundingClientRect())
    if (mode === 'paint') {
      dispatch(setBoardUiCandidateSelectedDigit(null))
    }
    dispatch(setCandidateOverlayPreviewDigit(null))
    dispatch(setCandidateOverlay({ r, c, top, left, size, mode }))
    return true
  }, [dispatch, game])

  const removeCandidateAt = useCallback((r: number, c: number, d: number): boolean => {
    if (!game.notes[r][c].includes(d)) return false
    dispatch(removeCandidate({ r, c, d }))
    return true
  }, [dispatch, game])

  const openPencilOverlayForCell = useCallback((
    r: number,
    c: number,
    target: HTMLButtonElement,
    initialPointer: { clientX: number; clientY: number; pointerId: number },
  ) => {
    dispatch({ type: 'game/setSelected', payload: { r, c } })
    const domRect = target.getBoundingClientRect()
    dispatch(openPencilOverlay({
      r,
      c,
      rect: { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height },
      initialPointer,
    }))
  }, [dispatch])

  return {
    closeCandidateOverlay: closeOverlay,
    openCandidateOverlay,
    removeCandidateAt,
    openPencilOverlayForCell,
    closePencilOverlay: () => dispatch(closePencilOverlay()),
    setCandidateOverlayPreviewDigit: (d: number | null) => dispatch(setCandidateOverlayPreviewDigit(d)),
    setCandidateSelectedDigit: (d: number | null) => dispatch(setBoardUiCandidateSelectedDigit(d)),
    candidateOverlay: boardUi.candidateOverlay,
    candidateOverlayPreviewDigit: boardUi.candidateOverlayPreviewDigit,
    candidateSelectedDigit: boardUi.candidateSelectedDigit,
    pencilOverlayCell: boardUi.pencilOverlayCell,
    overlayCellNotes: boardUi.candidateOverlay ? game.notes[boardUi.candidateOverlay.r][boardUi.candidateOverlay.c] : [],
    overlayHasCellColor: boardUi.candidateOverlay !== null && game.cellColors[boardUi.candidateOverlay.r][boardUi.candidateOverlay.c].length > 0,
  }
}
