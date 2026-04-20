import { getGenerator } from './generators'
import type { GenerateWorkerRequest, GenerateWorkerResponse } from './generationWorkerProtocol'

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.onmessage = async (event: MessageEvent<GenerateWorkerRequest>) => {
  const message = event.data
  if (message.type !== 'generate') return

  try {
    const { puzzle, solution } = await getGenerator(message.generatorId).generate(message.difficulty)
    const response: GenerateWorkerResponse = {
      type: 'result',
      puzzle,
      solution,
    }
    workerScope.postMessage(response)
  } catch (error) {
    const response: GenerateWorkerResponse = {
      type: 'error',
      name: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message : 'Failed to generate puzzle',
    }
    workerScope.postMessage(response)
  }
}

export {}
