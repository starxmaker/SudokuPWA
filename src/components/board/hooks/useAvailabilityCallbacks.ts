import { useEffect } from 'react'
import { useAppSelector } from '../../../store/hooks'
import { hasAnyBrushColorsOnBoard } from '../boardUtils'

export function useAvailabilityCallbacks(
  onClearPaintingAvailabilityChange?: (available: boolean) => void,
  onIdentifyCandidatesAvailabilityChange?: (available: boolean) => void,
) {
  const game = useAppSelector(s => s.game)

  const hasAnyColors = hasAnyBrushColorsOnBoard(game.cellColors, game.candidateColors)
  const hasAnyFillableCell = game.current !== null && game.initial !== null && game.current.some((row, r) =>
    row.some((n, c) => game.initial![r][c] === 0 && n === 0 && game.notes[r][c].length === 0)
  )

  useEffect(() => {
    onClearPaintingAvailabilityChange?.(hasAnyColors)
  }, [hasAnyColors, onClearPaintingAvailabilityChange])

  useEffect(() => {
    onIdentifyCandidatesAvailabilityChange?.(hasAnyFillableCell)
  }, [hasAnyFillableCell, onIdentifyCandidatesAvailabilityChange])

  return { hasAnyColors, hasAnyFillableCell }
}
