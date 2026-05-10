import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { tickElapsed, setPaused, setManualPause, winGame } from '../../store/gameSlice'

export function useTimer() {
  const dispatch = useAppDispatch()
  const elapsed = useAppSelector(s => s.game.elapsed)
  const paused = useAppSelector(s => s.game.paused)
  const manualPause = useAppSelector(s => s.game.manualPause)
  const won = useAppSelector(s => s.game.won)
  const current = useAppSelector(s => s.game.current)
  const solution = useAppSelector(s => s.game.solution)

  useEffect(() => {
    function onBlur() { dispatch(setPaused(true)) }
    function onVisibility() { if (document.hidden) dispatch(setPaused(true)) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => dispatch(tickElapsed()), 1000)
    return () => clearInterval(id)
  }, [paused, dispatch])

  useEffect(() => {
    if (won) return
    if (!solution || current?.length !== 9) return
    const complete = current.every((row, r) => row.every((n, c) => n === solution[r][c]))
    if (complete) {
      dispatch(winGame(elapsed))
    }
  }, [current, solution, won, elapsed, dispatch])

  return {
    elapsed,
    paused,
    manualPause,
    won,
    togglePause: () => dispatch(setPaused(!paused)),
    toggleManualPause: () => dispatch(setManualPause(!manualPause)),
  }
}
