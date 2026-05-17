import React from 'react';
import type { WorkbookPreview } from '../../types/xlsx';
import styles from './XlsxWorkbookViewer.module.css';
import clsx from 'clsx';
import { SimpleBarcodePreview } from '../../../barcode/components/SimpleBarcodePreview/SimpleBarcodePreview';

interface XlsxWorkbookViewerProps {
  workbook: WorkbookPreview;
  sourceColumnIndexes: number[];
  barcodeColumnIndexes: number[];
  onColumnClick?: (columnIndex: number) => void;
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
  sourceColumnIndexes,
  barcodeColumnIndexes,
  onColumnClick,
  barcodeStyle,
}) => {
  if (workbook.rows.length === 0) return null;

  const firstRow = workbook.rows[0];
  const sourceColumnIndexSet = new Set(sourceColumnIndexes);
  const barcodeColumnIndexSet = new Set(barcodeColumnIndexes);

  // Calculate dynamic grid template columns
  const gridTemplateColumns = [
    '50px', // Row number column
    ...firstRow.map((cell) => {
      if (barcodeColumnIndexSet.has(cell.columnIndex)) {
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
                [styles.sourceSelected]: sourceColumnIndexSet.has(cell.columnIndex),
                [styles.targetSelected]: barcodeColumnIndexSet.has(cell.columnIndex),
              })}
              onClick={onColumnClick ? () => onColumnClick(cell.columnIndex) : undefined}
              style={{ cursor: onColumnClick ? 'pointer' : 'default' }}
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
                  [styles.sourceColumn]: sourceColumnIndexSet.has(cell.columnIndex),
                  [styles.targetColumn]: barcodeColumnIndexSet.has(cell.columnIndex),
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
