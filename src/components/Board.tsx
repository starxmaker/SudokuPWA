import React, { useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setSelected, fillAllCandidates, applySingleCandidatesToDigits } from '../store/gameSlice'
import { selectCell as selectCellAction, focusCell as focusCellAction } from '../store/gameSlice'
import { setCandidateOverlayPreviewDigit, setBoardUiCandidateSelectedDigit, closeCandidateOverlay } from '../store/boardUiSlice'
import { useI18n } from '../utils/i18n'
import { hasCellBrushColorsAt, hasAnyBrushColorsOnBoard, formatTime } from './board/boardUtils'
import PencilOverlay from './PencilOverlay'
import BoardControlsPanel from './board/BoardControlsPanel'
import BoardGrid from './board/BoardGrid'
import BoardSurface from './board/BoardSurface'
import VictoryOverlay from './board/VictoryOverlay'
import CandidateOverlayComp from './board/CandidateOverlay'
import TechniquesSidebar from './board/TechniquesSidebar'
import {
  useGameLifecycle,
  useBoardLayout,
  useKeyboardInput,
  useDigitInput,
  useBrushActions,
  useCandidateOverlay,
  useHistoryControls,
  useToolTray,
  useTechniques,
  useNewGameActions,
  useAvailabilityCallbacks,
} from './board/hooks'

type Props = {
  onBack?: () => void
  onNew?: () => void
  onShare?: () => void
  onTriggerHaptic?: () => void
  onTriggerErrorHaptic?: () => void
}

export default function Board({
  onBack,
  onNew,
  onShare,
  onTriggerHaptic,
  onTriggerErrorHaptic,
}: Props) {
  const { localizeDifficultyLabel, t } = useI18n()
  const dispatch = useAppDispatch()
  const game = useAppSelector(s => s.game)
  const boardUi = useAppSelector(s => s.boardUi)
  const settings = useAppSelector(s => s.settings)

  const { paused, won, updatePaused, elapsed } = useGameLifecycle()
  const { boardRef, boardPixelWidth, isLandscape } = useBoardLayout()
  const digit = useDigitInput()
  const brush = useBrushActions()
  const overlay = useCandidateOverlay()
  const history = useHistoryControls()
  const tray = useToolTray()
  const techniques = useTechniques(game.current ?? [], game.notes)
  const newGameActions = useNewGameActions(techniques.techniquesRef)

  useKeyboardInput(digit.applyDigit, digit.clearCell)
  useAvailabilityCallbacks()

  const touchFiredRef = useRef<'ok' | 'error' | 'pending-ok' | 'pending-error' | 'handled-ok' | 'handled-error' | null>(null)
  const toolTrayRef = useRef<HTMLDivElement | null>(null)
  const mainNotesButtonRef = useRef<HTMLButtonElement | null>(null)
  const mainBrushButtonRef = useRef<HTMLButtonElement | null>(null)
  const mainMoreButtonRef = useRef<HTMLButtonElement | null>(null)
  const activeNotesButtonRef = useRef<HTMLButtonElement | null>(null)
  const activeBrushButtonRef = useRef<HTMLButtonElement | null>(null)
  const measureMainNotesButtonRef = useRef<HTMLButtonElement | null>(null)
  const measureMainBrushButtonRef = useRef<HTMLButtonElement | null>(null)
  const measureMainMoreButtonRef = useRef<HTMLButtonElement | null>(null)
  const measureNotesButtonRef = useRef<HTMLButtonElement | null>(null)
  const measureBrushButtonRef = useRef<HTMLButtonElement | null>(null)

  function handleMomentaryButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => boolean,
    alwaysHaptic = false,
  ) {
    const changed = action()
    event.currentTarget.blur()
    if (settings.haptic && (alwaysHaptic || changed)) onTriggerHaptic?.()
  }

  function handleModeButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    action()
    event.currentTarget.blur()
    if (settings.haptic) onTriggerHaptic?.()
  }

  if (!game.current || game.current.length === 0) return null

  const isClue = (r: number, c: number): boolean =>
    game.initial !== null && game.initial[r][c] !== 0

  const selectedDigit =
    game.selected !== null ? game.current[game.selected.r][game.selected.c] : 0
  const highlightedDigit = overlay.candidateOverlayPreviewDigit ?? overlay.candidateSelectedDigit ?? game.candidateSelectedDigit ?? selectedDigit
  const selectedHasCellColor =
    game.selected !== null && game.cellColors[game.selected.r][game.selected.c].length > 0
  const selectedHasCandidateColors =
    game.selected !== null && game.candidateColors[game.selected.r][game.selected.c].some(color => color.length > 0)
  const selectedHasAnyColors = selectedHasCellColor || selectedHasCandidateColors
  const overlayCellNotes = overlay.candidateOverlay ? game.notes[overlay.candidateOverlay.r][overlay.candidateOverlay.c] : []
  const overlayHasCellColor =
    overlay.candidateOverlay !== null && game.cellColors[overlay.candidateOverlay.r][overlay.candidateOverlay.c].length > 0
  const hasSingleCandidates = game.notes.some((row, r) =>
    row.some((cell, c) => !isClue(r, c) && game.current![r][c] === 0 && cell.length === 1)
  )
  const hasAnyFillableCell = game.current.some((row, r) =>
    row.some((n, c) => !isClue(r, c) && n === 0 && game.notes[r][c].length === 0)
  )
  const activeFlaggedColorCell =
    settings.firstColorFlag &&
    game.flaggedColorCell !== null &&
    hasCellBrushColorsAt(game.cellColors, game.candidateColors, game.flaggedColorCell.r, game.flaggedColorCell.c)
      ? game.flaggedColorCell
      : null

  const candidateBrushMode = game.brushMode && settings.paintingScope === 'candidate'
  const displayedDifficulty = localizeDifficultyLabel(game.puzzleMetadata?.difficultyLabel) ?? t('board.customDifficulty')

  return (
    <div className="game-layout game-layout--board">
      {!onBack && <div style={{alignSelf:'flex-end'}}><button type="button" onClick={newGameActions.newGame}>{t('board.new')}</button></div>}
      <div className={`game-main game-main--board${techniques.techniquesDockedOpen ? ' game-main--with-techniques-docked' : ''}`}>
        <BoardSurface
          displayedDifficulty={displayedDifficulty}
          boardPixelWidth={boardPixelWidth}
          elapsed={elapsed}
          paused={paused}
          won={won}
          pencilMode={settings.pencilMode}
          coordinateLabels={settings.coordinateLabels}
          boardRef={boardRef}
          onTogglePause={() => {
            updatePaused(!paused)
          }}
          onResume={() => {
            updatePaused(false)
          }}
          t={t}
        >
          <BoardGrid
            internalPuzzle={game.current}
            notes={game.notes}
            cellColors={game.cellColors}
            candidateColors={game.candidateColors}
            solutionGrid={game.solution}
            selected={game.selected}
            highlightedDigit={highlightedDigit}
            activeFlaggedColorCell={activeFlaggedColorCell}
            paused={paused}
            won={won}
            autoCheck={settings.autoCheck}
            brushMode={game.brushMode}
            eraserMode={game.eraserMode}
            pencilMode={settings.pencilMode}
            candidateBrushMode={candidateBrushMode}
            haptic={settings.haptic}
            isClue={isClue}
            clearCellAt={digit.clearCellAt}
            removeCandidateAt={overlay.removeCandidateAt}
            openCandidateOverlay={overlay.openCandidateOverlay}
            applyCandidateBrushColorAt={brush.applyCandidateBrushColorAt}
            applyCellBrushColorAt={brush.applyCellBrushColorAt}
            closeCandidateOverlay={overlay.closeCandidateOverlay}
            selectCell={(r, c) => {
              dispatch(selectCellAction({ r, c }))
            }}
            focusCell={(r, c) => {
              dispatch(focusCellAction({ r, c }))
            }}
            setCandidateSelectedDigit={overlay.setCandidateSelectedDigit}
            openPencilOverlay={overlay.openPencilOverlayForCell}
            onTriggerHaptic={onTriggerHaptic}
          />
        </BoardSurface>
        <BoardControlsPanel
          paused={paused}
          won={won}
          haptic={settings.haptic}
          onTriggerHaptic={onTriggerHaptic}
          onTriggerErrorHaptic={onTriggerErrorHaptic}
          historyToolMode={game.historyToolMode}
          moreToolMode={game.moreToolMode}
          eraserMode={game.eraserMode}
          notesMode={game.notesMode}
          brushMode={game.brushMode}
          pencilMode={settings.pencilMode}
          candidateToolMode={game.candidateToolMode}
          visibleToolTray={tray.visibleToolTray}
          toolTrayTransition={tray.toolTrayTransition}
          toolTraySequence={tray.toolTraySequence}
          visibleLowerPad={tray.visibleLowerPad}
          lowerPadTransition={tray.lowerPadTransition}
          toolTrayRef={toolTrayRef}
          mainNotesButtonRef={mainNotesButtonRef}
          mainBrushButtonRef={mainBrushButtonRef}
          mainMoreButtonRef={mainMoreButtonRef}
          activeNotesButtonRef={activeNotesButtonRef}
          activeBrushButtonRef={activeBrushButtonRef}
          measureMainNotesButtonRef={measureMainNotesButtonRef}
          measureMainBrushButtonRef={measureMainBrushButtonRef}
          measureMainMoreButtonRef={measureMainMoreButtonRef}
          measureNotesButtonRef={measureNotesButtonRef}
          measureBrushButtonRef={measureBrushButtonRef}
          hasAnyColors={brush.hasAnyColors}
          hasAnyNotes={brush.hasAnyNotes}
          undoDisabled={history.undoDisabled}
          redoDisabled={history.redoDisabled}
          hasAnyFillableCell={hasAnyFillableCell}
          hasSingleCandidates={hasSingleCandidates}
          requiredTechniquesLoading={techniques.requiredTechniquesLoading}
          requiredTechniquesOpen={techniques.techniquesOpen}
          requiredTechniquesSummary={techniques.requiredTechniquesSummary}
          remaining={digit.remaining}
          candidateSelectedDigit={overlay.candidateSelectedDigit}
          selectedHasAnyColors={selectedHasAnyColors}
          activeBrushColor={game.activeBrushColor}
          touchFiredRef={touchFiredRef}
          applyDigit={digit.applyDigit}
          toggleReferenceDigitHighlight={(d) => {
            overlay.closeCandidateOverlay()
            overlay.setCandidateOverlayPreviewDigit(null)
            overlay.setCandidateSelectedDigit(overlay.candidateSelectedDigit === d ? null : d)
          }}
          applyBrushColor={brush.applyBrushColor}
          clearSelectedBrushColors={brush.clearSelectedBrushColors}
          clearAllColors={brush.clearAllColors}
          onClearAllNotes={brush.clearAllNotes}
          eraserColorPickerMode={tray.eraserColorPickerMode}
          onToggleEraserColorPicker={tray.toggleEraserColorPicker}
          onClearSingleColor={brush.clearColorFromBoard}
          undo={history.undo}
          redo={history.redo}
          fillAllCandidates={() => {
            const hasFillable = game.current!.some((row, r) =>
              row.some((n, c) => game.initial![r][c] === 0 && n === 0 && game.notes[r][c].length === 0)
            )
            if (!hasFillable) return false
            dispatch(fillAllCandidates())
            return true
          }}
          applySingleCandidatesToDigits={() => {
            const hasSingle = game.current!.some((row, r) =>
              row.some((n, c) => game.initial![r][c] === 0 && n === 0 && game.notes[r][c].length === 1)
            )
            if (!hasSingle) return false
            dispatch(applySingleCandidatesToDigits({ autoCheck: settings.autoCheck, autoRemove: settings.autoRemove }))
            return true
          }}
          showRequiredTechniques={techniques.showRequiredTechniques}
          openRequiredTechniquesSidebar={techniques.openRequiredTechniquesSidebar}
          hideRequiredTechniquesSummary={techniques.hideRequiredTechniquesSummary}
          toggleHistoryTools={tray.toggleHistoryTools}
          toggleMoreTools={tray.toggleMoreTools}
          toggleEraserMode={tray.toggleEraserMode}
          toggleNotesTools={tray.toggleNotesTools}
          toggleBrushTools={tray.toggleBrushTools}
          toggleCandidateTools={tray.toggleCandidateTools}
          onMomentaryButtonClick={handleMomentaryButtonClick}
          onModeButtonClick={handleModeButtonClick}
          t={t}
        />
        <TechniquesSidebar
          ref={techniques.techniquesRef}
          internalPuzzle={game.current}
          notes={game.notes}
          onTriggerHaptic={onTriggerHaptic}
          onCloseCandidateOverlay={overlay.closeCandidateOverlay}
          onOpenChange={techniques.setTechniquesOpen}
          onDockedOpenChange={techniques.setTechniquesDockedOpen}
          onResultChange={techniques.setRequiredTechniquesResult}
          onErrorChange={techniques.setRequiredTechniquesError}
          t={t}
        />
      </div>
      {overlay.candidateOverlay && (
        <CandidateOverlayComp
          overlay={overlay.candidateOverlay}
          cellNotes={overlayCellNotes}
          candidateColors={game.candidateColors}
          overlayHasCellColor={overlayHasCellColor}
          onClose={overlay.closeCandidateOverlay}
          onSetPreviewDigit={overlay.setCandidateOverlayPreviewDigit}
          onSelectDigit={overlay.setCandidateSelectedDigit}
          onRemoveCandidate={overlay.removeCandidateAt}
          onApplyCandidateBrushColor={brush.applyCandidateBrushColorAt}
          haptic={settings.haptic}
          onTriggerHaptic={onTriggerHaptic}
          t={t}
        />
      )}
      <VictoryOverlay
        won={won}
        finalTime={game.finalTime}
        formatTime={formatTime}
        onRetry={newGameActions.retry}
        onShare={onShare}
        onNew={onNew}
        onNewGame={newGameActions.newGame}
        t={t}
      />
      {overlay.pencilOverlayCell !== null && (
        <PencilOverlay
          cellRect={overlay.pencilOverlayCell.rect}
          initialPointer={overlay.pencilOverlayCell.initialPointer}
          onDigit={(d) => {
            digit.applyDigit(d, { r: overlay.pencilOverlayCell!.r, c: overlay.pencilOverlayCell!.c })
            overlay.closePencilOverlay()
          }}
          onClose={overlay.closePencilOverlay}
        />
      )}
    </div>
  )
}
