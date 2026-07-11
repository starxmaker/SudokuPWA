import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import { moveSelection } from '../../../store/gameSlice'

export function useKeyboardInput(
  applyDigitFn: (d: number) => boolean,
  clearCellFn: () => boolean,
) {
  const dispatch = useAppDispatch()
  const won = useAppSelector(s => s.game.won)
  const paused = useAppSelector(s => s.game.paused)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (won || paused) return

      const arrows: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]
      }
      if (arrows[e.key]) {
        e.preventDefault()
        const [dr, dc] = arrows[e.key]
        dispatch(moveSelection({ dr, dc }))
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        applyDigitFn(Number(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        clearCellFn()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [won, paused, applyDigitFn, clearCellFn, dispatch])
}
