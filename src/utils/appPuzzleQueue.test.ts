import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeGrid } from './gameStorage'

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

function createRating(difficulty: keyof ReturnType<typeof createAvailability>) {
  const puzzle = createPuzzle(difficulty)
  return {
    puzzle: encodeGrid(puzzle.puzzle),
    solution: encodeGrid(puzzle.solution),
    difficulty,
    score: puzzle.score,
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
  nextDifficulty = hasCapacity ? 'VERY_EASY' : null,
  generateImpl = (...args: unknown[]) => {
    void args
    return new Promise<never>(() => {})
  },
}: {
  hasCapacity: boolean
  availability: ReturnType<typeof createAvailability>
  nextDifficulty?: keyof ReturnType<typeof createAvailability> | null
  generateImpl?: (...args: unknown[]) => Promise<unknown>
}) {
  vi.resetModules()
  delete window.__sudokuGeneratorStatus

  const manager = {
    enqueue: vi.fn(() => true),
    getAvailability: vi.fn(() => availability),
    getNextDifficulty: vi.fn(() => nextDifficulty),
    hasCapacity: vi.fn(() => hasCapacity),
    reset: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn(),
    take: vi.fn(),
  }
  const generate = vi.fn(generateImpl)

  vi.doMock('./puzzleQueue', () => ({
    createPuzzleQueueManager: () => manager,
  }))
  vi.doMock('./generators/hodoku', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./generators/hodoku')>()
    return {
      ...actual,
      generate,
    }
  })

  importedModule = await import('./appPuzzleQueue')
  return { module: importedModule, manager, generate }
}

afterEach(() => {
  importedModule?.stopPuzzleQueueDaemon()
  importedModule = null
  delete window.__sudokuGeneratorStatus
  vi.useRealTimers()
  vi.doUnmock('./puzzleQueue')
  vi.doUnmock('./generators/hodoku')
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
    const { module, generate } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
    })

    module.startPuzzleQueueDaemon()
    expect(window.__sudokuGeneratorStatus?.().status).toBe('scheduled')

    await vi.runOnlyPendingTimersAsync()

    expect(generate).toHaveBeenCalledOnce()
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
    const { module, generate } = await loadQueueModule({
      hasCapacity: false,
      availability: createAvailability(10),
      nextDifficulty: null,
    })

    module.startPuzzleQueueDaemon()

    expect(generate).not.toHaveBeenCalled()
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
    let onGenerate: ((puzzle: ReturnType<typeof createRating>) => boolean | void) | null = null
    const streamNeverSettles = new Promise<never>(() => {})
    const { module } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
      generateImpl: (_difficulty: string, callback: typeof onGenerate) => {
        onGenerate = callback
        return streamNeverSettles
      },
    })

    module.startPuzzleQueueDaemon()
    await vi.runOnlyPendingTimersAsync()

    expect(onGenerate).not.toBeNull()
    onGenerate?.(createRating('VERY_EASY'))
    onGenerate?.(createRating('VERY_EASY'))
    onGenerate?.(createRating('VERY_EASY'))

    expect(window.__sudokuGeneratorStatus?.()).toMatchObject({
      generatedCounts: {
        ...createAvailability(0),
        VERY_EASY: 3,
      },
      totalGenerated: 3,
    })
  })

  it('resets queue state and generation counters', async () => {
    const { module, manager } = await loadQueueModule({
      hasCapacity: true,
      availability: createAvailability(0),
    })

    module.startPuzzleQueueDaemon()
    module.resetPuzzleQueueDaemon()

    expect(manager.reset).toHaveBeenCalledOnce()
    expect(window.__sudokuGeneratorStatus?.()).toMatchObject({
      generatedCounts: createAvailability(0),
      totalGenerated: 0,
    })
  })
})
