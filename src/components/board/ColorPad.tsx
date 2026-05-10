import React from 'react'
import { BRUSH_COLORS } from './boardUtils'
import type { BrushColorId } from '../../store/gameTypes'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  drawingMode: boolean
  activeBrushColor: BrushColorId
  activeDrawingColor: BrushColorId
  paused: boolean
  won: boolean
  selectedHasAnyColors: boolean
  applyBrushColor: (colorId: BrushColorId) => void
  clearSelectedBrushColors: () => void
  onMomentaryButtonClick: (event: React.MouseEvent<HTMLButtonElement>, action: () => boolean | void, alwaysHaptic?: boolean) => void
  tabIndex?: number
  t: TFunc
}

export default function ColorPad({
  drawingMode, activeBrushColor, activeDrawingColor,
  paused, won, selectedHasAnyColors,
  applyBrushColor, clearSelectedBrushColors, onMomentaryButtonClick,
  tabIndex, t,
}: Props) {
  const activePaletteColor = drawingMode ? activeDrawingColor : activeBrushColor
  return (
    <>
      {BRUSH_COLORS.map((color, index) => (
        <button
          key={color.id}
          type="button"
          className={`brush-color-button${activePaletteColor === color.id ? ' brush-color-button--active' : ''}`}
          aria-label={t('board.brushColor', { index: index + 1 })}
          aria-pressed={activePaletteColor === color.id}
          disabled={paused || won}
          onClick={() => applyBrushColor(color.id as BrushColorId)}
          style={{ '--annotation-color': color.fill, '--swatch-color': color.swatch } as React.CSSProperties}
          tabIndex={tabIndex}
        />
      ))}
      <button
        type="button"
        className="brush-color-button brush-color-button--clear"
        aria-label={t('board.brushColorRemover')}
        aria-pressed={false}
        disabled={paused || won || !selectedHasAnyColors}
        onClick={(event) => onMomentaryButtonClick(event, clearSelectedBrushColors, true)}
        tabIndex={tabIndex}
      >
        <span className="brush-color-button__clear-mark" aria-hidden="true">×</span>
      </button>
    </>
  )
}
