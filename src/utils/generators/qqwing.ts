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

const MAX_ATTEMPTS = 50

export const qqwingGenerator: PuzzleGenerator = {
  id: 'qqwing',
  label: 'QQWing',
  difficulties: DIFFICULTIES,
  defaultDifficulty: 'easy',

  async generate(difficulty: string, signal?: AbortSignal) {
    const targets = TARGET_MAP[difficulty] ?? []
    const q = new qqwingLib()
    q.setLogHistory(false)
    q.setRecordHistory(false)
    q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)

    let lastPuzzle = ''
    let lastSolution = ''

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      // Yield every 5 attempts to keep the UI responsive and allow abort checks
      if (attempt > 0 && attempt % 5 === 0) {
        await new Promise<void>(r => setTimeout(r, 0))
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      }

      if (!q.generatePuzzle()) continue

      lastPuzzle   = q.getPuzzleString()
      lastSolution = q.getSolutionString()

      // Re-solve with history recording to analyse which techniques were needed
      q.setRecordHistory(true)
      q.solve()
      q.setRecordHistory(false)

      if (targets.includes(q.getDifficulty())) {
        return {
          puzzle:   parseGrid(lastPuzzle),
          solution: parseGrid(q.getSolutionString()),
        }
      }
    }

    // Fallback: return the last generated puzzle even if difficulty didn't match
    return {
      puzzle:   parseGrid(lastPuzzle),
      solution: parseGrid(lastSolution),
    }
  },
}

