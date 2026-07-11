import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import {
  applyCellBrushColor,
  applyCandidateBrushColor,
  clearSelectedBrushColors,
  clearAllColors,
  clearAllNotes,
  clearColorFromBoard,
  setActiveBrushColor,
  type BrushColorId,
} from '../../../store/gameSlice'

export function useBrushActions() {
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)

  const applyCellBrushColorAt = useCallback((r: number, c: number, colorId?: BrushColorId): boolean => {
    const id = colorId ?? game.activeBrushColor
    if (!game.current) return false
    if (game.current[r][c] !== 0) return false
    if (game.candidateColors[r][c].some(cc => cc.length > 0)) return false
    const currentColors = game.cellColors[r][c]
    const wouldChange = !currentColors.includes(id) || currentColors.length > 1
    if (!wouldChange && currentColors.length === 1 && currentColors[0] === id) return false
    dispatch(applyCellBrushColor({ r, c, colorId: id, firstColorFlagEnabled: game.candidateSelectedDigit !== null }))
    return true
  }, [dispatch, game])

  const applyCandidateBrushColorAt = useCallback((r: number, c: number, d: number): boolean => {
    if (game.cellColors[r][c].length > 0) return false
    if (!game.notes[r][c].includes(d)) return false
    const currentColors = game.candidateColors[r][c][d - 1]
    const wouldChange = !currentColors.includes(game.activeBrushColor) || currentColors.length > 1
    if (!wouldChange && currentColors.length === 1 && currentColors[0] === game.activeBrushColor) return false
    dispatch(applyCandidateBrushColor({ r, c, d, colorId: game.activeBrushColor, firstColorFlagEnabled: false }))
    return true
  }, [dispatch, game])

  const clearSelectedBrushColorsFn = useCallback((): boolean => {
    if (!game.selected) return false
    const { r, c } = game.selected
    const hasCellColor = game.cellColors[r][c].length > 0
    const hasCandidateColor = game.candidateColors[r][c].some(colors => colors.length > 0)
    if (!hasCellColor && !hasCandidateColor) return false
    dispatch(clearSelectedBrushColors())
    return true
  }, [dispatch, game])

  const clearAllColorsFn = useCallback((): boolean => {
    const hasCellColors = game.cellColors.some(row => row.some(color => color.length > 0))
    const hasCandidateColors = game.candidateColors.some(row =>
      row.some(cell => cell.some(color => color.length > 0))
    )
    if (!hasCellColors && !hasCandidateColors) return false
    dispatch(clearAllColors())
    return true
  }, [dispatch, game])

  const clearAllNotesFn = useCallback((): boolean => {
    const hasNotes = game.notes.some(row => row.some(cell => cell.length > 0))
    if (!hasNotes) return false
    dispatch(clearAllNotes())
    return true
  }, [dispatch, game])

  const clearColorFromBoardFn = useCallback((colorId: BrushColorId): boolean => {
    const hasColor = game.cellColors.some(row => row.some(cell => cell.includes(colorId)))
      || game.candidateColors.some(row => row.some(cell => cell.some(candidate => candidate.includes(colorId))))
    if (!hasColor) return false
    dispatch(clearColorFromBoard(colorId))
    return true
  }, [dispatch, game])

  const applyBrushColor = useCallback((colorId: BrushColorId) => {
    dispatch(setActiveBrushColor(colorId))
  }, [dispatch])

  return {
    applyCellBrushColorAt,
    applyCandidateBrushColorAt,
    clearSelectedBrushColors: clearSelectedBrushColorsFn,
    clearAllColors: clearAllColorsFn,
    clearAllNotes: clearAllNotesFn,
    clearColorFromBoard: clearColorFromBoardFn,
    applyBrushColor,
    hasAnyColors: game.cellColors.some(row => row.some(color => color.length > 0))
      || game.candidateColors.some(row => row.some(cell => cell.some(color => color.length > 0))),
    hasAnyNotes: game.notes.some(row => row.some(cell => cell.length > 0)),
  }
}
