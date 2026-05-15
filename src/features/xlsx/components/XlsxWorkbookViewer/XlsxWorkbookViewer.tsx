import React from 'react';
import type { WorkbookPreview, SelectedColumns } from '../../types/xlsx';
import styles from './XlsxWorkbookViewer.module.css';
import clsx from 'clsx';
import { SimpleBarcodePreview } from '../../../barcode/components/SimpleBarcodePreview/SimpleBarcodePreview';

interface XlsxWorkbookViewerProps {
  workbook: WorkbookPreview;
  selectedColumns: SelectedColumns;
  onColumnClick: (columnIndex: number) => void;
  barcodeStyle: {
    height: number;
    barWidth: number;
    scale: number;
    fontSize: number;
    margin: number;
    barColor: string;
    backgroundColor: string;
    showText: boolean;
  };
}

export const XlsxWorkbookViewer: React.FC<XlsxWorkbookViewerProps> = ({
  workbook,
  selectedColumns,
  onColumnClick,
  barcodeStyle,
}) => {
  if (workbook.rows.length === 0) return null;

  const firstRow = workbook.rows[0];

  // Calculate dynamic grid template columns
  const gridTemplateColumns = [
    '50px', // Row number column
    ...firstRow.map((cell) => {
      if (cell.columnIndex === selectedColumns.targetColumnIndex && selectedColumns.sourceColumnIndex !== null) {
        // If placement is top/bottom, we don't necessarily need a super wide column
        // but for left/right it's essential. For now keep it wide for all target columns
        // to ensure the barcode is visible.
        return '200px'; 
      }
      return '120px';
    })
  ].join(' ');

  return (
    <div className={styles.container}>
      <div 
        className={styles.grid}
        style={{ gridTemplateColumns }}
      >
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerCell}></div>
          {firstRow.map((cell) => (
            <div
              key={`header-${cell.columnIndex}`}
              className={clsx(styles.headerCell, {
                [styles.sourceSelected]: selectedColumns.sourceColumnIndex === cell.columnIndex,
                [styles.targetSelected]: selectedColumns.targetColumnIndex === cell.columnIndex,
              })}
              onClick={() => onColumnClick(cell.columnIndex)}
            >
              {cell.columnLetter}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {workbook.rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className={styles.headerRow}>
            <div className={styles.rowNumberCell}>{row[0]?.rowNumber}</div>
            {row.map((cell, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={clsx(styles.cell, {
                  [styles.sourceColumn]: selectedColumns.sourceColumnIndex === cell.columnIndex,
                  [styles.targetColumn]: selectedColumns.targetColumnIndex === cell.columnIndex,
                  [styles.invalidCell]: cell.isValid === false,
                  [styles.previewCell]: !!cell.barcodePreviewData,
                })}
                title={cell.validationError}
              >
                {cell.barcodePreviewData ? (
                  <SimpleBarcodePreview
                    value={cell.barcodePreviewData.value}
                    type={cell.barcodePreviewData.type}
                    {...barcodeStyle}
                  />
                ) : (
                  cell.value
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
