import React from 'react'
import { FaEraser } from 'react-icons/fa'
import { FaBrush } from 'react-icons/fa6'
import { BsThreeDots } from 'react-icons/bs'
import { GiMagicBroom } from 'react-icons/gi'
import { MdHistory, MdLightbulbOutline, MdUndo } from 'react-icons/md'
import { PiFlagCheckeredFill } from 'react-icons/pi'
import { TbNumbers } from 'react-icons/tb'
import { useAppSelector } from '../../store/hooks'
import { useToolTray } from './hooks/useToolTray'
import { useHistoryControls } from './hooks/useHistoryControls'
import { useBrushActions } from './hooks/useBrushActions'
import type {
  ToolTrayAnimatedTarget,
  ToolTrayView,
} from './boardUtils'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type Props = {
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
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

export default function ToolTray({
  onTriggerHaptic,
  onTriggerErrorHaptic,
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
  t,
}: Props) {
  const paused = useAppSelector(s => s.game.paused)
  const won = useAppSelector(s => s.game.won)
  const haptic = useAppSelector(s => s.settings.haptic)
  const eraserMode = useAppSelector(s => s.game.eraserMode)
  const notesMode = useAppSelector(s => s.game.notesMode)
  const brushMode = useAppSelector(s => s.game.brushMode)
  const candidateToolMode = useAppSelector(s => s.game.candidateToolMode)
  const moreToolMode = useAppSelector(s => s.game.moreToolMode)
  const visibleToolTray = useAppSelector(s => s.boardUi.visibleToolTray)
  const toolTrayTransition = useAppSelector(s => s.boardUi.toolTrayTransition)
  const toolTraySequence = useAppSelector(s => s.boardUi.toolTraySequence)

  const { selectedHasAnyColors, hasAnyColors, clearAllColors, clearSelectedBrushColors } = useBrushActions()
  const { undo, undoDisabled } = useHistoryControls()
  const {
    toggleNotesTools,
    toggleBrushTools,
    toggleEraserMode,
    toggleCandidateTools,
    toggleHistoryTools,
    toggleMoreTools,
  } = useToolTray()

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

  const toolTrayOverlayView = toolTrayTransition?.from ?? null
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
          onClick={(event) => handleMomentaryButtonClick(event, undo, true)}
        >
          <MdUndo size={24} />
        </button>
        <button
          className={`num-key clear${eraserMode ? ' eraser-toggle--active' : ''} ${mainToolButtonClass('clear')}`}
          type="button"
          aria-label={t('board.eraserMode')}
          aria-pressed={eraserMode}
          disabled={paused || won}
          onClick={(event) => handleModeButtonClick(event, toggleEraserMode)}
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
          onClick={(event) => handleModeButtonClick(event, toggleNotesTools)}
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
          onClick={(event) => handleModeButtonClick(event, toggleBrushTools)}
        >
          {renderToolTrayButtonIcon('brush')}
        </button>
        <button
          type="button"
          className={`num-key candidates-toggle${candidateToolMode ? ' candidates-toggle--active' : ''} ${mainToolButtonClass('candidates')}`}
          aria-label={t('board.toggleCandidateTools')}
          aria-pressed={candidateToolMode}
          disabled={paused || won}
          onClick={(event) => handleModeButtonClick(event, toggleCandidateTools)}
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
          onClick={(event) => handleModeButtonClick(event, toggleMoreTools)}
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
          onClick={(event) => handleModeButtonClick(event, toggleNotesTools)}
        >
          {renderToolTrayButtonIcon('notes')}
        </button>
        <div className={subtoolContentClass('notes')}>
          <button
            type="button"
            className="num-key clear"
            aria-label={t('board.undo')}
            disabled={undoDisabled}
            onClick={(event) => handleMomentaryButtonClick(event, undo, true)}
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
          onClick={(event) => handleModeButtonClick(event, toggleBrushTools)}
        >
          {renderToolTrayButtonIcon('brush')}
        </button>
        <div className={subtoolContentClass('brush')}>
          <button
            type="button"
            className="num-key clear"
            aria-label={t('board.undo')}
            disabled={undoDisabled}
            onClick={(event) => handleMomentaryButtonClick(event, undo, true)}
          >
            <MdUndo size={24} />
          </button>
          <button
            type="button"
            className={`num-key notes-toggle${notesMode ? ' notes-toggle--active' : ''}`}
            aria-label={t('board.toggleNotesMode')}
            aria-pressed={notesMode}
            disabled={paused || won}
            onClick={(event) => handleModeButtonClick(event, toggleNotesTools)}
          >
            {renderToolTrayButtonIcon('notes')}
          </button>
          <button
            type="button"
            className="num-key clear"
            aria-label={t('board.brushColorRemover')}
            disabled={paused || won || !selectedHasAnyColors}
            onClick={(event) => handleMomentaryButtonClick(event, clearSelectedBrushColors, true)}
          >
            <PiFlagCheckeredFill size={18} />
          </button>
          <button
            type="button"
            className="num-key clear"
            aria-label={t('board.cleanColors')}
            disabled={paused || won || !hasAnyColors}
            onClick={(event) => handleMomentaryButtonClick(event, clearAllColors, true)}
          >
            <GiMagicBroom size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
