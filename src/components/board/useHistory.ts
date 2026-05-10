import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useStore } from 'react-redux'
import type { RootState } from '../../store'
import { pushHistoryEntry, undo as undoAction, redo as redoAction } from '../../store/gameSlice'
import { makeHistoryEntry } from './boardUtils'
import type { BoardHistoryEntry } from '../../store/gameTypes'

export function useHistory() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const history = useAppSelector(s => s.game.history)
  const redoHistory = useAppSelector(s => s.game.redoHistory)

  function getCurrentHistoryEntry(): BoardHistoryEntry {
    const g = store.getState().game
    return makeHistoryEntry(
      g.current!,
      g.notes,
      g.cellColors,
      g.candidateColors,
      g.drawingStrokes,
      g.flaggedColorCell,
    )
  }

  function saveHistoryEntry(entry: BoardHistoryEntry) {
    dispatch(pushHistoryEntry(entry))
  }

  function performUndo() {
    dispatch(undoAction())
  }

  function performRedo() {
    dispatch(redoAction())
  }

  return {
    history,
    redoHistory,
    getCurrentHistoryEntry,
    saveHistoryEntry: (entry: BoardHistoryEntry) => dispatch(pushHistoryEntry(entry)),
    performUndo,
    performRedo,
  }
}
