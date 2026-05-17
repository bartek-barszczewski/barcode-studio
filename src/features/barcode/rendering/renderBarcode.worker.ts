import { renderBarcodeToSvgString } from './renderBarcode'
import type {
  BarcodeRenderWorkerRequest,
  BarcodeRenderWorkerResponse,
} from './renderBarcodeWorkerTypes'

const workerScope = self as unknown as {
  onmessage:
    | ((event: MessageEvent<BarcodeRenderWorkerRequest>) => void)
    | null
  postMessage: (message: BarcodeRenderWorkerResponse) => void
}

let isRendering = false
let latestRequest: BarcodeRenderWorkerRequest | null = null

const postRenderError = (requestId: number, error: unknown) => {
  workerScope.postMessage({
    requestId,
    status: 'error',
    error:
      error instanceof Error ? error.message : 'Blad generowania kodu.',
  })
}

const renderLatestRequest = async () => {
  if (isRendering) {
    return
  }

  const request = latestRequest

  if (!request) {
    return
  }

  latestRequest = null
  isRendering = true

  try {
    const svg = await renderBarcodeToSvgString(request.input)

    workerScope.postMessage({
      requestId: request.requestId,
      status: 'success',
      svg,
    })
  } catch (error: unknown) {
    postRenderError(request.requestId, error)
  } finally {
    isRendering = false

    if (latestRequest) {
      void renderLatestRequest()
    }
  }
}

workerScope.onmessage = (event) => {
  latestRequest = event.data
  void renderLatestRequest()
}
