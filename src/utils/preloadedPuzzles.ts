import preloadedPuzzleData from '../data/preloaded-puzzles.json'
import { decodeGrid } from './gameStorage'
import { DIFFICULTY_LABELS, type GameDifficulty } from './difficulties'
import type { Grid } from './sudoku_types'
import type { SolvablePuzzle } from './generators/types'
import type { PuzzleQueueAvailability } from './puzzleQueue'

type RawPreloadedPuzzle = {
  puzzle: string
  difficulty: string
  score: string
  solution: string
}

const EMPTY_AVAILABILITY: PuzzleQueueAvailability = {
  VERY_EASY: 0,
  EASY: 0,
  MEDIUM: 0,
  HARD: 0,
  VERY_HARD: 0,
  EXPERT: 0,
  NIGHTMARE: 0,
  DIABOLICAL: 0,
}

const LABEL_TO_DIFFICULTY = Object.fromEntries(
  Object.entries(DIFFICULTY_LABELS).map(([difficulty, label]) => [label, difficulty as GameDifficulty]),
) as Record<string, GameDifficulty>

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row])
}

function createPreloadedCatalog() {
  const byDifficulty = Object.fromEntries(
    (Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]).map(difficulty => [difficulty, [] as SolvablePuzzle[]]),
  ) as Record<GameDifficulty, SolvablePuzzle[]>

  for (const rawPuzzle of preloadedPuzzleData as RawPreloadedPuzzle[]) {
    const difficulty = LABEL_TO_DIFFICULTY[rawPuzzle.difficulty]
    if (!difficulty) continue

    const puzzle = decodeGrid(rawPuzzle.puzzle)
    const solution = decodeGrid(rawPuzzle.solution)
    const score = Number(rawPuzzle.score)

    if (!puzzle || !solution || !Number.isFinite(score)) continue

    byDifficulty[difficulty].push({
      puzzle,
      solution,
      difficulty,
      score,
    })
  }

  const availability = { ...EMPTY_AVAILABILITY }
  for (const difficulty of Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]) {
    availability[difficulty] = byDifficulty[difficulty].length
  }

  return { byDifficulty, availability }
}

const PRELOADED_PUZZLES = createPreloadedCatalog()

export function getPreloadedPuzzleAvailability(): PuzzleQueueAvailability {
  return { ...PRELOADED_PUZZLES.availability }
}

export function takePreloadedPuzzle(difficulty: GameDifficulty): SolvablePuzzle | null {
  const puzzles = PRELOADED_PUZZLES.byDifficulty[difficulty]
  if (puzzles.length === 0) return null

  const selected = puzzles[Math.floor(Math.random() * puzzles.length)]
  return {
    puzzle: cloneGrid(selected.puzzle),
    solution: cloneGrid(selected.solution),
    difficulty: selected.difficulty,
    score: selected.score,
  }
}
