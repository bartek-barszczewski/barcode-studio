import type { CellPreview } from '../types/xlsx';

export const getColumnLetter = (columnIndex: number): string => {
  let letter = '';
  while (columnIndex >= 0) {
    letter = String.fromCharCode((columnIndex % 26) + 65) + letter;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return letter;
};

export const getColumnIndexFromLetter = (letter: string): number => {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
};

export const isColumnEmptyForRows = (
  rows: CellPreview[][],
  columnIndex: number,
  rowNumbers: number[]
): boolean => {
  return rowNumbers.every((rowNum) => {
    const row = rows.find((r) => r.length > 0 && r[0].rowNumber === rowNum);
    const cell = row?.find((c) => c.columnIndex === columnIndex);
    return !cell || cell.isEmpty;
  });
};

export const getNonEmptyValuesFromColumn = (
  rows: CellPreview[][],
  columnIndex: number
): { rowNumber: number; value: string }[] => {
  const result: { rowNumber: number; value: string }[] = [];
  rows.forEach((row) => {
    const cell = row.find((c) => c.columnIndex === columnIndex);
    if (cell && !cell.isEmpty) {
      result.push({ rowNumber: cell.rowNumber, value: cell.value });
    }
  });
  return result;
};

export const getOccupiedTargetCells = (
  rows: CellPreview[][],
  targetColumnIndex: number,
  sourceRowNumbers: number[]
): string[] => {
  const occupied: string[] = [];
  rows.forEach((row) => {
    const firstCell = row[0];
    if (firstCell && sourceRowNumbers.includes(firstCell.rowNumber)) {
      const targetCell = row.find((c) => c.columnIndex === targetColumnIndex);
      if (targetCell && !targetCell.isEmpty) {
        occupied.push(`${targetCell.columnLetter}${targetCell.rowNumber}`);
      }
    }
  });
  return occupied;
};
