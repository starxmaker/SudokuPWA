export type GameDifficulty =
  | 'VERY_EASY'
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXPERT'
  | 'NIGHTMARE'
  | 'DIABOLICAL'


export const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  VERY_EASY: 'Very Easy',
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  VERY_HARD: 'Very Hard',
  EXPERT: 'Expert',
  NIGHTMARE: 'Nightmare',
  DIABOLICAL: 'Diabolical'
}