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
  barcodeType: BarcodeType;
  barcodeStyle: BarcodeStyle;
  placement: XlsxPlacement;
  sourceColumns: {
    sourceColumnIndex: number;
    rows: { rowNumber: number; value: string }[];
  }[];
  onProgress?: (progress: { current: number; total: number }) => void;
}

export const createOutputFileName = (originalName: string): string => {
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) return `${originalName}_barcodes.xlsx`;

  const name = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${name}_barcodes${ext}`;
};

const isLeftPlacement = (placement: XlsxPlacement): boolean => {
  return placement === 'left' || placement === 'top-left' || placement === 'bottom-left';
};

const isRightPlacement = (placement: XlsxPlacement): boolean => {
  return placement === 'right' || placement === 'top-right' || placement === 'bottom-right';
};

const isTopPlacement = (placement: XlsxPlacement): boolean => {
  return placement === 'top' || placement === 'top-left' || placement === 'top-right';
};

const isBottomPlacement = (placement: XlsxPlacement): boolean => {
  return placement === 'bottom' || placement === 'bottom-left' || placement === 'bottom-right';
};

const countLessThan = (values: number[], target: number): number => {
  let count = 0;

  for (const value of values) {
    if (value >= target) {
      break;
    }

    count += 1;
  }

  return count;
};

const countLessThanOrEqual = (values: number[], target: number): number => {
  let count = 0;

  for (const value of values) {
    if (value > target) {
      break;
    }

    count += 1;
  }

  return count;
};

export const writeWorkbookWithBarcodes = async (
  params: WriteWorkbookParams,
): Promise<Blob> => {
  const {
    sourceFile,
    sheetName,
    barcodeType,
    barcodeStyle,
    placement,
    sourceColumns,
    onProgress,
  } = params;

  const sourceEntries = sourceColumns.flatMap((sourceColumn) =>
    sourceColumn.rows.map((row) => ({
      sourceColumnIndex: sourceColumn.sourceColumnIndex,
      rowNumber: row.rowNumber,
      value: row.value,
    })),
  );

  let currentStep = 0;
  const totalSteps = Math.max(sourceEntries.length * 2 + 1, 1);
  const reportProgress = () => {
    onProgress?.({ current: currentStep, total: totalSteps });
  };

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await sourceFile.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  reportProgress();

  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(i18n.t('xlsx.errors.sheetNotFound', { sheetName }));
  }

  // 1. Generate all barcodes first to avoid async issues during structural changes
  const barcodeMap = new Map<
    string,
    {
      sourceColumnIndex: number;
      rowNumber: number;
      base64: string;
      width: number;
      height: number;
    }
  >();
  const CONCURRENCY_LIMIT = 20;

  for (let i = 0; i < sourceEntries.length; i += CONCURRENCY_LIMIT) {
    const chunk = sourceEntries.slice(i, i + CONCURRENCY_LIMIT);
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
        barcodeMap.set(`${res.rowData.sourceColumnIndex}:${res.rowData.rowNumber}`, {
          sourceColumnIndex: res.rowData.sourceColumnIndex,
          rowNumber: res.rowData.rowNumber,
          base64: dataUrlToBase64(res.dataUrl),
          width: res.width,
          height: res.height,
        });
      }

      currentStep += 1;
      reportProgress();
    }
  }

  const sourceColumnIndexes = Array.from(
    new Set(sourceColumns.map((sourceColumn) => sourceColumn.sourceColumnIndex)),
  ).sort((a, b) => a - b);
  const sourceRowNumbers = Array.from(new Set(sourceEntries.map((entry) => entry.rowNumber))).sort(
    (a, b) => a - b,
  );

  if (isLeftPlacement(placement)) {
    for (const sourceColumnIndex of [...sourceColumnIndexes].sort((a, b) => b - a)) {
      worksheet.spliceColumns(sourceColumnIndex + 1, 0, []);
    }
  }

  if (isRightPlacement(placement)) {
    for (const sourceColumnIndex of [...sourceColumnIndexes].sort((a, b) => b - a)) {
      worksheet.spliceColumns(sourceColumnIndex + 2, 0, []);
    }
  }

  if (isTopPlacement(placement)) {
    for (const sourceRowNumber of [...sourceRowNumbers].sort((a, b) => b - a)) {
      worksheet.spliceRows(sourceRowNumber, 0, []);
    }
  }

  if (isBottomPlacement(placement)) {
    for (const sourceRowNumber of [...sourceRowNumbers].sort((a, b) => b - a)) {
      worksheet.spliceRows(sourceRowNumber + 1, 0, []);
    }
  }

  const mapOriginalColumnIndex = (sourceColumnIndex: number): number => {
    if (isLeftPlacement(placement)) {
      return sourceColumnIndex + countLessThanOrEqual(sourceColumnIndexes, sourceColumnIndex);
    }

    if (isRightPlacement(placement)) {
      return sourceColumnIndex + countLessThan(sourceColumnIndexes, sourceColumnIndex);
    }

    return sourceColumnIndex;
  };

  const mapOriginalRowNumber = (sourceRowNumber: number): number => {
    if (isTopPlacement(placement)) {
      return sourceRowNumber + countLessThanOrEqual(sourceRowNumbers, sourceRowNumber);
    }

    if (isBottomPlacement(placement)) {
      return sourceRowNumber + countLessThan(sourceRowNumbers, sourceRowNumber);
    }

    return sourceRowNumber;
  };

  for (const sourceColumn of sourceColumns) {
    for (const rowData of sourceColumn.rows) {
      const data = barcodeMap.get(`${sourceColumn.sourceColumnIndex}:${rowData.rowNumber}`);
      if (!data) {
        continue;
      }

      const sourceColumnIndex = mapOriginalColumnIndex(sourceColumn.sourceColumnIndex);
      const sourceRowNumber = mapOriginalRowNumber(rowData.rowNumber);
      const barcodeColumnIndex = isLeftPlacement(placement)
        ? sourceColumnIndex - 1
        : isRightPlacement(placement)
          ? sourceColumnIndex + 1
          : sourceColumnIndex;
      const barcodeRowNumber = isTopPlacement(placement)
        ? sourceRowNumber - 1
        : isBottomPlacement(placement)
          ? sourceRowNumber + 1
          : sourceRowNumber;
      const col = worksheet.getColumn(barcodeColumnIndex + 1);
      const row = worksheet.getRow(barcodeRowNumber);

      const imageId = workbook.addImage({
        base64: data.base64,
        extension: 'png',
      });

      const rowHeightPt = data.height * 0.75;
      row.height = Math.max(row.height || 0, rowHeightPt, 24);

      const estimatedColWidth = (data.width + 10) / 7;
      col.width = Math.max(col.width || 0, estimatedColWidth, 12);

      worksheet.addImage(imageId, {
        tl: { col: barcodeColumnIndex, row: barcodeRowNumber - 1 },
        ext: { width: data.width, height: data.height },
        editAs: 'oneCell',
      });

      currentStep += 1;
      reportProgress();
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  currentStep = totalSteps;
  reportProgress();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};
