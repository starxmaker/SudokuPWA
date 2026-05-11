/// <reference lib="webworker" />

import { decodeGrid } from './gameStorage'
import { generate } from './generators/hodoku'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'

const workerScope = self as unknown as DedicatedWorkerGlobalScope
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
    await generate(message.difficulty, (rating) => {
      if (!rating.solution) return true
      const puzzle = decodeGrid(rating.puzzle)
      const solution = decodeGrid(rating.solution)
      if (!puzzle || !solution) return true
      const response: GenerateWorkerResponse = {
        type: 'stream-puzzle',
        puzzle,
        solution,
        difficulty: message.difficulty,
        score: rating.score ?? null,
      }
      workerScope.postMessage(response)
      return true
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
