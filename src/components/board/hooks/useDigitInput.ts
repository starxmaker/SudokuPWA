import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../../store/hooks'
import {
  writeDigit,
  eraseCell,
  toggleNote,
  setSelected,
  type GameState,
} from '../../../store/gameSlice'
import type { Grid } from '../../../utils/sudoku'

function isDigitAllowed(
  state: GameState,
  d: number,
  target: { r: number; c: number },
): boolean {
  const { r, c } = target
  if (!state.initial || !state.current) return false
  if (state.initial[r][c] !== 0) return false
  const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  for (const row of state.current) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
  if (Math.max(0, 9 - digitCounts[d]) === 0) return false
  if (state.brushMode) return false
  const existingDigit = state.current[r][c]
  if (existingDigit !== 0 && state.solution !== null && existingDigit === state.solution[r][c]) return false
  return true
}

export function useDigitInput() {
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)
  const settings = useAppSelector(s => s.settings)

  const isClue = useCallback((r: number, c: number): boolean => {
    return game.initial !== null && game.initial[r][c] !== 0
  }, [game.initial])

  const applyDigit = useCallback((d: number, overrideCell?: { r: number; c: number }): boolean => {
    const target = overrideCell ?? game.selected
    if (!target) return false
    if (!isDigitAllowed(game, d, target)) return false

    const { r, c } = target
    const isWrongEntry = settings.autoCheck && game.solution !== null && d !== game.solution[r][c]

    dispatch(writeDigit({
      d,
      overrideCell: target,
      pencilMode: settings.pencilMode,
      autoCheck: settings.autoCheck,
      autoRemove: settings.autoRemove,
    }))
    return isWrongEntry
  }, [dispatch, game, settings])

  const clearCellAt = useCallback((r: number, c: number): boolean => {
    if (isClue(r, c)) return false
    dispatch(eraseCell({ r, c }))
    dispatch(setSelected({ r, c }))
    return true
  }, [dispatch, isClue])

  const clearCell = useCallback((): boolean => {
    if (!game.selected) return false
    return clearCellAt(game.selected.r, game.selected.c)
  }, [game.selected, clearCellAt])

  const getSimpleCandidates = useCallback((r: number, c: number): number[] => {
    if (!game.current) return []
    const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
    for (const row of game.current) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
    const remaining: Record<number, number> = {}
    for (let d = 1; d <= 9; d++) remaining[d] = Math.max(0, 9 - digitCounts[d])

    const used = new Set<number>()
    for (let i = 0; i < 9; i++) {
      const rowValue = game.current[r][i]
      const colValue = game.current[i][c]
      if (rowValue >= 1 && rowValue <= 9) used.add(rowValue)
      if (colValue >= 1 && colValue <= 9) used.add(colValue)
    }
    const boxR = Math.floor(r / 3) * 3
    const boxC = Math.floor(c / 3) * 3
    for (let br = boxR; br < boxR + 3; br++) {
      for (let bc = boxC; bc < boxC + 3; bc++) {
        const value = game.current[br][bc]
        if (value >= 1 && value <= 9) used.add(value)
      }
    }
    const candidates: number[] = []
    for (let d = 1; d <= 9; d++) {
      if (!used.has(d) && remaining[d] > 0) candidates.push(d)
    }
    return candidates
  }, [game.current])

  return {
    isClue,
    applyDigit,
    clearCellAt,
    clearCell,
    getSimpleCandidates,
    selected: game.selected,
    remaining: (() => {
      const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
      if (game.current) for (const row of game.current) for (const n of row) if (n >= 1 && n <= 9) digitCounts[n]++
      const r: Record<number, number> = {}
      for (let d = 1; d <= 9; d++) r[d] = Math.max(0, 9 - digitCounts[d])
      return r
    })(),
  }
}
