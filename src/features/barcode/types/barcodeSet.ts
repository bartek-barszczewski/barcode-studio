import type { BarcodeType, BarcodeRotation } from './barcode'

export type BarcodeSetItem = {
  id: string
  value: string
  displayValue?: string
  type: BarcodeType
  options: {
    height: number
    barWidth: number
    scale: number
    margin: number
    rotation: BarcodeRotation
    foreground: string
    background: string
    textMode: 'hidden' | 'below'
    fontSize: number
  }
}
