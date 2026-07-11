import { useCallback, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import { handleRetry } from '../../../store/gameSlice'
import { newGameThunk } from '../../../store/thunks'
import { resetBoardUi } from '../../../store/boardUiSlice'
import type { TechniquesSidebarHandle } from '../TechniquesSidebar'

export function useNewGameActions(techniquesRef: React.MutableRefObject<TechniquesSidebarHandle | null>) {
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)

  const newGame = useCallback(async () => {
    techniquesRef.current?.reset()
    await dispatch(newGameThunk(null))
  }, [dispatch, techniquesRef])

  const retry = useCallback(() => {
    if (!game.initial) return
    techniquesRef.current?.reset()
    dispatch(handleRetry())
    dispatch(resetBoardUi())
  }, [dispatch, game.initial, techniquesRef])

  return { newGame, retry }
}
