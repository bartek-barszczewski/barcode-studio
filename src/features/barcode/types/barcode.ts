export type BarcodeType =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'UPCE'
  | 'CODE39'
  | 'CODE93'
  | 'CODABAR'
  | 'ITF'
  | 'DATAMATRIX'
  | 'PDF417'
  | 'AZTEC'
  | 'PHARMACODE'
  | 'QR'

export type BarcodeRotation = 0 | 90 | 180 | 270

export type BarcodeFormState = {
  type: BarcodeType
  value: string
  displayValue?: string
  rotation: BarcodeRotation
  barColor: string
  backgroundColor: string
  height: number
  margin: number
  barWidth: number
  fontSize: number
  scale: number
  showText: boolean
}

export type ValidationResult = {
  isValid: boolean
  message?: string
}
