import { useEffect, useCallback, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import { setPaused, winGame, tickElapsed } from '../../../store/gameSlice'

export function useGameLifecycle(onWin?: () => void) {
  const dispatch = useAppDispatch()
  const current = useAppSelector(s => s.game.current)
  const solution = useAppSelector(s => s.game.solution)
  const elapsed = useAppSelector(s => s.game.elapsed)
  const won = useAppSelector(s => s.game.won)
  const paused = useAppSelector(s => s.game.paused)
  const elapsedRef = useRef(elapsed)
  elapsedRef.current = elapsed
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin

  const updatePaused = useCallback((next: boolean) => {
    dispatch(setPaused(next))
  }, [dispatch])

  useEffect(() => {
    function onBlur() { updatePaused(true) }
    function onVisibility() { if (document.hidden) updatePaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [updatePaused])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => dispatch(tickElapsed()), 1000)
    return () => clearInterval(id)
  }, [paused, dispatch])

  useEffect(() => {
    if (won) return
    if (!solution || !current || current.length !== 9) return
    const complete = current.every((row, r) => row.every((n, c) => n === solution[r][c]))
    if (complete) {
      dispatch(winGame(elapsedRef.current))
      onWinRef.current?.()
    }
  }, [current, solution, won, dispatch])

  return { paused, won, updatePaused, elapsed }
}
