import ExcelJS from 'exceljs';
import i18n from '../../../shared/i18n/i18n';
import {
  generateBarcodePngDataUrl,
  dataUrlToBase64,
} from '../../barcode/export/generateBarcodePng';
import type { BarcodeType, BarcodeFormState } from '../../barcode/types/barcode';
import type { XlsxPlacement } from '../types/xlsx';

export type BarcodeStyle = Omit<BarcodeFormState, 'type' | 'value'>;

interface WriteWorkbookParams {
  sourceFile: File;
  sheetName: string;
  targetColumnIndex: number;
  placement: XlsxPlacement;
  barcodeType: BarcodeType;
  barcodeStyle: BarcodeStyle;
  sourceRows: { rowNumber: number; value: string }[];
}

export const createOutputFileName = (originalName: string): string => {
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) return `${originalName}_barcodes.xlsx`;

  const name = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${name}_barcodes${ext}`;
};

const getBarcodeColumnIndex = (
  targetColumnIndex: number,
  placement: XlsxPlacement,
): number => {
  if (placement === 'left' || placement === 'right') {
    return targetColumnIndex;
  }

  if (placement.endsWith('-left')) {
    return Math.max(0, targetColumnIndex - 1);
  }

  if (placement.endsWith('-right')) {
    return targetColumnIndex + 1;
  }

  return targetColumnIndex;
};

const getInsertedTargetRows = (
  originalRowNumbers: number[],
  placement: XlsxPlacement,
): Map<number, number> => {
  const targetRows = new Map<number, number>();

  originalRowNumbers.forEach((originalRowNumber, index) => {
    const targetRowNumber = placement.startsWith('top')
      ? originalRowNumber + index
      : originalRowNumber + index + 1;

    targetRows.set(originalRowNumber, targetRowNumber);
  });

  return targetRows;
};

export const writeWorkbookWithBarcodes = async (
  params: WriteWorkbookParams,
): Promise<Blob> => {
  const {
    sourceFile,
    sheetName,
    targetColumnIndex,
    placement,
    barcodeType,
    barcodeStyle,
    sourceRows,
  } = params;

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await sourceFile.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(i18n.t('xlsx.errors.sheetNotFound', { sheetName }));
  }

  // 1. Generate all barcodes first to avoid async issues during structural changes
  const barcodeMap = new Map<number, { base64: string; width: number; height: number }>();
  const CONCURRENCY_LIMIT = 20;

  for (let i = 0; i < sourceRows.length; i += CONCURRENCY_LIMIT) {
    const chunk = sourceRows.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map(async (rowData) => {
        const barcodeState: BarcodeFormState = {
          ...barcodeStyle,
          type: barcodeType,
          value: rowData.value,
        };

        try {
          const result = await generateBarcodePngDataUrl(barcodeState);
          return { ...result, rowData, error: null };
        } catch (error) {
          return { dataUrl: '', width: 0, height: 0, rowData, error };
        }
      })
    );

    for (const res of chunkResults) {
      if (!res.error && res.dataUrl) {
        barcodeMap.set(res.rowData.rowNumber, {
          base64: dataUrlToBase64(res.dataUrl),
          width: res.width,
          height: res.height,
        });
      }
    }
  }

  const originalRowNumbers = Array.from(barcodeMap.keys()).sort((a, b) => a - b);

  // 2. Apply structural changes first. ExcelJS does not shift existing image
  // anchors when rows are spliced, so images must be added only after all row
  // insertions are finished.
  if (placement.startsWith('top') || placement.startsWith('bottom')) {
    const targetRows = getInsertedTargetRows(originalRowNumbers, placement);
    const rowsToInsertDescending = [...originalRowNumbers].sort((a, b) => b - a);

    for (const originalRowNumber of rowsToInsertDescending) {
      const insertAtRow = placement.startsWith('top')
        ? originalRowNumber
        : originalRowNumber + 1;

      worksheet.spliceRows(insertAtRow, 0, []);
    }

    for (const originalRowNumber of originalRowNumbers) {
      const data = barcodeMap.get(originalRowNumber);
      const targetRowNumber = targetRows.get(originalRowNumber);
      if (!data || !targetRowNumber) {
        continue;
      }

      const barcodeColIndex = getBarcodeColumnIndex(targetColumnIndex, placement);
      const imageId = workbook.addImage({
        base64: data.base64,
        extension: 'png',
      });

      const rowHeightPt = data.height * 0.75;
      const row = worksheet.getRow(targetRowNumber);
      row.height = Math.min(Math.max(rowHeightPt, 24), 400);

      const col = worksheet.getColumn(barcodeColIndex + 1);
      const estimatedColWidth = (data.width + 10) / 7;
      col.width = Math.max(col.width || 0, estimatedColWidth, 12);

      worksheet.addImage(imageId, {
        tl: { col: barcodeColIndex, row: targetRowNumber - 1 },
        ext: { width: data.width, height: data.height },
        editAs: 'oneCell',
      });
    }
  } else {
    // For Left/Right placement, we use the target column directly (as seen in preview)
    // The UI already checks if this column is empty for the affected rows.
    
    for (const originalRowNum of originalRowNumbers) {
      const data = barcodeMap.get(originalRowNum);
      if (!data) {
        continue;
      }

      const imageId = workbook.addImage({
        base64: data.base64,
        extension: 'png',
      });

      // Update row height if the barcode is taller than the existing row
      const rowHeightPt = data.height * 0.75;
      const row = worksheet.getRow(originalRowNum);
      row.height = Math.max(row.height || 0, rowHeightPt, 24);

      // Update column width
      const col = worksheet.getColumn(targetColumnIndex + 1);
      const estimatedColWidth = (data.width + 10) / 7;
      col.width = Math.max(col.width || 0, estimatedColWidth, 12);

      worksheet.addImage(imageId, {
        tl: { col: targetColumnIndex, row: originalRowNum - 1 },
        ext: { width: data.width, height: data.height },
        editAs: 'oneCell',
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};
