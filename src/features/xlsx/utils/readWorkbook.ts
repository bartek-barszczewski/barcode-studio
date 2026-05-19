import ExcelJS from 'exceljs';
import i18n from '../../../shared/i18n/i18n';
import type { WorkbookPreview, CellPreview } from '../types/xlsx';
import { getColumnLetter } from './columnUtils';

const getCellTextValue = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && 'result' in value) {
    return String(value.result ?? '');
  }

  if (typeof value === 'object' && 'formula' in value) {
    return String(value.formula ?? '');
  }

  if (typeof value === 'object' && 'text' in value) {
    return String(value.text ?? '');
  }

  return String(value);
};

export const readWorkbook = async (arrayBuffer: ArrayBuffer): Promise<WorkbookPreview> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  const worksheet = workbook.worksheets[0]; // Load first by default

  if (!worksheet) {
    throw new Error(i18n.t('xlsx.errors.noSheets'));
  }

  const rows: CellPreview[][] = [];
  const rowCount = worksheet.rowCount;
  const detectedSourceColumnIndexes = new Set<number>();
  // Use actualColumnCount but ensure at least a few columns are shown
  const colCount = Math.max(worksheet.columnCount, 15);

  worksheet.eachRow((worksheetRow) => {
    worksheetRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      if (getCellTextValue(cell.value).trim() !== '') {
        detectedSourceColumnIndexes.add(columnNumber - 1);
      }
    });
  });

  // We want to build a rectangular preview
  for (let r = 1; r <= Math.min(rowCount, 50); r++) { // Limit preview to 1000 rows for performance
    const rowData: CellPreview[] = [];
    const worksheetRow = worksheet.getRow(r);
    
    for (let c = 1; c <= colCount; c++) {
      const cell = worksheetRow.getCell(c);
      const value = getCellTextValue(cell.value);

      rowData.push({
        rowNumber: r,
        columnIndex: c - 1,
        columnLetter: getColumnLetter(c - 1),
        value: value,
        isEmpty: value.trim() === '',
      });
    }
    rows.push(rowData);
  }

  return {
    sheetNames,
    activeSheetName: worksheet.name,
    rows,
    detectedSourceColumnIndexes: Array.from(detectedSourceColumnIndexes).sort((a, b) => a - b),
  };
};
