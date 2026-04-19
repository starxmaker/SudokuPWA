import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeGrid,
  decodeGrid,
  saveGame,
  loadSaved,
  STORAGE_KEY,
  BRUSH_PREFS_KEY,
  emptyCellColors,
  emptyCandidateColors,
  emptyDrawingStrokes,
  saveBrushPrefs,
  loadBrushPrefs,
} from './gameStorage'
import type { Grid } from './sudoku_types'

const BLANK: Grid = Array.from({ length: 9 }, () => Array(9).fill(0))
const SAMPLE: Grid = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9],
]

function emptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
}

function sampleNotes(): number[][][] {
  const n = emptyNotes()
  n[0][0] = [1, 2, 3]
  n[4][4] = [5, 9]
  n[8][8] = [7]
  return n
}

function sampleCellColors() {
  const colors = emptyCellColors()
  colors[0][0] = ['rose']
  colors[4][4] = ['sky']
  return colors
}

function sampleCandidateColors() {
  const colors = emptyCandidateColors()
  colors[0][0][0] = ['rose']
  colors[4][4][4] = ['sky']
  return colors
}

function sampleDrawingStrokes() {
  return [
    { color: '#f43f5e', points: [[0.1, 0.2], [0.3, 0.4]] as [number, number][] },
    { color: '#0ea5e9', points: [[0.7, 0.8]] as [number, number][] },
  ]
}

beforeEach(() => localStorage.clear())

describe('encodeGrid / decodeGrid', () => {
  it('round-trips a full grid', () => {
    const encoded = encodeGrid(SAMPLE)
    expect(encoded).toMatch(/^[1-9.]{81}$/)
    const decoded = decodeGrid(encoded)
    expect(decoded).toEqual(SAMPLE)
  })

  it('encodes zeros as dots', () => {
    const encoded = encodeGrid(BLANK)
    expect(encoded).toBe('.'.repeat(81))
  })

  it('round-trips a grid with zeros', () => {
    const decoded = decodeGrid(encodeGrid(BLANK))
    expect(decoded).toEqual(BLANK)
  })

  it('still decodes old dashed format (backward compat)', () => {
    const old = SAMPLE.map(row => row.join('')).join('-')
    expect(decodeGrid(old)).toEqual(SAMPLE)
  })

  it('returns null for empty string', () => {
    expect(decodeGrid('')).toBeNull()
  })

  it('returns null for wrong number of rows (old format)', () => {
    expect(decodeGrid('123456789-123456789')).toBeNull()
  })

  it('returns null for rows with wrong length (old format)', () => {
    const bad = '12345678-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789'
    expect(decodeGrid(bad)).toBeNull()
  })

  it('returns null for non-digit/non-dot characters', () => {
    const bad = 'a23456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789'
    expect(decodeGrid(bad)).toBeNull()
  })

  it('returns null for special characters / injection attempts', () => {
    expect(decodeGrid('<script>alert(1)</script>')).toBeNull()
    expect(decodeGrid('../../../etc/passwd')).toBeNull()
    expect(decodeGrid('1'.repeat(200))).toBeNull()
  })
})

describe('saveGame / loadSaved', () => {
  it('saves and loads a game without notes', () => {
    saveGame(SAMPLE, BLANK, SAMPLE)
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.initial).toEqual(SAMPLE)
    expect(saved!.current).toEqual(BLANK)
    expect(saved!.solution).toEqual(SAMPLE)
    expect(saved!.notes).toEqual(emptyNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('saves and loads notes correctly', () => {
    const notes = sampleNotes()
    saveGame(SAMPLE, BLANK, SAMPLE, notes)
    const saved = loadSaved()
    expect(saved!.notes).toEqual(notes)
  })

  it('notes default to empty when not provided', () => {
    saveGame(SAMPLE, BLANK, null)
    const saved = loadSaved()
    expect(saved!.notes).toEqual(emptyNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('returns null when nothing is saved', () => {
    expect(loadSaved()).toBeNull()
  })

  it('returns null for corrupted localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
    expect(loadSaved()).toBeNull()
  })

  it('handles missing solution field (null)', () => {
    saveGame(SAMPLE, SAMPLE, null)
    const saved = loadSaved()
    expect(saved!.solution).toBeNull()
  })

  it('does not mutate grids after saving', () => {
    const initial: Grid = SAMPLE.map(r => [...r])
    saveGame(initial, BLANK, null)
    initial[0][0] = 99
    const saved = loadSaved()
    expect(saved!.initial[0][0]).toBe(5) // original value preserved
  })

  it('does not mutate notes after saving', () => {
    const notes = sampleNotes()
    saveGame(SAMPLE, BLANK, null, notes)
    notes[0][0] = [9, 9, 9]
    const saved = loadSaved()
    expect(saved!.notes[0][0]).toEqual([1, 2, 3]) // original value preserved
  })

  it('saves and loads brush colors correctly', () => {
    const cellColors = sampleCellColors()
    const candidateColors = sampleCandidateColors()
    saveGame(SAMPLE, BLANK, SAMPLE, emptyNotes(), cellColors, candidateColors)
    const saved = loadSaved()
    expect(saved!.cellColors).toEqual(cellColors)
    expect(saved!.candidateColors).toEqual(candidateColors)
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('does not mutate brush colors after saving', () => {
    const cellColors = sampleCellColors()
    const candidateColors = sampleCandidateColors()
    saveGame(SAMPLE, BLANK, null, emptyNotes(), cellColors, candidateColors)
    cellColors[0][0] = ['pink']
    candidateColors[0][0][0] = ['pink']
    const saved = loadSaved()
    expect(saved!.cellColors[0][0]).toEqual(['rose'])
    expect(saved!.candidateColors[0][0][0]).toEqual(['rose'])
  })

  it('saves and loads drawing strokes correctly', () => {
    const drawingStrokes = sampleDrawingStrokes()
    saveGame(SAMPLE, BLANK, SAMPLE, emptyNotes(), emptyCellColors(), emptyCandidateColors(), drawingStrokes)
    const saved = loadSaved()
    expect(saved!.drawingStrokes).toEqual(drawingStrokes)
  })

  it('does not mutate drawing strokes after saving', () => {
    const drawingStrokes = sampleDrawingStrokes()
    saveGame(SAMPLE, BLANK, null, emptyNotes(), emptyCellColors(), emptyCandidateColors(), drawingStrokes)
    drawingStrokes[0].points[0][0] = 0.9
    drawingStrokes[1].color = '#000000'
    const saved = loadSaved()
    expect(saved!.drawingStrokes[0].points[0][0]).toBe(0.1)
    expect(saved!.drawingStrokes[1].color).toBe('#0ea5e9')
  })

  it('loads legacy V3 saves with empty notes', () => {
    const legacy = { v: 3, initial: SAMPLE, current: BLANK, solution: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.initial).toEqual(SAMPLE)
    expect(saved!.notes).toEqual(emptyNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('loads legacy V2 saves with empty notes', () => {
    const legacy = { v: 2, initial: SAMPLE, current: BLANK, solution: SAMPLE }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.solution).toEqual(SAMPLE)
    expect(saved!.notes).toEqual(emptyNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('loads legacy array-format saves with empty notes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE))
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.initial).toEqual(SAMPLE)
    expect(saved!.notes).toEqual(emptyNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('loads legacy V4 saves with empty brush colors', () => {
    const legacy = { v: 4, initial: SAMPLE, current: BLANK, solution: SAMPLE, notes: sampleNotes() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.notes).toEqual(sampleNotes())
    expect(saved!.cellColors).toEqual(emptyCellColors())
    expect(saved!.candidateColors).toEqual(emptyCandidateColors())
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('loads legacy V6 saves with empty drawings', () => {
    const legacy = {
      v: 6,
      initial: SAMPLE,
      current: BLANK,
      solution: SAMPLE,
      notes: sampleNotes(),
      cellColors: sampleCellColors(),
      candidateColors: sampleCandidateColors(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const saved = loadSaved()
    expect(saved).not.toBeNull()
    expect(saved!.drawingStrokes).toEqual(emptyDrawingStrokes())
  })

  it('stores V7 version tag', () => {
    saveGame(SAMPLE, BLANK, null)
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(raw.v).toBe(7)
  })
})

describe('brush preferences', () => {
  it('saves and loads brush and drawing colors independently', () => {
    saveBrushPrefs(['violet'], true, ['lime'])
    expect(loadBrushPrefs()).toEqual({
      activeColors: ['violet'],
      activeDrawingColors: ['lime'],
      candidateMode: true,
    })
  })

  it('loads legacy brush prefs without a drawing color slot', () => {
    localStorage.setItem(BRUSH_PREFS_KEY, JSON.stringify({
      activeColor: 'sky',
      candidateMode: false,
    }))

    expect(loadBrushPrefs()).toEqual({
      activeColors: ['sky'],
      activeDrawingColors: [],
      candidateMode: false,
    })
  })
})
