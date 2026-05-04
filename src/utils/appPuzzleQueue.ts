import type { GameDifficulty, PuzzleSolutionPair } from './generators/types'
import { createPuzzleQueueManager } from './puzzleQueue'
import type { PuzzleQueueAvailability } from './puzzleQueue'
import { generateGame } from './sudoku'

const manager = createPuzzleQueueManager({
  generatePuzzle: (difficulty, signal) => generateGame(difficulty, signal),
})

export function getPuzzleQueueAvailability(): PuzzleQueueAvailability {
  return manager.getAvailability()
}

export function subscribePuzzleQueueAvailability(
  listener: (availability: PuzzleQueueAvailability) => void,
) {
  return manager.subscribe(listener)
}

export function startPuzzleQueueDaemon() {
  manager.start()
}

export function stopPuzzleQueueDaemon() {
  manager.stop()
}

export function takeQueuedGame(difficulty: GameDifficulty): Promise<PuzzleSolutionPair | null> {
  return manager.take(difficulty)
}
