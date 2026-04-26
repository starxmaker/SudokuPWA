import qqwingLib from 'qqwing'
import { QQWingConstraint } from './types'

export function generate(constraints : QQWingConstraint, signal?: AbortSignal) : string[]{
  const { quantity = 1, difficulty } = constraints
  const q = new qqwingLib()
  q.setLogHistory(false)
  q.setRecordHistory(false)
  q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)
  const puzzles = []

  while (puzzles.length < quantity) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    if (!q.generatePuzzle()) continue

    // Re-solve with history recording to analyse which techniques were needed
    // It is not resource intensive, so it is uses as a quick filter.
    q.setRecordHistory(true)
    q.solve()
    q.setRecordHistory(false)

    if (q.getDifficulty() === difficulty) {
      puzzles.push(q.getPuzzleString().replaceAll('\n', ''))
    }
  }
  return puzzles
}


