import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import { undo, redo } from '../../../store/gameSlice'

export function useHistoryControls() {
  const dispatch = useAppDispatch()
  const history = useAppSelector(s => s.game.history)
  const redoHistory = useAppSelector(s => s.game.redoHistory)
  const paused = useAppSelector(s => s.game.paused)
  const won = useAppSelector(s => s.game.won)

  const undoFn = useCallback((): boolean => {
    if (history.length === 0 || paused || won) return false
    dispatch(undo())
    return true
  }, [dispatch, history.length, paused, won])

  const redoFn = useCallback((): boolean => {
    if (redoHistory.length === 0 || paused || won) return false
    dispatch(redo())
    return true
  }, [dispatch, redoHistory.length, paused, won])

  return {
    undo: undoFn,
    redo: redoFn,
    undoDisabled: history.length === 0 || paused || won,
    redoDisabled: redoHistory.length === 0 || paused || won,
  }
}
