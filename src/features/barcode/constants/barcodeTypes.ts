import type { BarcodeFormState, BarcodeType } from '../types/barcode'

export const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
  CODE128: 'Code 128',
  EAN13: 'EAN-13',
  EAN8: 'EAN-8',
  UPCA: 'UPC-A',
  UPCE: 'UPC-E',
  CODE39: 'Code 39',
  CODE93: 'Code 93',
  CODABAR: 'Codabar',
  ITF: 'Interleaved 2 of 5 (ITF)',
  DATAMATRIX: 'Data Matrix',
  PDF417: 'PDF417',
  AZTEC: 'Aztec Code',
  PHARMACODE: 'Pharmacode',
  QR: 'QR Code',
}

export const BARCODE_TYPE_OPTIONS = [
  { value: 'CODE128', label: BARCODE_TYPE_LABELS.CODE128 },
  { value: 'EAN13', label: BARCODE_TYPE_LABELS.EAN13 },
  { value: 'EAN8', label: BARCODE_TYPE_LABELS.EAN8 },
  { value: 'UPCA', label: BARCODE_TYPE_LABELS.UPCA },
  { value: 'UPCE', label: BARCODE_TYPE_LABELS.UPCE },
  { value: 'CODE39', label: BARCODE_TYPE_LABELS.CODE39 },
  { value: 'CODE93', label: BARCODE_TYPE_LABELS.CODE93 },
  { value: 'CODABAR', label: BARCODE_TYPE_LABELS.CODABAR },
  { value: 'ITF', label: BARCODE_TYPE_LABELS.ITF },
  { value: 'DATAMATRIX', label: BARCODE_TYPE_LABELS.DATAMATRIX },
  { value: 'PDF417', label: BARCODE_TYPE_LABELS.PDF417 },
  { value: 'AZTEC', label: BARCODE_TYPE_LABELS.AZTEC },
  { value: 'PHARMACODE', label: BARCODE_TYPE_LABELS.PHARMACODE },
  { value: 'QR', label: BARCODE_TYPE_LABELS.QR },
] satisfies Array<{ value: BarcodeType; label: string }>

export const BARCODE_TEST_VALUES: Record<BarcodeType, string> = {
  CODE128: 'ABC-123456',
  EAN13: '4006381333931',
  EAN8: '96385074',
  UPCA: '012345678905',
  UPCE: '01234565',
  CODE39: 'HELLO-123',
  CODE93: 'HELLO-123',
  CODABAR: 'A123456A',
  ITF: '1234567890',
  DATAMATRIX: 'HELLO-123',
  PDF417: 'HELLO-123',
  AZTEC: 'HELLO-123',
  PHARMACODE: '12345',
  QR: 'https://github.com',
}

export const DEFAULT_BARCODE_FORM_STATE: BarcodeFormState = {
  type: 'CODE128',
  value: BARCODE_TEST_VALUES.CODE128,
  displayValue: '',
  rotation: 0,
  barColor: '#0A0F0D',
  backgroundColor: '#FFFFFF',
  height: 32,
  margin: 8,
  barWidth: 3,
  fontSize: 20,
  scale: 1,
  showText: false,
}
