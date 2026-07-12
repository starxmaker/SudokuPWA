import React from 'react'
import { MdArrowBack } from 'react-icons/md'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { setBoardUiCandidateSelectedDigit, closeCandidateOverlay, setCandidateOverlayPreviewDigit } from '../../store/boardUiSlice'
import { fillAllCandidates, applySingleCandidatesToDigits } from '../../store/gameSlice'
import { useToolTray } from './hooks/useToolTray'
import { useHistoryControls } from './hooks/useHistoryControls'
import { useBrushActions } from './hooks/useBrushActions'
import { useDigitInput } from './hooks/useDigitInput'
import NumberPad from './NumberPad'
import ColorPad from './ColorPad'
import ToolActionsPad from './ToolActionsPad'
import RequiredTechniquesPreview from './RequiredTechniquesPreview'
import { BRUSH_COLORS } from './boardUtils'
import type { BrushColorId } from '../../store/gameTypes'
import type { LowerPadView, LowerPadTransition } from './boardUtils'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type RequiredTechniquesSummaryType = {
  technique: string
  notation: string
}

type Props = {
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
  touchFiredRef: React.MutableRefObject<string | null>
  showRequiredTechniques: () => Promise<unknown>
  openRequiredTechniquesSidebar: () => void
  requiredTechniquesSummary: RequiredTechniquesSummaryType | null
  t: TFunc
}

export default function LowerPadSwitcher({
  onTriggerHaptic,
  onTriggerErrorHaptic,
  touchFiredRef,
  showRequiredTechniques,
  openRequiredTechniquesSidebar,
  requiredTechniquesSummary,
  t,
}: Props) {
  const dispatch = useAppDispatch()
  const paused = useAppSelector(s => s.game.paused)
  const won = useAppSelector(s => s.game.won)
  const haptic = useAppSelector(s => s.settings.haptic)
  const historyToolMode = useAppSelector(s => s.game.historyToolMode)
  const eraserMode = useAppSelector(s => s.game.eraserMode)
  const brushMode = useAppSelector(s => s.game.brushMode)
  const pencilMode = useAppSelector(s => s.settings.pencilMode)
  const candidateToolMode = useAppSelector(s => s.game.candidateToolMode)
  const moreToolMode = useAppSelector(s => s.game.moreToolMode)
  const eraserColorPickerMode = useAppSelector(s => s.boardUi.eraserColorPickerMode)
  const visibleLowerPad = useAppSelector(s => s.boardUi.visibleLowerPad)
  const lowerPadTransition = useAppSelector(s => s.boardUi.lowerPadTransition) as LowerPadTransition | null
  const requiredTechniquesLoading = useAppSelector(s => s.game.requiredTechniquesLoading)
  const techniquesOpen = useAppSelector(s => s.boardUi.techniquesOpen)
  const activeBrushColor = useAppSelector(s => s.game.activeBrushColor)
  const notesMode = useAppSelector(s => s.game.notesMode)
  const candidateSelectedDigit = useAppSelector(s => s.boardUi.candidateSelectedDigit)
  const current = useAppSelector(s => s.game.current)
  const notes = useAppSelector(s => s.game.notes)
  const initial = useAppSelector(s => s.game.initial)
  const cellColors = useAppSelector(s => s.game.cellColors)
  const selected = useAppSelector(s => s.game.selected)
  const autoCheck = useAppSelector(s => s.settings.autoCheck)
  const autoRemove = useAppSelector(s => s.settings.autoRemove)

  const { remaining, applyDigit } = useDigitInput()
  const { undo, redo, undoDisabled, redoDisabled } = useHistoryControls()
  const {
    hasAnyColors,
    hasAnyNotes,
    selectedHasAnyColors,
    clearAllColors,
    clearAllNotes,
    clearSelectedBrushColors,
    clearColorFromBoard,
    applyBrushColor,
  } = useBrushActions()
  const { toggleEraserColorPicker, toggleHistoryTools } = useToolTray()

  function handleMomentaryButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => boolean | void,
    alwaysHaptic = false,
  ) {
    const changed = action()
    event.currentTarget.blur()
    if (haptic && (alwaysHaptic || changed)) onTriggerHaptic?.()
  }

  function handleModeButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    action()
    event.currentTarget.blur()
    if (haptic) onTriggerHaptic?.()
  }

  function toggleReferenceDigitHighlight(d: number) {
    dispatch(closeCandidateOverlay({}))
    dispatch(setCandidateOverlayPreviewDigit(null))
    dispatch(setBoardUiCandidateSelectedDigit(candidateSelectedDigit === d ? null : d))
  }

  function handleFillAllCandidates() {
    if (!current || !initial) return false
    const hasFillable = current.some((row, r) =>
      row.some((n, c) => initial[r][c] === 0 && n === 0 && notes[r][c].length === 0)
    )
    if (!hasFillable) return false
    dispatch(fillAllCandidates())
    return true
  }

  function handleApplySingleCandidatesToDigits() {
    if (!current || !initial) return false
    const hasSingle = current.some((row, r) =>
      row.some((n, c) => initial[r][c] === 0 && n === 0 && notes[r][c].length === 1)
    )
    if (!hasSingle) return false
    dispatch(applySingleCandidatesToDigits({ autoCheck, autoRemove }))
    return true
  }

  const isClue = (r: number, c: number): boolean =>
    initial !== null && initial[r][c] !== 0

  const hasAnyFillableCell = current ? current.some((row, r) =>
    row.some((n, c) => !isClue(r, c) && n === 0 && notes[r][c].length === 0)
  ) : false

  const hasSingleCandidates = notes.some((row, r) =>
    row.some((cell, c) => !isClue(r, c) && current && current[r][c] === 0 && cell.length === 1)
  )

  function lowerPadPanelClass(view: LowerPadView, layer: 'active' | 'overlay') {
    const lowerPadOverlayView = lowerPadTransition?.from ?? null
    if (layer === 'active') {
      if (visibleLowerPad !== view) {
        return 'input-pad__panel--hidden'
      }
      if (lowerPadTransition?.to === view) {
        return 'input-pad__panel--fade-in'
      }
      return 'input-pad__panel--active'
    }

    if (lowerPadOverlayView !== view || lowerPadTransition === null) {
      return 'input-pad__panel--hidden'
    }
    return 'input-pad__panel--fade-out'
  }

  if (historyToolMode) {
    return (
      <div className="input-pad-switcher input-pad-switcher--history-actions">
        <div
          className="history-action-pad"
          role="toolbar"
          aria-label={t('board.historyActions')}
        >
          <ToolActionsPad
            mode="history"
            paused={paused}
            won={won}
            hasAnyColors={hasAnyColors}
            undoDisabled={undoDisabled}
            redoDisabled={redoDisabled}
            hasAnyFillableCell={hasAnyFillableCell}
            hasSingleCandidates={hasSingleCandidates}
            requiredTechniquesLoading={requiredTechniquesLoading}
            requiredTechniquesOpen={techniquesOpen}
            haptic={haptic}
            onTriggerHaptic={onTriggerHaptic}
            onClearAllColors={clearAllColors}
            onUndo={undo}
            onRedo={redo}
            onFillAllCandidates={handleFillAllCandidates}
            onApplySingleCandidates={handleApplySingleCandidatesToDigits}
            onShowRequiredTechniques={showRequiredTechniques}
            onToggleHistoryTools={toggleHistoryTools}
            onMomentaryButtonClick={handleMomentaryButtonClick}
            onModeButtonClick={handleModeButtonClick}
            t={t}
          />
        </div>
      </div>
    )
  }

  if (eraserMode) {
    return (
      <div className="input-pad-switcher input-pad-switcher--eraser-actions">
        {eraserColorPickerMode ? (
          <div className="number-pad brush-color-pad" role="toolbar" aria-label={t('board.eraserColorPicker')}>
            <button
              type="button"
              className="brush-color-button brush-color-button--clear"
              aria-label={t('board.backToEraserActions')}
              disabled={paused || won}
              onClick={(event) => handleModeButtonClick(event, toggleEraserColorPicker)}
            >
              <MdArrowBack size={20} />
            </button>
            {BRUSH_COLORS.map((color, index) => (
              <button
                key={color.id}
                type="button"
                className="brush-color-button"
                aria-label={t('board.brushColor', { index: index + 1 })}
                disabled={paused || won}
                onClick={(event) => handleMomentaryButtonClick(event, () => { clearColorFromBoard(color.id as BrushColorId); toggleEraserColorPicker() }, true)}
                style={{ '--annotation-color': color.fill, '--swatch-color': color.swatch } as React.CSSProperties}
              />
            ))}
          </div>
        ) : (
          <div
            className="eraser-action-pad"
            role="toolbar"
            aria-label={t('board.eraserActions')}
          >
            <ToolActionsPad
              mode="eraser"
              paused={paused}
              won={won}
              hasAnyColors={hasAnyColors}
              hasAnyNotes={hasAnyNotes}
              undoDisabled={undoDisabled}
              redoDisabled={redoDisabled}
              hasAnyFillableCell={hasAnyFillableCell}
              hasSingleCandidates={hasSingleCandidates}
              requiredTechniquesLoading={requiredTechniquesLoading}
              requiredTechniquesOpen={techniquesOpen}
              haptic={haptic}
              onTriggerHaptic={onTriggerHaptic}
              onClearAllColors={clearAllColors}
              onClearAllNotes={clearAllNotes}
              onUndo={undo}
              onRedo={redo}
              onFillAllCandidates={handleFillAllCandidates}
              onApplySingleCandidates={handleApplySingleCandidatesToDigits}
              onShowRequiredTechniques={showRequiredTechniques}
              onToggleHistoryTools={toggleHistoryTools}
              onToggleEraserColorPicker={toggleEraserColorPicker}
              onMomentaryButtonClick={handleMomentaryButtonClick}
              onModeButtonClick={handleModeButtonClick}
              t={t}
            />
          </div>
        )}
      </div>
    )
  }

  if (candidateToolMode) {
    return (
      <div className="input-pad-switcher input-pad-switcher--candidate-actions">
        {requiredTechniquesSummary ? (
          <RequiredTechniquesPreview
            requiredTechniquesSummary={requiredTechniquesSummary}
            openRequiredTechniquesSidebar={openRequiredTechniquesSidebar}
            onTriggerHaptic={onTriggerHaptic}
            t={t}
          />
        ) : (
          <div
            className="candidate-action-pad candidate-action-pad--single-row"
            role="toolbar"
            aria-label={t('board.candidateActions')}
          >
            <ToolActionsPad
              mode="candidate"
              paused={paused}
              won={won}
              hasAnyColors={hasAnyColors}
              undoDisabled={undoDisabled}
              redoDisabled={redoDisabled}
              hasAnyFillableCell={hasAnyFillableCell}
              hasSingleCandidates={hasSingleCandidates}
              requiredTechniquesLoading={requiredTechniquesLoading}
              requiredTechniquesOpen={techniquesOpen}
              haptic={haptic}
              onTriggerHaptic={onTriggerHaptic}
              onClearAllColors={clearAllColors}
              onUndo={undo}
              onRedo={redo}
              onFillAllCandidates={handleFillAllCandidates}
              onApplySingleCandidates={handleApplySingleCandidatesToDigits}
              onShowRequiredTechniques={showRequiredTechniques}
              onToggleHistoryTools={toggleHistoryTools}
              onMomentaryButtonClick={handleMomentaryButtonClick}
              onModeButtonClick={handleModeButtonClick}
              t={t}
            />
          </div>
        )}
      </div>
    )
  }

  if (moreToolMode) {
    return (
      <div className="input-pad-switcher input-pad-switcher--more-actions">
        <div
          className="eraser-action-pad"
          role="toolbar"
          aria-label={t('board.moreActions')}
        >
          <ToolActionsPad
            mode="more"
            paused={paused}
            won={won}
            hasAnyColors={hasAnyColors}
            undoDisabled={undoDisabled}
            redoDisabled={redoDisabled}
            hasAnyFillableCell={hasAnyFillableCell}
            hasSingleCandidates={hasSingleCandidates}
            requiredTechniquesLoading={requiredTechniquesLoading}
            requiredTechniquesOpen={techniquesOpen}
            haptic={haptic}
            onTriggerHaptic={onTriggerHaptic}
            onClearAllColors={clearAllColors}
            onUndo={undo}
            onRedo={redo}
            onFillAllCandidates={handleFillAllCandidates}
            onApplySingleCandidates={handleApplySingleCandidatesToDigits}
            onShowRequiredTechniques={showRequiredTechniques}
            onToggleHistoryTools={toggleHistoryTools}
            onMomentaryButtonClick={handleMomentaryButtonClick}
            onModeButtonClick={handleModeButtonClick}
            t={t}
          />
        </div>
      </div>
    )
  }

  if (pencilMode) {
    if (brushMode) {
      return (
        <div className="input-pad-switcher input-pad-switcher--colors">
          <div
            className="number-pad brush-color-pad"
            role="toolbar"
            aria-label={t('board.brushColors')}
          >
            <ColorPad
              activeBrushColor={activeBrushColor}
              paused={paused}
              won={won}
              selectedHasAnyColors={selectedHasAnyColors}
              applyBrushColor={applyBrushColor}
              clearSelectedBrushColors={clearSelectedBrushColors}
              onMomentaryButtonClick={handleMomentaryButtonClick}
              t={t}
            />
          </div>
        </div>
      )
    }
    return (
      <div className="input-pad-switcher input-pad-switcher--numbers">
        <div
          className="number-pad"
          role="toolbar"
          aria-label={t('board.numberEntry')}
        >
          <NumberPad
            remaining={remaining}
            notesMode={notesMode}
            paused={paused}
            won={won}
            candidateSelectedDigit={candidateSelectedDigit}
            applyDigit={applyDigit}
            toggleReferenceDigitHighlight={toggleReferenceDigitHighlight}
            haptic={haptic}
            onTriggerHaptic={onTriggerHaptic}
            onTriggerErrorHaptic={onTriggerErrorHaptic}
            touchFiredRef={touchFiredRef}
            interactionDisabled
            t={t}
          />
        </div>
      </div>
    )
  }

  const lowerPadOverlayView = lowerPadTransition?.from ?? null

  return (
    <div className={`input-pad-switcher input-pad-switcher--${visibleLowerPad}`}>
      <div
        className={`number-pad input-pad__panel ${lowerPadPanelClass('numbers', 'active')}`}
        role="toolbar"
        aria-label={t('board.numberEntry')}
        aria-hidden={visibleLowerPad !== 'numbers'}
      >
        <NumberPad
          remaining={remaining}
          notesMode={notesMode}
          paused={paused}
          won={won}
          candidateSelectedDigit={candidateSelectedDigit}
          applyDigit={applyDigit}
          toggleReferenceDigitHighlight={toggleReferenceDigitHighlight}
          haptic={haptic}
          onTriggerHaptic={onTriggerHaptic}
          onTriggerErrorHaptic={onTriggerErrorHaptic}
          touchFiredRef={touchFiredRef}
          t={t}
        />
      </div>
      {lowerPadOverlayView === 'numbers' && (
        <div
          className={`number-pad input-pad__panel input-pad__panel--overlay ${lowerPadPanelClass('numbers', 'overlay')}`}
          role="presentation"
          aria-hidden="true"
        >
          <NumberPad
            remaining={remaining}
            notesMode={notesMode}
            paused={paused}
            won={won}
            candidateSelectedDigit={candidateSelectedDigit}
            applyDigit={applyDigit}
            toggleReferenceDigitHighlight={toggleReferenceDigitHighlight}
            haptic={haptic}
            onTriggerHaptic={onTriggerHaptic}
            onTriggerErrorHaptic={onTriggerErrorHaptic}
            touchFiredRef={touchFiredRef}
            tabIndex={-1}
            t={t}
          />
        </div>
      )}
      <div
        className={`number-pad brush-color-pad input-pad__panel ${lowerPadPanelClass('colors', 'active')}`}
        role="toolbar"
        aria-label={t('board.brushColors')}
        aria-hidden={visibleLowerPad !== 'colors'}
      >
        <ColorPad
          activeBrushColor={activeBrushColor}
          paused={paused}
          won={won}
          selectedHasAnyColors={selectedHasAnyColors}
          applyBrushColor={applyBrushColor}
          clearSelectedBrushColors={clearSelectedBrushColors}
          onMomentaryButtonClick={handleMomentaryButtonClick}
          t={t}
        />
      </div>
      {lowerPadOverlayView === 'colors' && (
        <div
          className={`number-pad brush-color-pad input-pad__panel input-pad__panel--overlay ${lowerPadPanelClass('colors', 'overlay')}`}
          role="presentation"
          aria-hidden="true"
        >
          <ColorPad
            activeBrushColor={activeBrushColor}
            paused={paused}
            won={won}
            selectedHasAnyColors={selectedHasAnyColors}
            applyBrushColor={applyBrushColor}
            clearSelectedBrushColors={clearSelectedBrushColors}
            onMomentaryButtonClick={handleMomentaryButtonClick}
            tabIndex={-1}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
