import type { BarcodeType } from '../../barcode/types/barcode';

export interface CellPreview {
  rowNumber: number;
  columnIndex: number;
  columnLetter: string;
  value: string;
  isEmpty: boolean;
  isValid?: boolean;
  validationError?: string;
  barcodePreviewData?: {
    value: string;
    type: BarcodeType;
  };
}

export interface WorkbookPreview {
  sheetNames: string[];
  activeSheetName: string;
  rows: CellPreview[][];
  detectedSourceColumnIndexes: number[];
}

export type XlsxPlacement =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export interface SelectedColumns {
  sourceColumnIndex: number | null;
  targetColumnIndex: number | null;
  placement: XlsxPlacement;
}
