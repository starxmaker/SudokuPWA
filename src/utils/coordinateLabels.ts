export type CoordinateLabelMode = 'none' | 'row-number-column-letter' | 'row-number-column-number'

export const DEFAULT_COORDINATE_LABEL_MODE: CoordinateLabelMode = 'none'

export const COORDINATE_NUMBER_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export const COORDINATE_LETTER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const

export function isCoordinateLabelMode(value: string): value is CoordinateLabelMode {
  return value === 'none'
    || value === 'row-number-column-letter'
    || value === 'row-number-column-number'
}

export function parseCoordinateLabelMode(value: string | null | undefined): CoordinateLabelMode {
  if (value === 'true') return 'row-number-column-letter'
  if (value === null || value === undefined || value === 'false') return DEFAULT_COORDINATE_LABEL_MODE
  return isCoordinateLabelMode(value) ? value : DEFAULT_COORDINATE_LABEL_MODE
}

export function getCoordinateLabelSets(mode: CoordinateLabelMode) {
  switch (mode) {
    case 'row-number-column-letter':
      return {
        rowLabels: COORDINATE_NUMBER_LABELS,
        columnLabels: COORDINATE_LETTER_LABELS,
      }
    case 'row-number-column-number':
      return {
        rowLabels: COORDINATE_NUMBER_LABELS,
        columnLabels: COORDINATE_NUMBER_LABELS,
      }
    default:
      return {
        rowLabels: null,
        columnLabels: null,
      }
  }
}
