import ExcelJS from 'exceljs';
import i18n from '../../../shared/i18n/i18n';
import { renderBarcodeToSvgString } from '../../barcode/rendering/renderBarcode';
import type { BarcodeFormState, BarcodeType } from '../../barcode/types/barcode';
import { validateBarcodeValue } from '../../barcode/validation/barcodeValidation';

const MAX_PRINT_CARDS = 500;
const FIXED_PRINT_CARD_BAR_WIDTH = 1;

export interface PrintCardData {
  rowNumber: number;
  primaryValue: string;
  secondaryValue: string;
  combinedLabel: string;
  primaryBarcodeSvg: string;
  secondaryBarcodeSvg: string;
}

export type PrintBarcodeStyle = Omit<BarcodeFormState, 'type' | 'value' | 'displayValue'>;

type RawPrintRow = {
  rowNumber: number;
  primaryValue: string;
  secondaryValue: string;
};

const isMatrixCode = (barcodeType: BarcodeType) =>
  barcodeType === 'QR' || barcodeType === 'DATAMATRIX' || barcodeType === 'AZTEC';

const clampNumber = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalizedValue = value as number;
  return Math.min(max, Math.max(min, normalizedValue));
};

const getCellTextValue = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '');
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '');
  if (typeof value === 'object' && 'formula' in value) return String(value.formula ?? '');
  return String(value);
};

const getPrintBarcodeStyle = (barcodeType: BarcodeType): PrintBarcodeStyle => {
  const isPdf417 = barcodeType === 'PDF417';

  if (isMatrixCode(barcodeType)) {
    return {
      rotation: 0,
      barColor: '#111111',
      backgroundColor: '#FFFFFF',
      transparentBackground: true,
      height: 96,
      margin: 0,
      barWidth: FIXED_PRINT_CARD_BAR_WIDTH,
      fontSize: 12,
      scale: 2,
      showText: false,
    };
  }

  if (isPdf417) {
    return {
      rotation: 0,
      barColor: '#111111',
      backgroundColor: '#FFFFFF',
      transparentBackground: true,
      height: 44,
      margin: 0,
      barWidth: FIXED_PRINT_CARD_BAR_WIDTH,
      fontSize: 12,
      scale: 2,
      showText: false,
    };
  }

  return {
    rotation: 0,
    barColor: '#111111',
    backgroundColor: '#FFFFFF',
    transparentBackground: true,
    height: 58,
    margin: 0,
    barWidth: FIXED_PRINT_CARD_BAR_WIDTH,
    fontSize: 12,
    scale: 2,
    showText: false,
  };
};

const getNormalizedPrintBarcodeStyle = (
  barcodeType: BarcodeType,
  barcodeStyle?: PrintBarcodeStyle,
): PrintBarcodeStyle => {
  const baseStyle = barcodeStyle ?? getPrintBarcodeStyle(barcodeType);
  const normalizedScale = clampNumber(baseStyle.scale, 1, 0.5, 4);
  const normalizedHeight = clampNumber(baseStyle.height, 58, 1, 2048);
  const normalizedMargin = clampNumber(baseStyle.margin, 0, 0, 512);
  const normalizedFontSize = clampNumber(baseStyle.fontSize, 12, 1, 512);

  if (isMatrixCode(barcodeType)) {
    return {
      ...baseStyle,
      barWidth: FIXED_PRINT_CARD_BAR_WIDTH,
      height: normalizedHeight,
      margin: normalizedMargin,
      fontSize: normalizedFontSize,
      scale: normalizedScale,
      showText: false,
    };
  }

  return {
    ...baseStyle,
    barWidth: FIXED_PRINT_CARD_BAR_WIDTH,
    height: Math.max(1, Math.round(normalizedHeight * normalizedScale)),
    margin: Number((normalizedMargin * normalizedScale).toFixed(2)),
    fontSize: Math.max(1, Math.round(normalizedFontSize * normalizedScale)),
    scale: 1,
    showText: false,
  };
};

const shouldSkipLikelyHeaderRow = (
  firstRow: RawPrintRow | undefined,
  remainingRows: RawPrintRow[],
  barcodeType: BarcodeType,
): boolean => {
  if (!firstRow || remainingRows.length === 0) {
    return false;
  }

  if (firstRow.primaryValue === '' || firstRow.secondaryValue === '') {
    return false;
  }

  const firstPrimaryValid = validateBarcodeValue(barcodeType, firstRow.primaryValue).isValid;
  const firstSecondaryValid = validateBarcodeValue(barcodeType, firstRow.secondaryValue).isValid;

  if (firstPrimaryValid || firstSecondaryValid) {
    return false;
  }

  return remainingRows.some(
    (row) =>
      row.primaryValue !== '' &&
      row.secondaryValue !== '' &&
      validateBarcodeValue(barcodeType, row.primaryValue).isValid &&
      validateBarcodeValue(barcodeType, row.secondaryValue).isValid,
  );
};

const collectPrintRows = (worksheet: ExcelJS.Worksheet, barcodeType: BarcodeType): RawPrintRow[] => {
  const rows: RawPrintRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const primaryValue = getCellTextValue(row.getCell(1).value).trim();
    const secondaryValue = getCellTextValue(row.getCell(2).value).trim();

    if (primaryValue === '' && secondaryValue === '') {
      return;
    }

    rows.push({
      rowNumber,
      primaryValue,
      secondaryValue,
    });
  });

  if (shouldSkipLikelyHeaderRow(rows[0], rows.slice(1), barcodeType)) {
    return rows.slice(1);
  }

  return rows;
};

const validatePrintRows = (rows: RawPrintRow[], barcodeType: BarcodeType) => {
  const invalidCells: string[] = [];

  rows.forEach((row) => {
    if (row.primaryValue === '' || row.secondaryValue === '') {
      invalidCells.push(`A${row.rowNumber}`, `B${row.rowNumber}`);
      return;
    }

    if (!validateBarcodeValue(barcodeType, row.primaryValue).isValid) {
      invalidCells.push(`A${row.rowNumber}`);
    }

    if (!validateBarcodeValue(barcodeType, row.secondaryValue).isValid) {
      invalidCells.push(`B${row.rowNumber}`);
    }
  });

  if (invalidCells.length > 0) {
    throw new Error(
      i18n.t('xlsx.errors.invalidPrintData', {
        defaultValue:
          'Print cards requires valid values in columns A and B for every printed row.',
      }),
    );
  }
};

export async function preparePrintCards(
  file: File,
  sheetName: string,
  barcodeType: BarcodeType,
  barcodeStyle?: PrintBarcodeStyle,
): Promise<PrintCardData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(i18n.t('xlsx.errors.sheetNotFound', { sheetName }));
  }

  const collectedRows = collectPrintRows(worksheet, barcodeType);

  if (collectedRows.length === 0) {
    throw new Error(
      i18n.t('xlsx.errors.noPrintData', {
        defaultValue: 'No printable rows were found in the first two columns.',
      }),
    );
  }

  validatePrintRows(collectedRows, barcodeType);

  const printRows = collectedRows.slice(0, MAX_PRINT_CARDS);
  const printBarcodeStyle = getNormalizedPrintBarcodeStyle(barcodeType, barcodeStyle);

  return Promise.all(
    printRows.map(async (row) => ({
      rowNumber: row.rowNumber,
      primaryValue: row.primaryValue,
      secondaryValue: row.secondaryValue,
      combinedLabel: `${row.primaryValue}\n${row.secondaryValue}`,
      primaryBarcodeSvg: await renderBarcodeToSvgString({
        ...printBarcodeStyle,
        type: barcodeType,
        value: row.primaryValue,
      }),
      secondaryBarcodeSvg: await renderBarcodeToSvgString({
        ...printBarcodeStyle,
        type: barcodeType,
        value: row.secondaryValue,
      }),
    })),
  );
}
