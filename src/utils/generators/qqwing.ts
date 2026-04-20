import qqwingLib from 'qqwing'
import type { Grid } from '../sudoku_types'
import type { PuzzleGenerator, DifficultyOption } from './types'

const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'simple',       label: 'Simple' },
  { id: 'easy',         label: 'Easy' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'expert',       label: 'Expert' },
]

// Maps each difficulty id to the qqwing Difficulty enum values that count as a match
const TARGET_MAP: Record<string, number[]> = {
  simple:       [qqwingLib.Difficulty.SIMPLE],
  easy:         [qqwingLib.Difficulty.EASY],
  intermediate: [qqwingLib.Difficulty.INTERMEDIATE],
  expert:       [qqwingLib.Difficulty.EXPERT],
}

/**
 * Parse a qqwing ONE_LINE puzzle/solution string into a 9×9 Grid.
 * ONE_LINE format: 81 chars (digits 1–9 or '.') followed by a newline.
 */
function parseGrid(str: string): Grid {
  const flat = str.replace(/[^1-9.]/g, '')
  const grid: Grid = []
  for (let r = 0; r < 9; r++) {
    const row: number[] = []
    for (let c = 0; c < 9; c++) {
      const ch = flat[r * 9 + c]
      row.push(ch === '.' ? 0 : parseInt(ch, 10))
    }
    grid.push(row)
  }
  return grid
}

export const qqwingGenerator: PuzzleGenerator = {
  id: 'qqwing',
  label: 'QQWing',
  difficulties: DIFFICULTIES,
  defaultDifficulty: 'easy',

  async generate(difficulty: string, signal?: AbortSignal) {
    const targets = TARGET_MAP[difficulty] ?? []
    if (targets.length === 0) {
      throw new Error(`Unsupported difficulty: ${difficulty}`)
    }
    const q = new qqwingLib()
    q.setLogHistory(false)
    q.setRecordHistory(false)
    q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)

    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      if (!q.generatePuzzle()) continue

      // Re-solve with history recording to analyse which techniques were needed
      q.setRecordHistory(true)
      q.solve()
      q.setRecordHistory(false)

      if (targets.includes(q.getDifficulty())) {
        return {
          puzzle:   parseGrid(q.getPuzzleString()),
          solution: parseGrid(q.getSolutionString()),
        }
      }
    }
  },
}

