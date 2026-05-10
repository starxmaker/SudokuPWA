import type { PuzzleQueueAvailability } from './puzzleQueue'
import { DIFFICULTY_LABELS, type GameDifficulty } from './difficulties'

export function getEffectiveAvailability(
  queueAvailability: PuzzleQueueAvailability,
  preloadedAvailability: PuzzleQueueAvailability,
): PuzzleQueueAvailability {
  return Object.fromEntries(
    (Object.keys(DIFFICULTY_LABELS) as GameDifficulty[]).map(difficulty => [
      difficulty,
      queueAvailability[difficulty] > 0 ? queueAvailability[difficulty] : preloadedAvailability[difficulty],
    ]),
  ) as PuzzleQueueAvailability
}
