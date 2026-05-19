export const MIN_PUZZLE_GENERATION_COUNT = 0
export const MAX_PUZZLE_GENERATION_COUNT = 10
export const DEFAULT_PUZZLE_GENERATION_COUNT = 1
export const PUZZLE_GENERATION_COUNT_STORAGE_KEY = 'puzzleGenerationCount'

export function normalizePuzzleGenerationCount(
  value: unknown,
  fallback = DEFAULT_PUZZLE_GENERATION_COUNT,
): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN

  if (!Number.isFinite(parsed)) return fallback

  return Math.min(
    MAX_PUZZLE_GENERATION_COUNT,
    Math.max(MIN_PUZZLE_GENERATION_COUNT, Math.trunc(parsed)),
  )
}
