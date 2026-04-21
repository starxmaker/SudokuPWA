import { describe, it, expect } from 'vitest'
import { generateGame, solveGrid, validateCreatedPuzzle } from './sudoku'
import { SudokuSolver } from 'hodoku-difficulty-rating-ts'
import { HODOKU_ESTIMATIONS, matchesHodokuEstimation, type HodokuEstimationId } from './generators/hodoku'

const GENERATION_DIFFICULTIES = [
  'VERY_EASY',
  'EASY',
  'MEDIUM',
  'HARD',
  'VERY_HARD',
  'EXPERT',
  'NIGHTMARE',
  'DIABOLICAL',
] as const
const GENERATION_SMOKE_DIFFICULTIES = [
  'VERY_EASY',
  'MEDIUM',
  'VERY_HARD',
  'EXPERT',
] as const satisfies readonly HodokuEstimationId[]
const MULTI_SOLUTION_PUZZLE: number[][] = [
  [0, 3, 0, 0, 0, 8, 0, 0, 0],
  [0, 0, 2, 1, 9, 5, 3, 0, 8],
  [0, 9, 8, 0, 4, 2, 5, 6, 7],
  [0, 0, 9, 0, 0, 0, 0, 2, 0],
  [4, 2, 6, 8, 0, 0, 7, 0, 1],
  [7, 0, 3, 0, 2, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 7, 2, 0, 0],
  [2, 8, 7, 4, 0, 0, 0, 3, 5],
  [3, 0, 5, 0, 8, 6, 0, 7, 9],
]

function isValidSolution(grid: number[][]): boolean {
  const expected = new Set([1,2,3,4,5,6,7,8,9])
  const setOf = (ns: number[]) => new Set(ns)
  // rows
  for (let r = 0; r < 9; r++)
    if (!([...expected].every(n => setOf(grid[r]).has(n)))) return false
  // cols
  for (let c = 0; c < 9; c++)
    if (!([...expected].every(n => setOf(grid.map(r => r[c])).has(n)))) return false
  // boxes
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++) {
      const box: number[] = []
      for (let r = br*3; r < br*3+3; r++)
        for (let c = bc*3; c < bc*3+3; c++)
          box.push(grid[r][c])
      if (!([...expected].every(n => setOf(box).has(n)))) return false
    }
  return true
}

function gridToString(grid: number[][]): string {
  return grid.flat().map(n => n === 0 ? '.' : String(n)).join('')
}

describe('sudoku utils', () => {
  it('generateGame returns a valid puzzle and complete solution', async () => {
    const { puzzle, solution } = await generateGame()
    expect(puzzle.length).toBe(9)
    expect(solution.length).toBe(9)
    expect(isValidSolution(solution)).toBe(true)
    const zeros = puzzle.flat().filter(n => n === 0).length
    expect(zeros).toBeGreaterThan(0)
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c])
  }, 30_000)

  it.each(GENERATION_SMOKE_DIFFICULTIES)('generateGame difficulty=%s respects its Hodoku estimation', async (id) => {
    const estimation = HODOKU_ESTIMATIONS[id]
    const { puzzle, solution } = await generateGame(id)
    expect(puzzle.length).toBe(9)
    expect(solution.length).toBe(9)
    expect(isValidSolution(solution)).toBe(true)
    const zeros = puzzle.flat().filter(n => n === 0).length
    expect(zeros).toBeGreaterThan(0)
    const rating = SudokuSolver.rateByScore(gridToString(puzzle))
    expect(rating.solved).toBe(true)
    expect(matchesHodokuEstimation(rating, estimation)).toBe(true)
  }, 30_000)

  it.each(GENERATION_DIFFICULTIES)('matchesHodokuEstimation enforces estimation %s', (id) => {
    const estimation = HODOKU_ESTIMATIONS[id]
    const midScore = estimation.minScore !== null
      ? estimation.maxScore !== null
        ? Math.floor((estimation.minScore + estimation.maxScore) / 2)
        : estimation.minScore + 100
      : estimation.maxScore !== null
        ? Math.floor(estimation.maxScore / 2)
        : 2000

    expect(matchesHodokuEstimation({ difficulty: estimation.difficulty, score: midScore }, estimation)).toBe(true)

    if (estimation.minScore !== null) {
      expect(matchesHodokuEstimation({ difficulty: estimation.difficulty, score: estimation.minScore - 1 }, estimation)).toBe(false)
    }
    if (estimation.maxScore !== null) {
      expect(matchesHodokuEstimation({ difficulty: estimation.difficulty, score: estimation.maxScore + 1 }, estimation)).toBe(false)
    }
    const wrongDifficulty = estimation.difficulty === 'EASY' ? 'MEDIUM' : 'EASY'
    expect(matchesHodokuEstimation({ difficulty: wrongDifficulty, score: midScore }, estimation)).toBe(false)
  }, 30_000)

  it('solveGrid solves a known easy puzzle', () => {
    // A valid Sudoku puzzle (0 = blank)
    const puzzle = [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ]
    const solution = solveGrid(puzzle)
    expect(solution).not.toBeNull()
    expect(isValidSolution(solution!)).toBe(true)
  })

  it('solveGrid returns null for an unsolvable puzzle', () => {
    // Two 5s in the same row — unsolvable
    const bad = [
      [5,5,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ]
    expect(solveGrid(bad)).toBeNull()
  })

  it('validateCreatedPuzzle returns a unique solution for a valid custom puzzle', () => {
    const puzzle = [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ]

    const result = validateCreatedPuzzle(puzzle)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(isValidSolution(result.solution)).toBe(true)
    }
  })

  it('validateCreatedPuzzle rejects puzzles with too few givens', () => {
    const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
    const result = validateCreatedPuzzle(puzzle)
    expect(result).toEqual({
      valid: false,
      message: 'A created puzzle needs at least 17 clues.',
    })
  })

  it('validateCreatedPuzzle rejects puzzles with conflicting givens', () => {
    const puzzle = [
      [5,5,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ]
    const result = validateCreatedPuzzle(puzzle)
    expect(result).toEqual({
      valid: false,
      message: 'This puzzle has conflicting givens.',
    })
  })

  it('validateCreatedPuzzle rejects puzzles with multiple solutions', () => {
    const result = validateCreatedPuzzle(MULTI_SOLUTION_PUZZLE)
    expect(result).toEqual({
      valid: false,
      message: 'This puzzle must have exactly one solution.',
    })
  })
})
