import type {
  BarcodeRotation,
  BarcodeTextPosition,
  BarcodeType,
} from './barcode'

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
    transparentBackground?: boolean
    textMode: 'hidden' | 'below'
    fontSize: number
    textBold?: boolean
    textItalic?: boolean
    textPosition?: BarcodeTextPosition
    textRotation?: number
  }
}
