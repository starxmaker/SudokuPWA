import React from 'react'
import { MdUndo, MdRedo, MdOutlineInvertColorsOff, MdLightbulbOutline } from 'react-icons/md'
import { PiPencilSlash } from 'react-icons/pi'
import { FaWandMagicSparkles } from 'react-icons/fa6'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  mode: 'eraser' | 'history' | 'candidate'
  paused: boolean
  won: boolean
  hasAnyColors: boolean
  hasAnyDrawings: boolean
  undoDisabled: boolean
  redoDisabled: boolean
  hasAnyFillableCell: boolean
  hasSingleCandidates: boolean
  requiredTechniquesLoading: boolean
  haptic: boolean
  onTriggerHaptic?: () => void
  onClearAllColors: () => boolean | void
  onClearAllDrawings: () => boolean | void
  onUndo: () => boolean | void
  onRedo: () => boolean | void
  onFillAllCandidates: () => boolean | void
  onApplySingleCandidates: () => void
  onShowRequiredTechniques: () => Promise<unknown>
  onMomentaryButtonClick: (event: React.MouseEvent<HTMLButtonElement>, action: () => boolean | void, alwaysHaptic?: boolean) => void
  tabIndex?: number
  t: TFunc
}

export default function ToolActionsPad({
  mode, paused, won,
  hasAnyColors, hasAnyDrawings,
  undoDisabled, redoDisabled,
  hasAnyFillableCell, hasSingleCandidates,
  requiredTechniquesLoading, haptic, onTriggerHaptic,
  onClearAllColors, onClearAllDrawings,
  onUndo, onRedo,
  onFillAllCandidates, onApplySingleCandidates, onShowRequiredTechniques,
  onMomentaryButtonClick, tabIndex, t,
}: Props) {
  if (mode === 'eraser') {
    return (
      <>
        <button type="button" className="eraser-action-button" aria-label={t('board.cleanColors')}
          disabled={paused || won || !hasAnyColors}
          onClick={(event) => onMomentaryButtonClick(event, onClearAllColors, true)} tabIndex={tabIndex}>
          <span className="eraser-action-button__icon" aria-hidden="true"><MdOutlineInvertColorsOff size={20} /></span>
          <span className="eraser-action-button__label">{t('board.cleanColors')}</span>
        </button>
        <button type="button" className="eraser-action-button" aria-label={t('board.cleanDrawings')}
          disabled={paused || won || !hasAnyDrawings}
          onClick={(event) => onMomentaryButtonClick(event, onClearAllDrawings, true)} tabIndex={tabIndex}>
          <span className="eraser-action-button__icon" aria-hidden="true"><PiPencilSlash size={20} /></span>
          <span className="eraser-action-button__label">{t('board.cleanDrawings')}</span>
        </button>
      </>
    )
  }

  if (mode === 'history') {
    return (
      <>
        <button type="button" className="eraser-action-button" aria-label={t('board.undo')}
          disabled={undoDisabled}
          onClick={(event) => onMomentaryButtonClick(event, onUndo, true)} tabIndex={tabIndex}>
          <span className="eraser-action-button__icon" aria-hidden="true"><MdUndo size={20} /></span>
          <span className="eraser-action-button__label">{t('board.undo')}</span>
        </button>
        <button type="button" className="eraser-action-button" aria-label={t('board.redo')}
          disabled={redoDisabled}
          onClick={(event) => onMomentaryButtonClick(event, onRedo, true)} tabIndex={tabIndex}>
          <span className="eraser-action-button__icon" aria-hidden="true"><MdRedo size={20} /></span>
          <span className="eraser-action-button__label">{t('board.redo')}</span>
        </button>
      </>
    )
  }

  return (
    <>
      <button type="button" className="eraser-action-button" aria-label={t('board.showAllBasicCandidates')}
        disabled={paused || won || !hasAnyFillableCell}
        onClick={(event) => onMomentaryButtonClick(event, onFillAllCandidates, true)} tabIndex={tabIndex}>
        <span className="eraser-action-button__icon" aria-hidden="true"><FaWandMagicSparkles size={20} /></span>
        <span className="eraser-action-button__label">{t('board.showAllBasicCandidates')}</span>
      </button>
      <button type="button" className="eraser-action-button" aria-label={t('board.singleCandidateToDigit')}
        disabled={paused || won || !hasSingleCandidates}
        onClick={(event) => onMomentaryButtonClick(event, onApplySingleCandidates, true)} tabIndex={tabIndex}>
        <span className="eraser-action-button__icon" aria-hidden="true"><FaWandMagicSparkles size={20} /></span>
        <span className="eraser-action-button__label">{t('board.singleCandidateToDigit')}</span>
      </button>
      <button type="button" className="eraser-action-button" aria-label={t('board.seeRequiredTechniques')}
        aria-busy={requiredTechniquesLoading}
        disabled={paused || won || requiredTechniquesLoading}
        onClick={async (event) => {
          event.currentTarget.blur()
          if (haptic) onTriggerHaptic?.()
          await onShowRequiredTechniques()
        }} tabIndex={tabIndex}>
        <span className="eraser-action-button__icon" aria-hidden="true"><MdLightbulbOutline size={20} /></span>
        <span className="eraser-action-button__label">{t('board.seeRequiredTechniques')}</span>
      </button>
    </>
  )
}
