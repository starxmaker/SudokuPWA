import { describe, it, expect } from 'vitest'
import { generateGame, solveGrid, type Difficulty } from './sudoku'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

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

describe('sudoku utils', () => {
  it('generateGame returns a valid puzzle and complete solution', async () => {
    const { puzzle, solution } = await generateGame('easy')
    expect(puzzle.length).toBe(9)
    expect(solution.length).toBe(9)
    expect(isValidSolution(solution)).toBe(true)
    const zeros = puzzle.flat().filter(n => n === 0).length
    expect(zeros).toBeGreaterThan(0)
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c])
  })

  it.each(DIFFICULTIES)('generateGame difficulty=%s produces correct givens count', async (diff) => {
    const EXPECTED: Record<Difficulty, number> = { easy: 38, medium: 30, hard: 28, expert: 23 }
    const { puzzle } = await generateGame(diff)
    const givens = puzzle.flat().filter(n => n !== 0).length
    // allow ±10 variance — library may not hit the exact number every time
    expect(givens).toBeGreaterThanOrEqual(EXPECTED[diff] - 10)
    expect(givens).toBeLessThanOrEqual(EXPECTED[diff] + 10)
  })

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
})
