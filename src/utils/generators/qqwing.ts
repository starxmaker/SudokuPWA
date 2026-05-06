import qqwingLib from 'qqwing'

export function generate(quantity: number, signal?: AbortSignal) : string[]{
  const q = new qqwingLib()
  q.setLogHistory(false)
  q.setRecordHistory(false)
  q.setPrintStyle(qqwingLib.PrintStyle.ONE_LINE)
  const puzzles = []

  while (puzzles.length < quantity) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (!q.generatePuzzle()) continue
    puzzles.push(q.getPuzzleString().replaceAll('\n', ''))
  }
  return puzzles
}
