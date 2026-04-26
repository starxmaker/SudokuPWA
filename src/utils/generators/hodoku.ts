import { createRuntimePool } from "hodoku-core-js";
import { HodokuConstraint, HodokuDifficulty, SolveRating } from "./types";

export async function findComplaint(puzzles: string[], constraints: HodokuConstraint, signal?: AbortSignal) : Promise<string | null> {
  const difficulty = constraints.difficulty.toUpperCase();
  const minScore = constraints.minScore;
  const maxScore = constraints.maxScore;
  return await new Promise(async (resolve) => {
    await evaluate(puzzles, (r) => {
      if (signal?.aborted) {
        resolve(null);
        return false
      }
      const difficultyMatch = r.difficulty.toUpperCase() === difficulty;
      const minScoreMatch = minScore === null || r.score >= minScore;
      const maxScoreMatch = maxScore === null || r.score <= maxScore;
      if (difficultyMatch && minScoreMatch && maxScoreMatch) {
        resolve(r.puzzle);
        return false
      }
      return true
    })
    resolve(null);
  })
}

export async function evaluate(puzzles : string[], onNewPuzzle?: (rating: SolveRating) => boolean, signal?: AbortSignal) : Promise<SolveRating[]> {
  const results = [] as SolveRating[];
  const args = ["/o", "stdout", ...puzzles];
  const pool = createRuntimePool();
  await pool.executeCommand(args, (line) => {
    if (signal?.aborted) {
      return false;
    }
    const result = map(line)
    if (result) {
      if (onNewPuzzle) {
        const continueProcessing = onNewPuzzle(result);
        if (!continueProcessing) {
          return false;
        }
      }
      results.push(result);
    }
  });
  pool.dispose();
  return results;
}

const regex =
  /^([\.0-9]{81})\s+#\d+\s+(Easy|Medium|Hard|Unfair|Extreme)\s+\((\d+)\)$/;
  
export const map = (line : string) : SolveRating | null => {
  const match = line.trim().match(regex);
  if (match) {
    return {
      puzzle: match[1],
      difficulty: match[2] as HodokuDifficulty,
      score: Number(match[3]),
    }
  }
  return null
}