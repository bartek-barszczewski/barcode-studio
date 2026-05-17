import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  Type,
  UploadCloud,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import type { BarcodeType } from '../../features/barcode/types/barcode';
import type { WorkbookPreview, CellPreview, XlsxPlacement } from '../../features/xlsx/types/xlsx';
import styles from './XlsxPage.module.css';
import { Dropzone } from '../../shared/ui/Dropzone/Dropzone';
import { Panel } from '../../shared/ui/Panel/Panel';
import { readWorkbook } from '../../features/xlsx/utils/readWorkbook';
import { XlsxWorkbookViewer } from '../../features/xlsx/components/XlsxWorkbookViewer/XlsxWorkbookViewer';
import { SearchableSelect } from '../../shared/ui/SearchableSelect/SearchableSelect';
import { BARCODE_TYPE_OPTIONS } from '../../features/barcode/constants/barcodeTypes';
import { validateBarcodeValue } from '../../features/barcode/validation/barcodeValidation';
import { createOutputFileName, writeWorkbookWithBarcodes } from '../../features/xlsx/utils/writeWorkbookWithBarcodes';
import { Button } from '../../shared/ui/Button/Button';
import { Field } from '../../shared/ui/Field/Field';
import { TextInput } from '../../shared/ui/TextInput/TextInput';
import { SelectInput } from '../../shared/ui/SelectInput/SelectInput';
import { toNumber } from '../../shared/utils/number';
import ExcelJS from 'exceljs';
import { getColumnLetter } from '../../features/xlsx/utils/columnUtils';
import clsx from 'clsx';

const getCellTextValue = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && 'result' in value) {
    return String(value.result ?? '');
  }

  if (typeof value === 'object' && 'text' in value) {
    return String(value.text ?? '');
  }

  if (typeof value === 'object' && 'formula' in value) {
    return String(value.formula ?? '');
  }

  return String(value);
};

const PLACEMENT_OPTIONS: {
  value: XlsxPlacement;
  icon: typeof ArrowUp;
  labelKey: string;
}[] = [
  { value: 'top-left', icon: ArrowUpLeft, labelKey: 'xlsx.placement.options.topLeft' },
  { value: 'top', icon: ArrowUp, labelKey: 'xlsx.placement.options.top' },
  { value: 'top-right', icon: ArrowUpRight, labelKey: 'xlsx.placement.options.topRight' },
  { value: 'left', icon: ArrowLeft, labelKey: 'xlsx.placement.options.left' },
  { value: 'right', icon: ArrowRight, labelKey: 'xlsx.placement.options.right' },
  { value: 'bottom-left', icon: ArrowDownLeft, labelKey: 'xlsx.placement.options.bottomLeft' },
  { value: 'bottom', icon: ArrowDown, labelKey: 'xlsx.placement.options.bottom' },
  { value: 'bottom-right', icon: ArrowDownRight, labelKey: 'xlsx.placement.options.bottomRight' },
];

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

export function XlsxPage() {
  const { t } = useTranslation();
  const [workbook, setWorkbook] = useState<WorkbookPreview | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128');
  const [placement, setPlacement] = useState<XlsxPlacement>('right');
  const [barcodeStyle, setBarcodeStyle] = useState({
    rotation: 0 as const,
    barColor: '#0A0F0D',
    backgroundColor: '#FFFFFF',
    height: 32,
    margin: 8,
    barWidth: 3,
    fontSize: 20,
    scale: 1,
    showText: false,
  });

  const hasUnsavedChanges = originalFile !== null && !isGenerating;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
  });

  const isSettingsValid = useMemo(() => {
    return (
      barcodeStyle.height >= 4 &&
      barcodeStyle.height <= 400 &&
      barcodeStyle.barWidth >= 1 &&
      barcodeStyle.barWidth <= 12 &&
      barcodeStyle.scale >= 0.5 &&
      barcodeStyle.scale <= 4 &&
      barcodeStyle.fontSize >= 4 &&
      barcodeStyle.fontSize <= 48 &&
      barcodeStyle.margin >= 0 &&
      barcodeStyle.margin <= 80
    );
  }, [barcodeStyle]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.xlsx')) {
      setError(t('xlsx.errors.onlyXlsx'));
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      const buffer = await file.arrayBuffer();
      const preview = await readWorkbook(buffer);
      setWorkbook(preview);
      setPlacement('right');
      setOriginalFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('xlsx.errors.loadFailed'));
    }
  };

  const handleReplaceFileClick = () => {
    if (isGenerating || !replaceFileInputRef.current) return;

    replaceFileInputRef.current.value = '';
    replaceFileInputRef.current.click();
  };

  const handleReplaceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      void handleFileSelect(Array.from(files));
    }

    event.target.value = '';
  };
  const previewLayout = useMemo(() => {
    if (!workbook) {
      return null;
    }

    const sourceColumnIndexes = workbook.detectedSourceColumnIndexes;
    const sourceColumnIndexSet = new Set(sourceColumnIndexes);
    const sourceRowNumbers = Array.from(
      new Set(
        workbook.rows.flatMap((row) =>
          row
            .filter((cell) => sourceColumnIndexSet.has(cell.columnIndex) && !cell.isEmpty)
            .map((cell) => cell.rowNumber),
        ),
      ),
    ).sort((a, b) => a - b);
    const originalRowCount = workbook.rows.length;
    const originalColumnCount = workbook.rows[0]?.length ?? 0;
    const insertedColumnCount =
      isLeftPlacement(placement) || isRightPlacement(placement) ? sourceColumnIndexes.length : 0;
    const insertedRowCount =
      isTopPlacement(placement) || isBottomPlacement(placement) ? sourceRowNumbers.length : 0;
    const rows: CellPreview[][] = Array.from(
      { length: originalRowCount + insertedRowCount },
      (_, rowIndex) =>
        Array.from({ length: originalColumnCount + insertedColumnCount }, (_, columnIndex) => ({
          rowNumber: rowIndex + 1,
          columnIndex,
          columnLetter: getColumnLetter(columnIndex),
          value: '',
          isEmpty: true,
        })),
    );

    const mapOriginalColumnIndex = (columnIndex: number): number => {
      if (isLeftPlacement(placement)) {
        return columnIndex + countLessThanOrEqual(sourceColumnIndexes, columnIndex);
      }

      if (isRightPlacement(placement)) {
        return columnIndex + countLessThan(sourceColumnIndexes, columnIndex);
      }

      return columnIndex;
    };

    const mapOriginalRowNumber = (rowNumber: number): number => {
      if (isTopPlacement(placement)) {
        return rowNumber + countLessThanOrEqual(sourceRowNumbers, rowNumber);
      }

      if (isBottomPlacement(placement)) {
        return rowNumber + countLessThan(sourceRowNumbers, rowNumber);
      }

      return rowNumber;
    };

    workbook.rows.forEach((row) => {
      row.forEach((cell) => {
        const previewColumnIndex = mapOriginalColumnIndex(cell.columnIndex);
        const previewRowNumber = mapOriginalRowNumber(cell.rowNumber);
        const isAutoSource = sourceColumnIndexSet.has(cell.columnIndex);
        const nextCell: CellPreview = {
          ...cell,
          rowNumber: previewRowNumber,
          columnIndex: previewColumnIndex,
          columnLetter: getColumnLetter(previewColumnIndex),
        };

        if (isAutoSource) {
          if (cell.isEmpty) {
            nextCell.isValid = true;
            nextCell.validationError = undefined;
          } else {
            const validation = validateBarcodeValue(barcodeType, cell.value);
            nextCell.isValid = validation.isValid;
            nextCell.validationError = validation.message;
          }
        }

        rows[previewRowNumber - 1][previewColumnIndex] = nextCell;

        if (!isAutoSource || cell.isEmpty) {
          return;
        }

        const validation = validateBarcodeValue(barcodeType, cell.value);
        if (!validation.isValid) {
          return;
        }

        const barcodeColumnIndex = isLeftPlacement(placement)
          ? previewColumnIndex - 1
          : isRightPlacement(placement)
            ? previewColumnIndex + 1
            : previewColumnIndex;
        const barcodeRowNumber = isTopPlacement(placement)
          ? previewRowNumber - 1
          : isBottomPlacement(placement)
            ? previewRowNumber + 1
            : previewRowNumber;

        rows[barcodeRowNumber - 1][barcodeColumnIndex] = {
          rowNumber: barcodeRowNumber,
          columnIndex: barcodeColumnIndex,
          columnLetter: getColumnLetter(barcodeColumnIndex),
          value: '',
          isEmpty: true,
          barcodePreviewData: {
            value: cell.value,
            type: barcodeType,
          },
        };
      });
    });

    const previewSourceColumnIndexes = sourceColumnIndexes.map(mapOriginalColumnIndex);
    const previewBarcodeColumnIndexes = sourceColumnIndexes.map((sourceColumnIndex) => {
      const previewSourceColumnIndex = mapOriginalColumnIndex(sourceColumnIndex);

      if (isLeftPlacement(placement)) {
        return previewSourceColumnIndex - 1;
      }

      if (isRightPlacement(placement)) {
        return previewSourceColumnIndex + 1;
      }

      return previewSourceColumnIndex;
    });

    return {
      workbook: {
        ...workbook,
        rows,
      },
      sourceColumnIndexes: previewSourceColumnIndexes,
      barcodeColumnIndexes: previewBarcodeColumnIndexes,
    };
  }, [barcodeType, placement, workbook]);

  const invalidSourceCount = useMemo(() => {
    if (!previewLayout) {
      return 0;
    }

    const previewSourceColumnIndexSet = new Set(previewLayout.sourceColumnIndexes);

    return previewLayout.workbook.rows
      .flatMap((row) =>
        row.filter(
          (cell) =>
            previewSourceColumnIndexSet.has(cell.columnIndex) &&
            !cell.isEmpty &&
            cell.isValid === false,
        ),
      )
      .length;
  }, [previewLayout]);

  const hasSourceData = (workbook?.detectedSourceColumnIndexes.length ?? 0) > 0;

  const isValidToGenerate = useMemo(() => {
    return hasSourceData && invalidSourceCount === 0 && isSettingsValid;
  }, [hasSourceData, invalidSourceCount, isSettingsValid]);

  const handleGenerate = async () => {
    if (!originalFile || !workbook || !isValidToGenerate) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setProgress({ current: 0, total: 1 });

    try {
      const fileBuffer = await originalFile.arrayBuffer();

      const fullWorkbook = new ExcelJS.Workbook();
      await fullWorkbook.xlsx.load(fileBuffer);
      const worksheet = fullWorkbook.getWorksheet(workbook.activeSheetName);

      if (!worksheet) {
        throw new Error(t('xlsx.errors.sheetMissingInFile'));
      }

      const sourceColumnIndexes = workbook.detectedSourceColumnIndexes;
      const sourceRowsByColumn = new Map<number, { rowNumber: number; value: string }[]>();

      sourceColumnIndexes.forEach((sourceColumnIndex) => {
        sourceRowsByColumn.set(sourceColumnIndex, []);
      });

      worksheet.eachRow((row, rowNumber) => {
        sourceColumnIndexes.forEach((sourceColumnIndex) => {
          const cell = row.getCell(sourceColumnIndex + 1);
          const value = getCellTextValue(cell.value);

          if (value.trim() !== '') {
            sourceRowsByColumn.get(sourceColumnIndex)?.push({ rowNumber, value });
          }
        });
      });

      const sourceColumns = sourceColumnIndexes
        .map((sourceColumnIndex) => ({
          sourceColumnIndex,
          rows: sourceRowsByColumn.get(sourceColumnIndex) ?? [],
        }))
        .filter((sourceColumn) => sourceColumn.rows.length > 0);

      const totalBarcodeCount = sourceColumns.reduce(
        (count, sourceColumn) => count + sourceColumn.rows.length,
        0,
      );

      if (totalBarcodeCount === 0) {
        throw new Error(t('xlsx.errors.noDataInColumn'));
      }

      const resultBlob = await writeWorkbookWithBarcodes({
        sourceFile: originalFile,
        sheetName: workbook.activeSheetName,
        barcodeType,
        barcodeStyle,
        placement,
        sourceColumns,
        onProgress: setProgress,
      });

      saveAs(resultBlob, createOutputFileName(originalFile.name));
      setSuccessMessage(t('xlsx.success.generated', { count: totalBarcodeCount }));
      setIsGenerating(false);
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('xlsx.errors.generateFailed'));
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const updateStyleField = (key: keyof typeof barcodeStyle, value: unknown) => {
    setBarcodeStyle((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.leftColumn}>
          <Panel
            className={styles.uploadPanel}
            title={t('xlsx.batch.title')}
            description={t('xlsx.batch.description')}
            compact
          >
            <div className={styles.controls}>
              <input
                ref={replaceFileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleReplaceFileChange}
                disabled={isGenerating}
                hidden
              />
              <div className={styles.field}>
                <label className={styles.label}>{t('generator.fields.type')}</label>
                <SearchableSelect
                  options={BARCODE_TYPE_OPTIONS}
                  value={barcodeType}
                  onChange={(value) => setBarcodeType(value as BarcodeType)}
                  disabled={isGenerating}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              {successMessage && (
                <div className={styles.success}>
                  <CheckCircle2 size={16} />
                  {successMessage}
                </div>
              )}
            </div>
          </Panel>

          <Panel
            className={styles.appearancePanel}
            contentClassName={styles.appearancePanelContent}
            fullHeight
            title={t('xlsx.appearance.title')}
            description={t('xlsx.appearance.description')}
            compact
          >
            <div className={styles.appearanceBody}>
              <div className={styles.settingsGrid}>
                <Field label={t('generator.fields.height')} htmlFor="xlsx-height">
                  <TextInput
                    id="xlsx-height"
                    type="number"
                    min={4}
                    max={400}
                    step={2}
                    value={barcodeStyle.height}
                    onChange={(event) =>
                      updateStyleField(
                        'height',
                        toNumber(event.target.value, barcodeStyle.height, 4, 400),
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
                <Field label={t('generator.fields.barWidth')} htmlFor="xlsx-barwidth">
                  <TextInput
                    id="xlsx-barwidth"
                    type="number"
                    min={1}
                    max={12}
                    step={1}
                    value={barcodeStyle.barWidth}
                    onChange={(event) =>
                      updateStyleField(
                        'barWidth',
                        toNumber(event.target.value, barcodeStyle.barWidth, 1, 12),
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
                <Field label={t('generator.fields.scale')} htmlFor="xlsx-scale">
                  <TextInput
                    id="xlsx-scale"
                    type="number"
                    min={0.5}
                    max={4}
                    step={0.25}
                    value={barcodeStyle.scale}
                    onChange={(event) =>
                      updateStyleField(
                        'scale',
                        toNumber(event.target.value, barcodeStyle.scale, 0.5, 4),
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
                <Field label={t('generator.fields.fontSize')} htmlFor="xlsx-fontsize">
                  <TextInput
                    id="xlsx-fontsize"
                    type="number"
                    min={4}
                    max={128}
                    step={1}
                    value={barcodeStyle.fontSize}
                    onChange={(event) =>
                      updateStyleField(
                        'fontSize',
                        toNumber(event.target.value, barcodeStyle.fontSize, 4, 128),
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
                <Field label={t('generator.fields.margin')} htmlFor="xlsx-margin">
                  <TextInput
                    id="xlsx-margin"
                    type="number"
                    min={0}
                    max={80}
                    step={4}
                    value={barcodeStyle.margin}
                    onChange={(event) =>
                      updateStyleField(
                        'margin',
                        toNumber(event.target.value, barcodeStyle.margin, 0, 80),
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
                <Field label={t('generator.fields.barColor')} htmlFor="xlsx-barcolor">
                  <TextInput
                    id="xlsx-barcolor"
                    type="color"
                    value={barcodeStyle.barColor}
                    onChange={(event) => updateStyleField('barColor', event.target.value)}
                    disabled={isGenerating}
                  />
                </Field>
                <Field
                  label={t('generator.fields.backgroundColor')}
                  htmlFor="xlsx-bgcolor"
                >
                  <TextInput
                    id="xlsx-bgcolor"
                    type="color"
                    value={barcodeStyle.backgroundColor}
                    onChange={(event) => updateStyleField('backgroundColor', event.target.value)}
                    disabled={isGenerating}
                  />
                </Field>
                <Field
                  label={t('generator.fields.text')}
                  htmlFor="xlsx-showtext"
                >
                  <SelectInput
                    id="xlsx-showtext"
                    value={barcodeStyle.showText ? 'show' : 'hide'}
                    onChange={(event) =>
                      updateStyleField('showText', event.target.value === 'show')
                    }
                    disabled={isGenerating}
                  >
                    <option value="show">{t('generator.textOptions.show')}</option>
                    <option value="hide">{t('generator.textOptions.hide')}</option>
                  </SelectInput>
                </Field>
              </div>
              <div className={styles.placementField}>
                <label className={styles.label}>{t('xlsx.placement.label')}</label>
                <div className={styles.placementMatrix}>
                  {PLACEMENT_OPTIONS.slice(0, 3).map(({ value, icon: Icon, labelKey }) => (
                    <button
                      key={value}
                      type="button"
                      className={clsx(styles.matrixButton, {
                        [styles.active]: placement === value,
                      })}
                      title={t(labelKey)}
                      aria-label={t(labelKey)}
                      onClick={() => setPlacement(value)}
                      disabled={isGenerating}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                  {PLACEMENT_OPTIONS.slice(3, 4).map(({ value, icon: Icon, labelKey }) => (
                    <button
                      key={value}
                      type="button"
                      className={clsx(styles.matrixButton, {
                        [styles.active]: placement === value,
                      })}
                      title={t(labelKey)}
                      aria-label={t(labelKey)}
                      onClick={() => setPlacement(value)}
                      disabled={isGenerating}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                  <div className={styles.matrixCenter} aria-hidden="true">
                    <Type size={16} />
                  </div>
                  {PLACEMENT_OPTIONS.slice(4, 5).map(({ value, icon: Icon, labelKey }) => (
                    <button
                      key={value}
                      type="button"
                      className={clsx(styles.matrixButton, {
                        [styles.active]: placement === value,
                      })}
                      title={t(labelKey)}
                      aria-label={t(labelKey)}
                      onClick={() => setPlacement(value)}
                      disabled={isGenerating}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                  {PLACEMENT_OPTIONS.slice(5).map(({ value, icon: Icon, labelKey }) => (
                    <button
                      key={value}
                      type="button"
                      className={clsx(styles.matrixButton, {
                        [styles.active]: placement === value,
                      })}
                      title={t(labelKey)}
                      aria-label={t(labelKey)}
                      onClick={() => setPlacement(value)}
                      disabled={isGenerating}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
              {!isSettingsValid && (
                <div className={styles.error}>
                  {t('xlsx.errors.invalidAppearance')}
                </div>
              )}
            </div>

            {workbook && (
              <>
                <Button
                  variant="accent"
                  onClick={handleReplaceFileClick}
                  disabled={isGenerating}
                  fullWidth
                  className={styles.changeFileButton}
                >
                  <UploadCloud size={18} />
                  {t('xlsx.dropzone.changeFile')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  fullWidth
                  disabled={!isValidToGenerate || isGenerating}
                  progress={
                    isGenerating && progress
                      ? (progress.current / progress.total) * 100
                      : undefined
                  }
                >
                  {isGenerating
                    ? `${Math.round(((progress?.current ?? 0) / (progress?.total ?? 1)) * 100)}%`
                    : t('generator.actions.generate')}
                </Button>
              </>
            )}
          </Panel>
        </div>

        <div className={styles.rightColumn}>
          <Panel
            className={styles.previewPanel}
            contentClassName={styles.previewPanelContent}
            fullHeight
            title={
              workbook
                ? t('xlsx.preview.titleWithSheet', { sheetName: workbook.activeSheetName })
                : t('xlsx.preview.title')
            }
            compact
          >
            {workbook ? (
              <div className={styles.previewWorkspace}>
                <div className={styles.previewContainer}>
                  {previewLayout && (
                    <XlsxWorkbookViewer
                      workbook={previewLayout.workbook}
                      sourceColumnIndexes={previewLayout.sourceColumnIndexes}
                      barcodeColumnIndexes={previewLayout.barcodeColumnIndexes}
                      barcodeStyle={barcodeStyle}
                    />
                  )}
                </div>
              </div>
            ) : (
              <Dropzone
                className={styles.previewDropzone}
                onFilesSelected={handleFileSelect}
                accept=".xlsx"
                title={originalFile ? originalFile.name : t('xlsx.preview.placeholder')}
                description={
                  originalFile ? t('xlsx.dropzone.changeFile') : t('xlsx.dropzone.dropOrClick')
                }
                fileIcon={<FileSpreadsheet />}
                disabled={isGenerating}
                iconClusterClassName={styles.xlsxDropzoneIconCluster}
                titleClassName={styles.xlsxDropzoneTitle}
                descriptionClassName={styles.xlsxDropzoneDescription}
              />
            )}
          </Panel>
        </div>
      </div>

      {navigationBlocker.state === 'blocked' && (
        <div
          className={styles.leaveDialogBackdrop}
          role="presentation"
          onClick={() => navigationBlocker.reset()}
        >
          <div
            className={styles.leaveDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="xlsx-leave-dialog-title"
            aria-describedby="xlsx-leave-dialog-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.leaveDialogBody}>
              <span className={styles.leaveDialogEyebrow}>{t('xlsx.leaveGuard.eyebrow')}</span>
              <h2 id="xlsx-leave-dialog-title" className={styles.leaveDialogTitle}>
                {t('xlsx.leaveGuard.title')}
              </h2>
              <p id="xlsx-leave-dialog-description" className={styles.leaveDialogDescription}>
                {t('xlsx.leaveGuard.description')}
              </p>
            </div>
            <div className={styles.leaveDialogActions}>
              <Button variant="secondary" onClick={() => navigationBlocker.reset()}>
                {t('xlsx.leaveGuard.cancel')}
              </Button>
              <Button variant="primary" onClick={() => navigationBlocker.proceed()}>
                {t('xlsx.leaveGuard.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
