import type { BarcodeFormState } from '../types/barcode'

export type BarcodeRenderWorkerRequest = {
  requestId: number
  input: BarcodeFormState
}

export type BarcodeRenderWorkerResponse =
  | {
      requestId: number
      status: 'success'
      svg: string
    }
  | {
      requestId: number
      status: 'error'
      error: string
    }
