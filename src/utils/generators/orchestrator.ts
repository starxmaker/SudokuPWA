import * as qqwing from './qqwing'
import { solve as sudokujsSolve } from '@starxmaker/sudoku.js'
import { Grid } from '../sudoku_types'
import { findComplaint, HODOKU_ESTIMATIONS } from './hodoku'
import { GameDifficulty, DifficultyConfiguration, PuzzleSolutionPair, QQWingDifficulty} from './types'


export const DIFFICULTY_CONFIGURATIONS: Record<GameDifficulty, DifficultyConfiguration> = {
  VERY_EASY: {
    label: 'Very Easy',
    hodokuConstraint: HODOKU_ESTIMATIONS.VERY_EASY,
    qqwingConstraint: { difficulty: QQWingDifficulty.SIMPLE }
  },
  EASY: {
    label: 'Easy',
    hodokuConstraint: HODOKU_ESTIMATIONS.EASY,
    qqwingConstraint: { difficulty: QQWingDifficulty.EASY }
  },
  MEDIUM: {
    label: 'Medium',
    hodokuConstraint: HODOKU_ESTIMATIONS.MEDIUM,
    qqwingConstraint: { difficulty: QQWingDifficulty.INTERMEDIATE }
  },
  HARD: {
    label: 'Hard',
    hodokuConstraint: HODOKU_ESTIMATIONS.HARD,
    qqwingConstraint: { difficulty: QQWingDifficulty.EXPERT }
  },
  VERY_HARD: {
    label: 'Very Hard',
    hodokuConstraint: HODOKU_ESTIMATIONS.VERY_HARD,
    qqwingConstraint: { difficulty: QQWingDifficulty.EXPERT }
  },
  EXPERT: {
    label: 'Expert',
    hodokuConstraint: HODOKU_ESTIMATIONS.EXPERT,
    qqwingConstraint: { difficulty: QQWingDifficulty.EXPERT }
  },
  NIGHTMARE: {
    label: 'Nightmare',
    hodokuConstraint: HODOKU_ESTIMATIONS.NIGHTMARE,
    qqwingConstraint: { quantity:10, difficulty: QQWingDifficulty.EXPERT }
  },
  DIABOLICAL: {
    label: 'Diabolical',
    hodokuConstraint: HODOKU_ESTIMATIONS.DIABOLICAL,
    qqwingConstraint: { quantity:10, difficulty: QQWingDifficulty.EXPERT }
  },
}

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

export async function generate(difficulty: GameDifficulty, signal?: AbortSignal) : Promise<PuzzleSolutionPair> {
    const config = DIFFICULTY_CONFIGURATIONS[difficulty]
    while (true) {
        // generation + cheap calibration
        const puzzles = qqwing.generate(config.qqwingConstraint, signal)

        // verify solvability. Could be redundant, considering qqwing also doing the same
        // Sodoku checks single solution though. We need to confirm if that is the case of qqwing
        // Not urgent though, as sudokujs is very fast
        const puzzleSolutions : Record<string, Grid | null> = puzzles.reduce((acc, p) => {
                acc[p] = sudokujsSolve(parseGrid(p)) as Grid | null
                return acc
            }, {} as Record<string, Grid | null>)
        const solvablePuzzles : Record<string, Grid> = Object.fromEntries(
            Object.entries(puzzleSolutions).filter(([_, solution]) => solution !== null) as [string, Grid][]
        )
        if (Object.keys(solvablePuzzles).length === 0) continue

        // Calibrate difficulty by human techniques 
        // Very resource intensive, so it should be done after filtering.
        const puzzleStrings = Object.keys(solvablePuzzles)
        if (!config.hodokuConstraint) {
            const firstCompliantPuzzle = puzzleStrings[0]
            return {
                puzzle: parseGrid(firstCompliantPuzzle),
                solution: solvablePuzzles[firstCompliantPuzzle]
            }
        }
        const compliantPuzzle = await findComplaint(puzzleStrings, config.hodokuConstraint!, signal)
        if (!compliantPuzzle) continue
        const solution = solvablePuzzles[compliantPuzzle]
        return {
            puzzle: parseGrid(compliantPuzzle),
            solution: solution
        }
    }
}
