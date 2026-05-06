import { afterEach, describe, expect, it, vi } from 'vitest'

type QueueModule = typeof import('./appPuzzleQueue')

function createPuzzle(difficulty: keyof ReturnType<typeof createAvailability>) {
  const row = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  const grid = Array.from({ length: 9 }, () => [...row])
  return {
    puzzle: grid,
    solution: grid.map(r => [...r]),
    difficulty,
    score: 100,
  }
}

function createAvailability(count: number) {
  return {
    VERY_EASY: count,
    EASY: count,
    MEDIUM: count,
    HARD: count,
    VERY_HARD: count,
    EXPERT: count,
    NIGHTMARE: count,
    DIABOLICAL: count,
  }
}

let importedModule: QueueModule | null = null

async function loadQueueModule({
  hasCapacity,
  availability,
  generateContinuouslyImpl = (..._args: unknown[]) => new Promise<never>(() => {}),
}: {
  hasCapacity: boolean
  availability: ReturnType<typeof createAvailability>
  generateContinuouslyImpl?: (...args: unknown[]) => Promise<unknown>
}) {
  vi.resetModules()
  delete window.__sudokuGeneratorStatus

  const manager = {
    enqueue: vi.fn(() => true),
    getAvailability: vi.fn(() => availability),
    hasCapacity: vi.fn(() => hasCapacity),
    start: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn(),
    take: vi.fn(),
  }
  const generateContinuously = vi.fn(generateContinuouslyImpl)

  vi.doMock('./puzzleQueue', () => ({
    createPuzzleQueueManager: () => manager,
  }))
  vi.doMock('./generators/orchestrator', () => ({
    generateContinuously,
  }))

  importedModule = await import('./appPuzzleQueue')
  return { module: importedModule, manager, generateContinuously }
}

afterEach(() => {
  importedModule?.stopPuzzleQueueDaemon()
  importedModule = null
  delete window.__sudokuGeneratorStatus
  vi.useRealTimers()
  vi.doUnmock('./puzzleQueue')
  vi.doUnmock('./generators/orchestrator')
})

describe('appPuzzleQueue debug hook', () => {
  it('exposes a console helper with the current generator status', async () => {
    const { module } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
    })

    expect(window.__sudokuGeneratorStatus).toBe(module.getPuzzleQueueDebugStatus)
    expect(window.__sudokuGeneratorStatus?.()).toEqual({
      status: 'stopped',
      daemonStarted: false,
      isGenerating: false,
      isGenerationScheduled: false,
      hasCapacity: true,
      availability: createAvailability(0),
      generatedCounts: createAvailability(0),
      totalGenerated: 0,
    })
  })

  it('reports scheduled, running, and stopped while the generator daemon changes state', async () => {
    vi.useFakeTimers()
    const { module, generateContinuously } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
    })

    module.startPuzzleQueueDaemon()
    expect(window.__sudokuGeneratorStatus?.().status).toBe('scheduled')

    await vi.runOnlyPendingTimersAsync()

    expect(generateContinuously).toHaveBeenCalledOnce()
    expect(window.__sudokuGeneratorStatus?.()).toMatchObject({
      status: 'running',
      daemonStarted: true,
      isGenerating: true,
      isGenerationScheduled: false,
      hasCapacity: true,
      availability: createAvailability(0),
    })

    module.stopPuzzleQueueDaemon()

    expect(window.__sudokuGeneratorStatus?.()).toMatchObject({
      status: 'stopped',
      daemonStarted: false,
      isGenerating: false,
      isGenerationScheduled: false,
    })
  })

  it('reports idle when the daemon is started but every queue is already full', async () => {
    const { module, generateContinuously } = await loadQueueModule({
      hasCapacity: false,
      availability: createAvailability(10),
    })

    module.startPuzzleQueueDaemon()

    expect(generateContinuously).not.toHaveBeenCalled()
    expect(window.__sudokuGeneratorStatus?.()).toEqual({
      status: 'idle',
      daemonStarted: true,
      isGenerating: false,
      isGenerationScheduled: false,
      hasCapacity: false,
      availability: createAvailability(10),
      generatedCounts: createAvailability(0),
      totalGenerated: 0,
    })
  })

  it('includes generated counts per difficulty', async () => {
    vi.useFakeTimers()
    let onGenerate: ((puzzle: ReturnType<typeof createPuzzle>) => boolean | void) | null = null
    const streamNeverSettles = new Promise<never>(() => {})
    const { module } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
      generateContinuouslyImpl: (callback: typeof onGenerate) => {
        onGenerate = callback
        return streamNeverSettles
      },
    })

    module.startPuzzleQueueDaemon()
    await vi.runOnlyPendingTimersAsync()

    expect(onGenerate).not.toBeNull()
    onGenerate?.(createPuzzle('HARD'))
    onGenerate?.(createPuzzle('HARD'))
    onGenerate?.(createPuzzle('EASY'))

    expect(window.__sudokuGeneratorStatus?.()).toMatchObject({
      generatedCounts: {
        ...createAvailability(0),
        EASY: 1,
        HARD: 2,
      },
      totalGenerated: 3,
    })
  })
})
