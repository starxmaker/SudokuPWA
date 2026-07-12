import React from 'react'
import { MdArrowBack, MdMoreHoriz } from 'react-icons/md'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { dismissPortraitTechniquesSummary } from '../../store/boardUiSlice'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type RequiredTechniquesSummary = {
  technique: string
  notation: string
}

type Props = {
  requiredTechniquesSummary: RequiredTechniquesSummary
  openRequiredTechniquesSidebar: () => void
  onTriggerHaptic?: () => void
  t: TFunc
}

export default function RequiredTechniquesPreview({
  requiredTechniquesSummary,
  openRequiredTechniquesSidebar,
  onTriggerHaptic,
  t,
}: Props) {
  const dispatch = useAppDispatch()
  const paused = useAppSelector(s => s.game.paused)
  const won = useAppSelector(s => s.game.won)
  const haptic = useAppSelector(s => s.settings.haptic)
  const techniquesOpen = useAppSelector(s => s.boardUi.techniquesOpen)

  function hideRequiredTechniquesSummary() {
    dispatch(dismissPortraitTechniquesSummary())
  }

  return (
    <div
      className="candidate-action-pad candidate-action-pad--techniques-preview"
      role="region"
      aria-label={t('board.requiredTechniquesTitle')}
    >
      <div className="required-techniques-preview">
        <div className="required-techniques-preview__main">
          <div className="required-techniques-preview__content">
            <p className="required-techniques-preview__label">{t('board.nextTechnique')}</p>
            <p className="required-techniques-preview__technique">{requiredTechniquesSummary.technique}</p>
            <p className="required-techniques-preview__label">{t('board.notationLabel')}</p>
            <p className="required-techniques-preview__notation">
              {requiredTechniquesSummary.notation.length > 0 ? requiredTechniquesSummary.notation : '-'}
            </p>
          </div>
          <div className="required-techniques-preview__actions">
            <button
              type="button"
              className="required-techniques-preview__icon-button"
              aria-label={t('board.backToCandidateTools')}
              disabled={paused || won}
              onClick={(event) => {
                event.currentTarget.blur()
                if (haptic) onTriggerHaptic?.()
                hideRequiredTechniquesSummary()
              }}
            >
              <MdArrowBack size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="required-techniques-preview__icon-button"
              aria-label={t('board.seeRemainingTechniques')}
              disabled={paused || won || techniquesOpen}
              onClick={(event) => {
                event.currentTarget.blur()
                if (haptic) onTriggerHaptic?.()
                openRequiredTechniquesSidebar()
              }}
            >
              <MdMoreHoriz size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
