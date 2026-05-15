import ExcelJS from 'exceljs';
import i18n from '../../../shared/i18n/i18n';
import type { WorkbookPreview, CellPreview } from '../types/xlsx';
import { getColumnLetter } from './columnUtils';

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
  // Use actualColumnCount but ensure at least a few columns are shown
  const colCount = Math.max(worksheet.columnCount, 15);

  // We want to build a rectangular preview
  for (let r = 1; r <= Math.min(rowCount, 1000); r++) { // Limit preview to 1000 rows for performance
    const rowData: CellPreview[] = [];
    const worksheetRow = worksheet.getRow(r);
    
    for (let c = 1; c <= colCount; c++) {
      const cell = worksheetRow.getCell(c);
      let value = '';

      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Formula result
          value = String(cell.value.result ?? '');
        } else if (typeof cell.value === 'object' && 'formula' in cell.value) {
          // Formula text if result missing
          value = String(cell.value.formula ?? '');
        } else if (typeof cell.value === 'object' && 'text' in cell.value) {
           // Hyperlink or RichText
           value = String(cell.value.text ?? '');
        } else {
          value = String(cell.value);
        }
      }

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
  };
};
