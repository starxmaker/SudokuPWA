import React from 'react'
import ToolTray from './ToolTray'
import LowerPadSwitcher from './LowerPadSwitcher'

type TFunc = (key: string, params?: Record<string, string | number>) => string

type RequiredTechniquesSummaryType = {
  technique: string
  notation: string
}

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
  touchFiredRef: React.MutableRefObject<string | null>
  showRequiredTechniques: () => Promise<unknown>
  openRequiredTechniquesSidebar: () => void
  requiredTechniquesSummary: RequiredTechniquesSummaryType | null
  t: TFunc
}

export default function BoardControlsPanel({
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
  touchFiredRef,
  showRequiredTechniques,
  openRequiredTechniquesSidebar,
  requiredTechniquesSummary,
  t,
}: Props) {
  return (
    <div className="controls-panel">
      <ToolTray
        onTriggerHaptic={onTriggerHaptic}
        onTriggerErrorHaptic={onTriggerErrorHaptic}
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
        t={t}
      />
      <LowerPadSwitcher
        onTriggerHaptic={onTriggerHaptic}
        onTriggerErrorHaptic={onTriggerErrorHaptic}
        touchFiredRef={touchFiredRef}
        showRequiredTechniques={showRequiredTechniques}
        openRequiredTechniquesSidebar={openRequiredTechniquesSidebar}
        requiredTechniquesSummary={requiredTechniquesSummary}
        t={t}
      />
    </div>
  )
}
