import { generateContinuously } from './generators/orchestrator'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'

const workerScope = self as DedicatedWorkerGlobalScope
let streamController: AbortController | null = null

function stopStream() {
  if (!streamController) return
  streamController.abort()
  streamController = null
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function postError(error: unknown) {
  const response: GenerateWorkerResponse = {
    type: 'error',
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : 'Failed to generate puzzle',
  }
  workerScope.postMessage(response)
}

workerScope.onmessage = async (event: MessageEvent<GenerateWorkerRequest>) => {
  const message = event.data
  if (message.type !== 'stream-start') return

  stopStream()
  const controller = new AbortController()
  streamController = controller

  try {
    await generateContinuously((generated) => {
      const response: GenerateWorkerResponse = {
        type: 'stream-puzzle',
        puzzle: generated.puzzle,
        solution: generated.solution,
        difficulty: generated.difficulty,
        score: generated.score,
      }
      workerScope.postMessage(response)
    }, controller.signal)
  } catch (error) {
    if (!controller.signal.aborted && !isAbortError(error)) {
      postError(error)
    }
  } finally {
    if (streamController === controller) {
      streamController = null
    }
  }
}

export {}
