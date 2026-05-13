/// <reference lib="webworker" />

import { rateSudoku } from 'hodoku-core-js'
import type {
  RequiredTechniquesWorkerRequest,
  RequiredTechniquesWorkerResponse,
} from './requiredTechniquesWorkerProtocol'

const workerScope = self as unknown as DedicatedWorkerGlobalScope

function postError(error: unknown) {
  const response: RequiredTechniquesWorkerResponse = {
    type: 'error',
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : 'Failed to analyze required techniques',
  }
  workerScope.postMessage(response)
}

workerScope.onmessage = async (event: MessageEvent<RequiredTechniquesWorkerRequest>) => {
  const message = event.data
  if (message.type !== 'analyze') return

  try {
    const rating = await rateSudoku({
      puzzle: message.puzzle,
      includePath: true,
    })

    const response: RequiredTechniquesWorkerResponse = {
      type: 'result',
      result: rating === null
        ? null
        : {
            difficulty: rating.difficulty,
            score: rating.score,
            givenUp: rating.givenUp,
            bruteForced: rating.bruteForced,
            unsolvable: rating.unsolvable,
            steps: rating.steps ?? [],
          },
    }
    workerScope.postMessage(response)
  } catch (error) {
    postError(error)
  }
}

export {}
