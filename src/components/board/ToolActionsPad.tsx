import React from 'react'
import { MdUndo, MdRedo, MdOutlineInvertColorsOff, MdLightbulbOutline, MdHistory } from 'react-icons/md'
import { FaWandMagicSparkles } from 'react-icons/fa6'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  mode: 'eraser' | 'history' | 'candidate' | 'more'
  paused: boolean
  won: boolean
  hasAnyColors: boolean
  undoDisabled: boolean
  redoDisabled: boolean
  hasAnyFillableCell: boolean
  hasSingleCandidates: boolean
  requiredTechniquesLoading: boolean
  requiredTechniquesOpen: boolean
  haptic: boolean
  onTriggerHaptic?: () => void
  onClearAllColors: () => boolean | void
  onUndo: () => boolean | void
  onRedo: () => boolean | void
  onFillAllCandidates: () => boolean | void
  onApplySingleCandidates: () => void
  onShowRequiredTechniques: () => Promise<unknown>
  onToggleHistoryTools: () => void
  onMomentaryButtonClick: (event: React.MouseEvent<HTMLButtonElement>, action: () => boolean | void, alwaysHaptic?: boolean) => void
  onModeButtonClick: (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => void
  tabIndex?: number
  t: TFunc
}

export default function ToolActionsPad({
  mode, paused, won,
  hasAnyColors,
  undoDisabled, redoDisabled,
  hasAnyFillableCell, hasSingleCandidates,
  requiredTechniquesLoading, requiredTechniquesOpen, haptic, onTriggerHaptic,
  onClearAllColors,
  onUndo, onRedo,
  onFillAllCandidates, onApplySingleCandidates, onShowRequiredTechniques,
  onToggleHistoryTools,
  onMomentaryButtonClick, onModeButtonClick, tabIndex, t,
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

  if (mode === 'more') {
    return (
      <>
        <button type="button" className="eraser-action-button" aria-label={t('board.historyShort')}
          disabled={paused || won}
          onClick={(event) => onModeButtonClick(event, onToggleHistoryTools)} tabIndex={tabIndex}>
          <span className="eraser-action-button__icon" aria-hidden="true"><MdHistory size={20} /></span>
          <span className="eraser-action-button__label">{t('board.historyShort')}</span>
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
      <button type="button" className="eraser-action-button" aria-label={requiredTechniquesLoading ? t('board.solvingSudoku') : t('board.seeRequiredTechniques')}
        aria-busy={requiredTechniquesLoading}
        aria-expanded={requiredTechniquesOpen}
        disabled={paused || won || requiredTechniquesLoading || requiredTechniquesOpen}
        onClick={async (event) => {
          event.currentTarget.blur()
          if (haptic) onTriggerHaptic?.()
          await onShowRequiredTechniques()
        }} tabIndex={tabIndex}>
        <span className="eraser-action-button__icon" aria-hidden="true">
          {requiredTechniquesLoading ? <span className="spinner spinner--current" /> : <MdLightbulbOutline size={20} />}
        </span>
        <span className="eraser-action-button__label">{requiredTechniquesLoading ? t('board.solvingSudoku') : t('board.seeRequiredTechniques')}</span>
      </button>
    </>
  )
}
