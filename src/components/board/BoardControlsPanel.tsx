import React from 'react'
import { FaEraser } from 'react-icons/fa'
import { FaBrush } from 'react-icons/fa6'
import { BsThreeDots } from 'react-icons/bs'
import { GiMagicBroom } from 'react-icons/gi'
import { MdArrowBack, MdHistory, MdLightbulbOutline, MdMoreHoriz, MdUndo } from 'react-icons/md'
import { PiFlagCheckeredFill } from 'react-icons/pi'
import { TbNumbers } from 'react-icons/tb'
import type { BrushColorId } from '../../store/gameTypes'
import type {
  LowerPadTransition,
  LowerPadView,
  ToolTrayAnimatedTarget,
  ToolTraySequence,
  ToolTrayTransition,
  ToolTrayView,
} from './boardUtils'
import { BRUSH_COLORS } from './boardUtils'
import ColorPad from './ColorPad'
import NumberPad from './NumberPad'
import ToolActionsPad from './ToolActionsPad'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type RequiredTechniquesSummary = {
  technique: string
  notation: string
}

type Props = {
  paused: boolean
  won: boolean
  haptic?: boolean
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
  historyToolMode: boolean
  moreToolMode: boolean
  eraserMode: boolean
  notesMode: boolean
  brushMode: boolean
  pencilMode?: boolean
  candidateToolMode: boolean
  visibleToolTray: ToolTrayView
  toolTrayTransition: ToolTrayTransition | null
  toolTraySequence: ToolTraySequence | null
  visibleLowerPad: LowerPadView
  lowerPadTransition: LowerPadTransition | null
  toolTrayRef: React.MutableRefObject<HTMLDivElement | null>
  mainNotesButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  mainBrushButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  mainMoreButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  activeNotesButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  activeBrushButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  measureMainNotesButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  measureMainBrushButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  measureMainMoreButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  measureNotesButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  measureBrushButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  hasAnyColors: boolean
  hasAnyNotes: boolean
  undoDisabled: boolean
  redoDisabled: boolean
  hasAnyFillableCell: boolean
  hasSingleCandidates: boolean
  requiredTechniquesLoading: boolean
  requiredTechniquesOpen: boolean
  requiredTechniquesSummary: RequiredTechniquesSummary | null
  remaining: Record<number, number>
  candidateSelectedDigit: number | null
  selectedHasAnyColors: boolean
  activeBrushColor: BrushColorId
  touchFiredRef: React.MutableRefObject<string | null>
  applyDigit: (d: number) => boolean
  toggleReferenceDigitHighlight: (d: number) => void
  applyBrushColor: (colorId: BrushColorId) => void
  clearSelectedBrushColors: () => boolean
  clearAllColors: () => boolean
  onClearAllNotes: () => boolean
  eraserColorPickerMode: boolean
  onToggleEraserColorPicker: () => void
  onClearSingleColor: (colorId: BrushColorId) => boolean
  undo: () => boolean
  redo: () => boolean
  fillAllCandidates: () => boolean
  applySingleCandidatesToDigits: () => boolean
  showRequiredTechniques: () => Promise<unknown>
  openRequiredTechniquesSidebar: () => void
  hideRequiredTechniquesSummary: () => void
  toggleHistoryTools: () => void
  toggleMoreTools: () => void
  toggleEraserMode: () => void
  toggleNotesTools: () => void
  toggleBrushTools: () => void
  toggleCandidateTools: () => void
  onMomentaryButtonClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => boolean | void,
    alwaysHaptic?: boolean,
  ) => void
  onModeButtonClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => void
  t: TFunc
}

function renderToolTrayButtonIcon(target: 'history' | 'eraser' | 'more' | ToolTrayAnimatedTarget) {
  switch (target) {
    case 'history':
      return <MdHistory size={22} />
    case 'eraser':
      return <FaEraser size={22} />
    case 'more':
      return <BsThreeDots size={20} />
    case 'notes':
      return <TbNumbers size={20} />
    case 'brush':
      return <FaBrush size={20} />
  }
}

function toolToggleClass(target: ToolTrayAnimatedTarget) {
  switch (target) {
    case 'notes':
      return 'notes-toggle'
    case 'brush':
      return 'brush-toggle'
  }
}

export default function BoardControlsPanel({
  paused,
  won,
  haptic,
  onTriggerHaptic,
  onTriggerErrorHaptic,
  historyToolMode,
  moreToolMode,
  eraserMode,
  notesMode,
  brushMode,
  pencilMode,
  candidateToolMode,
  visibleToolTray,
  toolTrayTransition,
  toolTraySequence,
  visibleLowerPad,
  lowerPadTransition,
  toolTrayRef,
  mainNotesButtonRef,
  mainBrushButtonRef,
  mainMoreButtonRef,
  activeNotesButtonRef,
  activeBrushButtonRef,
  measureMainNotesButtonRef,
  measureMainBrushButtonRef,
  measureMainMoreButtonRef,
  measureNotesButtonRef,
  measureBrushButtonRef,
  hasAnyColors,
  hasAnyNotes,
  undoDisabled,
  redoDisabled,
  hasAnyFillableCell,
  hasSingleCandidates,
  requiredTechniquesLoading,
  requiredTechniquesOpen,
  requiredTechniquesSummary,
  remaining,
  candidateSelectedDigit,
  selectedHasAnyColors,
  activeBrushColor,
  touchFiredRef,
  applyDigit,
  toggleReferenceDigitHighlight,
  applyBrushColor,
  clearSelectedBrushColors,
  clearAllColors,
  onClearAllNotes,
  eraserColorPickerMode,
  onToggleEraserColorPicker,
  onClearSingleColor,
  undo,
  redo,
  fillAllCandidates,
  applySingleCandidatesToDigits,
  showRequiredTechniques,
  openRequiredTechniquesSidebar,
  hideRequiredTechniquesSummary,
  toggleHistoryTools,
  toggleMoreTools,
  toggleEraserMode,
  toggleNotesTools,
  toggleBrushTools,
  toggleCandidateTools,
  onMomentaryButtonClick,
  onModeButtonClick,
  t,
}: Props) {
  const toolTrayOverlayView = toolTrayTransition?.from ?? null
  const lowerPadOverlayView = lowerPadTransition?.from ?? null
  const stagedToolTarget = toolTraySequence?.target ?? null
  const stagedToolDirection = toolTraySequence?.direction ?? null
  const stagedToolPhase = toolTraySequence?.phase ?? null
  const isToolTrayOpening = stagedToolDirection === 'forward'
  const isToolTrayClosing = stagedToolDirection === 'backward'
  const isToolTrayFadingOut = stagedToolPhase === 'fade-out'
  const isToolTrayMoving = stagedToolPhase === 'move'
  const isToolTrayFadingIn = stagedToolPhase === 'fade-in'

  function toolTrayPanelClass(view: ToolTrayView, layer: 'active' | 'overlay') {
    if (toolTraySequence !== null) {
      if (layer === 'overlay') return 'tool-tray__panel--hidden'
      if (isToolTrayFadingOut) {
        const outgoingView: ToolTrayView =
          stagedToolDirection === 'backward' && stagedToolTarget !== null ? stagedToolTarget : 'main'
        return view === outgoingView ? 'tool-tray__panel--active' : 'tool-tray__panel--hidden'
      }
      return visibleToolTray === view ? 'tool-tray__panel--active' : 'tool-tray__panel--hidden'
    }
    if (layer === 'active') {
      if (visibleToolTray !== view) return 'tool-tray__panel--hidden'
      if (toolTrayTransition?.to === view) {
        return toolTrayTransition.direction === 'forward'
          ? 'tool-tray__panel--enter-right'
          : 'tool-tray__panel--enter-left'
      }
      return 'tool-tray__panel--active'
    }

    if (toolTrayOverlayView !== view || toolTrayTransition === null) {
      return 'tool-tray__panel--hidden'
    }
    return toolTrayTransition.direction === 'forward'
      ? 'tool-tray__panel--leave-left'
      : 'tool-tray__panel--leave-right'
  }

  function lowerPadPanelClass(view: LowerPadView, layer: 'active' | 'overlay') {
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

  function mainToolButtonClass(button: 'clear' | 'notes' | 'brush' | 'candidates' | 'history' | 'undo' | 'more') {
    const classes = ['tool-tray__main-button']
    const fadingTarget = stagedToolTarget !== null && button === stagedToolTarget
    if (isToolTrayOpening && isToolTrayFadingOut) {
      if (fadingTarget) classes.push('tool-tray__main-button--selected')
      else classes.push('tool-tray__main-button--fading')
    }
    if (isToolTrayOpening && (isToolTrayMoving || isToolTrayFadingIn) && fadingTarget) {
      classes.push('tool-tray__main-button--hidden')
    }
    return classes.join(' ')
  }

  function mainToolPanelClass() {
    if (isToolTrayClosing && isToolTrayFadingIn) {
      return 'tool-tray__panel--main-fade-in'
    }
    return ''
  }

  function isToolTargetClosing(target: ToolTrayAnimatedTarget) {
    return isToolTrayClosing && stagedToolTarget === target
  }

  function subtoolContentClass(target: ToolTrayAnimatedTarget) {
    const classes = ['tool-tray__content', `tool-tray__content--${target}`]
    if (isToolTrayClosing && isToolTrayFadingOut && stagedToolTarget === target) {
      classes.push('tool-tray__content--fade-out')
    }
    if (isToolTrayMoving && stagedToolTarget === target) {
      classes.push('tool-tray__content--hidden')
    }
    if (isToolTrayOpening && isToolTrayFadingIn && stagedToolTarget === target) {
      classes.push('tool-tray__content--fade-in')
    }
    return classes.join(' ')
  }

  return (
    <div className="controls-panel">
      <div ref={toolTrayRef} className={`tool-tray tool-tray--${visibleToolTray}`} aria-live="polite">
        <div className="tool-tray__measure" aria-hidden="true">
          <div className="num-pad-toolbar tool-tray__panel">
            <button type="button" className="num-key clear" tabIndex={-1}>
              <MdUndo size={24} />
            </button>
            <button type="button" className={`num-key clear${eraserMode ? ' eraser-toggle--active' : ''}`} tabIndex={-1}>
              {renderToolTrayButtonIcon('eraser')}
            </button>
            <button
              ref={measureMainNotesButtonRef}
              type="button"
              className="num-key notes-toggle"
              tabIndex={-1}
            >
              {renderToolTrayButtonIcon('notes')}
            </button>
            <button
              ref={measureMainBrushButtonRef}
              type="button"
              className="num-key brush-toggle"
              tabIndex={-1}
            >
              {renderToolTrayButtonIcon('brush')}
            </button>
            <button
              type="button"
              className="num-key candidates-toggle"
              tabIndex={-1}
            >
              <MdLightbulbOutline size={20} />
            </button>
            <button
              ref={measureMainMoreButtonRef}
              type="button"
              className="num-key clear"
              tabIndex={-1}
            >
              {renderToolTrayButtonIcon('more')}
            </button>
          </div>
          <div className="num-pad-toolbar tool-tray__panel tool-tray__panel--sub">
            <button
              ref={measureNotesButtonRef}
              type="button"
              className="num-key notes-toggle notes-toggle--active"
              tabIndex={-1}
            >
              {renderToolTrayButtonIcon('notes')}
            </button>
            <div className="tool-tray__content tool-tray__content--notes">
              <button type="button" className="num-key clear" tabIndex={-1}><MdUndo size={24} /></button>
            </div>
          </div>
          <div className="num-pad-toolbar tool-tray__panel tool-tray__panel--sub">
            <button
              ref={measureBrushButtonRef}
              type="button"
              className="num-key brush-toggle brush-toggle--active"
              tabIndex={-1}
            >
              {renderToolTrayButtonIcon('brush')}
            </button>
            <div className="tool-tray__content tool-tray__content--brush">
              <button type="button" className="num-key clear" tabIndex={-1}><MdUndo size={24} /></button>
              <button type="button" className="num-key clear" tabIndex={-1}>{renderToolTrayButtonIcon('notes')}</button>
              <button type="button" className="num-key clear" tabIndex={-1}><PiFlagCheckeredFill size={18} /></button>
              <button type="button" className="num-key clear" tabIndex={-1}><GiMagicBroom size={18} /></button>
            </div>
          </div>
        </div>
        {toolTraySequence !== null && stagedToolPhase === 'move' && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`tool-tray__mover num-key ${toolToggleClass(toolTraySequence.target)}${stagedToolDirection === 'forward' ? ' tool-tray__mover--selected' : ''}${toolTraySequence.moveActive ? ' tool-tray__mover--active' : ''}`}
            style={{
              left: `${toolTraySequence.mover.left}px`,
              top: `${toolTraySequence.mover.top}px`,
              width: `${toolTraySequence.mover.width}px`,
              height: `${toolTraySequence.mover.height}px`,
              transform: toolTraySequence.moveActive
                ? `translate(${toolTraySequence.mover.deltaX}px, ${toolTraySequence.mover.deltaY}px)`
                : 'translate(0, 0)',
            }}
          >
            {renderToolTrayButtonIcon(toolTraySequence.target)}
          </button>
        )}
        <div
          className={`num-pad-toolbar tool-tray__panel ${toolTrayPanelClass('main', 'active')} ${mainToolPanelClass()}`.trim()}
          role="toolbar"
          aria-label={t('board.gameTools')}
          aria-hidden={visibleToolTray !== 'main'}
        >
          <button
            className={`num-key clear ${mainToolButtonClass('undo')}`}
            type="button"
            aria-label={t('board.undo')}
            disabled={undoDisabled}
            onClick={(event) => onMomentaryButtonClick(event, undo, true)}
          >
            <MdUndo size={24} />
          </button>
          <button
            className={`num-key clear${eraserMode ? ' eraser-toggle--active' : ''} ${mainToolButtonClass('clear')}`}
            type="button"
            aria-label={t('board.eraserMode')}
            aria-pressed={eraserMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleEraserMode)}
          >
            {renderToolTrayButtonIcon('eraser')}
          </button>
          <button
            type="button"
            ref={mainNotesButtonRef}
            className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''} ${mainToolButtonClass('notes')}`}
            aria-label={t('board.toggleNotesMode')}
            aria-pressed={notesMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleNotesTools)}
          >
            {renderToolTrayButtonIcon('notes')}
          </button>
          <button
            type="button"
            ref={mainBrushButtonRef}
            className={`num-key brush-toggle${brushMode ? ' brush-toggle--active' : ''} ${mainToolButtonClass('brush')}`}
            aria-label={t('board.toggleBrushMode')}
            aria-pressed={brushMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleBrushTools)}
          >
            {renderToolTrayButtonIcon('brush')}
          </button>
          <button
            type="button"
            className={`num-key candidates-toggle${candidateToolMode ? ' candidates-toggle--active' : ''} ${mainToolButtonClass('candidates')}`}
            aria-label={t('board.toggleCandidateTools')}
            aria-pressed={candidateToolMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleCandidateTools)}
          >
            <MdLightbulbOutline size={20} />
          </button>
          <button
            type="button"
            ref={mainMoreButtonRef}
            className={`num-key clear${moreToolMode ? ' more-toggle--active' : ''} ${mainToolButtonClass('more')}`}
            aria-label={t('board.toggleMoreTools')}
            aria-pressed={moreToolMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleMoreTools)}
          >
            {renderToolTrayButtonIcon('more')}
          </button>
        </div>
        {toolTrayOverlayView === 'main' && (
          <div
            className={`num-pad-toolbar tool-tray__panel tool-tray__panel--overlay ${toolTrayPanelClass('main', 'overlay')}`}
            role="presentation"
            aria-hidden="true"
          >
            <button type="button" className="num-key clear" tabIndex={-1}>
              <MdUndo size={24} />
            </button>
            <button type="button" className={`num-key clear${eraserMode ? ' eraser-toggle--active' : ''}`} tabIndex={-1}>
              {renderToolTrayButtonIcon('eraser')}
            </button>
            <button type="button" className="num-key notes-toggle" tabIndex={-1}>
              {renderToolTrayButtonIcon('notes')}
            </button>
            <button type="button" className="num-key brush-toggle" tabIndex={-1}>
              {renderToolTrayButtonIcon('brush')}
            </button>
            <button type="button" className="num-key candidates-toggle" tabIndex={-1}>
              <MdLightbulbOutline size={20} />
            </button>
            <button type="button" className={`num-key clear${moreToolMode ? ' more-toggle--active' : ''}`} tabIndex={-1}>
              {renderToolTrayButtonIcon('more')}
            </button>
          </div>
        )}
        <div
          className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub ${toolTrayPanelClass('notes', 'active')}`}
          role="toolbar"
          aria-label={t('board.toggleNotesMode')}
          aria-hidden={visibleToolTray !== 'notes'}
        >
          <button
            ref={activeNotesButtonRef}
            type="button"
            className={`num-key notes-toggle notes-toggle--active${isToolTargetClosing('notes') ? ' tool-tray__subtoggle--closing' : ''}`}
            aria-label={t('board.closeCandidatePainter')}
            aria-pressed={notesMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleNotesTools)}
          >
            {renderToolTrayButtonIcon('notes')}
          </button>
          <div className={subtoolContentClass('notes')}>
            <button
              type="button"
              className="num-key clear"
              aria-label={t('board.undo')}
              disabled={undoDisabled}
              onClick={(event) => onMomentaryButtonClick(event, undo, true)}
            >
              <MdUndo size={24} />
            </button>
          </div>
        </div>
        <div
          className={`num-pad-toolbar tool-tray__panel tool-tray__panel--sub ${toolTrayPanelClass('brush', 'active')}`}
          role="toolbar"
          aria-label={t('board.toggleBrushMode')}
          aria-hidden={visibleToolTray !== 'brush'}
        >
          <button
            ref={activeBrushButtonRef}
            type="button"
            className={`num-key brush-toggle brush-toggle--active${isToolTargetClosing('brush') ? ' tool-tray__subtoggle--closing' : ''}`}
            aria-label={t('board.closeCandidatePainter')}
            aria-pressed={brushMode}
            disabled={paused || won}
            onClick={(event) => onModeButtonClick(event, toggleBrushTools)}
          >
            {renderToolTrayButtonIcon('brush')}
          </button>
          <div className={subtoolContentClass('brush')}>
            <button
              type="button"
              className="num-key clear"
              aria-label={t('board.undo')}
              disabled={undoDisabled}
              onClick={(event) => onMomentaryButtonClick(event, undo, true)}
            >
              <MdUndo size={24} />
            </button>
            <button
              type="button"
              className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''}`}
              aria-label={t('board.toggleNotesMode')}
              aria-pressed={notesMode}
              disabled={paused || won}
              onClick={(event) => onModeButtonClick(event, toggleNotesTools)}
            >
              {renderToolTrayButtonIcon('notes')}
            </button>
            <button
              type="button"
              className="num-key clear"
              aria-label={t('board.brushColorRemover')}
              disabled={paused || won || !selectedHasAnyColors}
              onClick={(event) => onMomentaryButtonClick(event, clearSelectedBrushColors, true)}
            >
              <PiFlagCheckeredFill size={18} />
            </button>
            <button
              type="button"
              className="num-key clear"
              aria-label={t('board.cleanColors')}
              disabled={paused || won || !hasAnyColors}
              onClick={(event) => onMomentaryButtonClick(event, clearAllColors, true)}
            >
              <GiMagicBroom size={18} />
            </button>
          </div>
        </div>
      </div>
      {historyToolMode ? (
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
              requiredTechniquesOpen={requiredTechniquesOpen}
              haptic={haptic ?? false}
              onTriggerHaptic={onTriggerHaptic}
              onClearAllColors={clearAllColors}
              onUndo={undo}
              onRedo={redo}
              onFillAllCandidates={fillAllCandidates}
              onApplySingleCandidates={applySingleCandidatesToDigits}
              onShowRequiredTechniques={showRequiredTechniques}
              onToggleHistoryTools={toggleHistoryTools}
              onMomentaryButtonClick={onMomentaryButtonClick}
              onModeButtonClick={onModeButtonClick}
              t={t}
            />
          </div>
        </div>
      ) : eraserMode ? (
        <div className="input-pad-switcher input-pad-switcher--eraser-actions">
          {eraserColorPickerMode ? (
            <div className="number-pad brush-color-pad" role="toolbar" aria-label={t('board.eraserColorPicker')}>
              <button
                type="button"
                className="brush-color-button brush-color-button--clear"
                aria-label={t('board.backToEraserActions')}
                disabled={paused || won}
                onClick={(event) => onModeButtonClick(event, onToggleEraserColorPicker)}
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
                  onClick={(event) => onMomentaryButtonClick(event, () => { onClearSingleColor(color.id as BrushColorId); onToggleEraserColorPicker() }, true)}
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
                requiredTechniquesOpen={requiredTechniquesOpen}
                haptic={haptic ?? false}
                onTriggerHaptic={onTriggerHaptic}
                onClearAllColors={clearAllColors}
                onClearAllNotes={onClearAllNotes}
                onUndo={undo}
                onRedo={redo}
                onFillAllCandidates={fillAllCandidates}
                onApplySingleCandidates={applySingleCandidatesToDigits}
                onShowRequiredTechniques={showRequiredTechniques}
                onToggleHistoryTools={toggleHistoryTools}
                onToggleEraserColorPicker={onToggleEraserColorPicker}
                onMomentaryButtonClick={onMomentaryButtonClick}
                onModeButtonClick={onModeButtonClick}
                t={t}
              />
            </div>
          )}
        </div>
      ) : candidateToolMode ? (
        <div className="input-pad-switcher input-pad-switcher--candidate-actions">
          {requiredTechniquesSummary ? (
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
                      disabled={paused || won || requiredTechniquesOpen}
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
                requiredTechniquesOpen={requiredTechniquesOpen}
                haptic={haptic ?? false}
                onTriggerHaptic={onTriggerHaptic}
                onClearAllColors={clearAllColors}
                onUndo={undo}
                onRedo={redo}
                onFillAllCandidates={fillAllCandidates}
                onApplySingleCandidates={applySingleCandidatesToDigits}
                onShowRequiredTechniques={showRequiredTechniques}
                onToggleHistoryTools={toggleHistoryTools}
                onMomentaryButtonClick={onMomentaryButtonClick}
                onModeButtonClick={onModeButtonClick}
                t={t}
              />
            </div>
          )}
        </div>
      ) : moreToolMode ? (
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
              requiredTechniquesOpen={requiredTechniquesOpen}
              haptic={haptic ?? false}
              onTriggerHaptic={onTriggerHaptic}
              onClearAllColors={clearAllColors}
              onUndo={undo}
              onRedo={redo}
              onFillAllCandidates={fillAllCandidates}
              onApplySingleCandidates={applySingleCandidatesToDigits}
              onShowRequiredTechniques={showRequiredTechniques}
              onToggleHistoryTools={toggleHistoryTools}
              onMomentaryButtonClick={onMomentaryButtonClick}
              onModeButtonClick={onModeButtonClick}
              t={t}
            />
          </div>
        </div>
      ) : pencilMode ? (
        brushMode ? (
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
                onMomentaryButtonClick={onMomentaryButtonClick}
                t={t}
              />
            </div>
          </div>
        ) : (
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
                haptic={haptic ?? false}
                onTriggerHaptic={onTriggerHaptic}
                onTriggerErrorHaptic={onTriggerErrorHaptic}
                touchFiredRef={touchFiredRef}
                interactionDisabled
                t={t}
              />
            </div>
          </div>
        )
      ) : (
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
              haptic={haptic ?? false}
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
                haptic={haptic ?? false}
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
              onMomentaryButtonClick={onMomentaryButtonClick}
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
                onMomentaryButtonClick={onMomentaryButtonClick}
                tabIndex={-1}
                t={t}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
