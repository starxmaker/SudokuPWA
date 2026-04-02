/** Ambient type declarations for the 'qqwing' npm package (no @types available). */
declare module 'qqwing' {
  interface QQWingInstance {
    setRecordHistory(b: boolean): void
    setLogHistory(b: boolean): void
    setPrintStyle(style: number): void
    generatePuzzle(): boolean
    generatePuzzleSymmetry(symmetry: number): boolean
    solve(): boolean
    getDifficulty(): number
    getPuzzleString(): string
    getSolutionString(): string
    isSolved(): boolean
  }

  interface QQWingConstructor {
    new(): QQWingInstance
    Difficulty: Readonly<{ UNKNOWN: 0; SIMPLE: 1; EASY: 2; INTERMEDIATE: 3; EXPERT: 4 }>
    PrintStyle: Readonly<{ ONE_LINE: 0; COMPACT: 1; READABLE: 2; CSV: 3 }>
    Symmetry: Readonly<{ NONE: 0; ROTATE90: 1; ROTATE180: 2; MIRROR: 3; FLIP: 4; RANDOM: 5 }>
  }

  const qqwing: QQWingConstructor
  export = qqwing
}
