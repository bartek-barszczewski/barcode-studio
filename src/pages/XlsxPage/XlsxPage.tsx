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
  Bold,
  CheckCircle2,
  FileSpreadsheet,
  Italic,
  Type,
  UploadCloud,
  Printer,
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
import { preparePrintCards } from '../../features/xlsx/utils/preparePrintData';
import { openPrintCardsDocument } from '../../features/xlsx/utils/openPrintCardsDocument';
import { Button } from '../../shared/ui/Button/Button';
import { Field } from '../../shared/ui/Field/Field';
import { TextInput } from '../../shared/ui/TextInput/TextInput';
import { SelectInput } from '../../shared/ui/SelectInput/SelectInput';
import { Slider } from '../../shared/ui/Slider/Slider';
import { toNumber } from '../../shared/utils/number';
import ExcelJS from 'exceljs';
import { getColumnLetter } from '../../features/xlsx/utils/columnUtils';
import clsx from 'clsx';

const MAX_BARCODE_SCALE = 2.5;
const MAX_BARCODE_HEIGHT = 512;
const MAX_BARCODE_MARGIN = 128;
const MAX_BARCODE_BAR_WIDTH = 4;
const MIN_BARCODE_BAR_WIDTH = 0.75;
const BARCODE_BAR_WIDTH_STEP = 0.25;
const MAX_BARCODE_FONT_SIZE = 128;
const MAX_TEXT_ROTATION = 360;
const TEXT_ROTATION_STEP = 5;

const TEXT_POSITION_OPTIONS: Array<{
  value: 'top' | 'bottom' | 'left' | 'right';
  icon: typeof ArrowUp;
  labelKey: string;
}> = [
  { value: 'top', icon: ArrowUp, labelKey: 'generator.textEditor.positions.top' },
  { value: 'left', icon: ArrowLeft, labelKey: 'generator.textEditor.positions.left' },
  { value: 'right', icon: ArrowRight, labelKey: 'generator.textEditor.positions.right' },
  { value: 'bottom', icon: ArrowDown, labelKey: 'generator.textEditor.positions.bottom' },
];

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
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128');
  const [placement, setPlacement] = useState<XlsxPlacement>('right');
  const [barcodeStyle, setBarcodeStyle] = useState({
    rotation: 0 as const,
    barColor: '#0A0F0D',
    backgroundColor: '#FFFFFF',
    transparentBackground: false,
    height: 64,
    margin: 8,
    barWidth: 1,
    fontSize: 16,
    scale: 1,
    showText: true,
    textBold: false,
    textItalic: false,
    textPosition: 'bottom' as const,
    textRotation: 0,
  });

  const isBusy = isGenerating || isPreparingPrint;
  const hasUnsavedChanges = originalFile !== null && !isBusy;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
  });

  const isSettingsValid = useMemo(() => {
    return (
      barcodeStyle.height >= 1 &&
      barcodeStyle.height <= 512 &&
      barcodeStyle.barWidth >= MIN_BARCODE_BAR_WIDTH &&
      barcodeStyle.barWidth <= MAX_BARCODE_BAR_WIDTH &&
      barcodeStyle.scale >= 0.5 &&
      barcodeStyle.scale <= 2.5 &&
      barcodeStyle.fontSize >= 8 &&
      barcodeStyle.fontSize <= 128 &&
      barcodeStyle.margin >= 0 &&
      barcodeStyle.margin <= 128
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
    if (isBusy || !replaceFileInputRef.current) return;

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

  const handlePrintCards = async () => {
    if (!originalFile || !workbook) {
      return;
    }

    setIsPreparingPrint(true);
      setError(null);
      setSuccessMessage(null);

    try {
      const cards = await preparePrintCards(
        originalFile,
        workbook.activeSheetName,
        barcodeType,
        barcodeStyle,
      );
      await openPrintCardsDocument(cards, `${originalFile.name.replace(/\.xlsx$/i, '')} - Print cards`);
      setSuccessMessage(
        t('xlsx.success.printReady', {
          count: cards.length,
          defaultValue: 'Prepared {{count}} cards for print.',
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('xlsx.errors.unknown'));
    } finally {
      setIsPreparingPrint(false);
    }
  };

  const updateStyleField = (key: keyof typeof barcodeStyle, value: unknown) => {
    setBarcodeStyle((prev) => ({ ...prev, [key]: value }));
  };

  const textPosition = barcodeStyle.textPosition ?? 'bottom';
  const textRotation = barcodeStyle.textRotation ?? 0;
  const textBold = Boolean(barcodeStyle.textBold);
  const textItalic = Boolean(barcodeStyle.textItalic);
  const transparentBackgroundLabel = t('generator.fields.transparentBackground', {
    defaultValue: 'Przezroczystość',
  });

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
                disabled={isBusy}
                hidden
              />
              <div className={styles.field}>
                <label className={styles.label}>{t('generator.fields.type')}</label>
                <SearchableSelect
                  options={BARCODE_TYPE_OPTIONS.map((option) => ({
                    ...option,
                    label: t(`barcode.types.${option.value}`),
                  }))}
                  value={barcodeType}
                  onChange={(value) => setBarcodeType(value as BarcodeType)}
                  disabled={isBusy}
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
              <div className={styles.toggles}>
                <label className={styles.checkboxToggle}>
                  <input
                    checked={barcodeStyle.showText}
                    className={styles.checkboxInput}
                    onChange={(event) => updateStyleField('showText', event.target.checked)}
                    type="checkbox"
                    disabled={isGenerating || isPreparingPrint}
                  />
                  <span aria-hidden="true" className={styles.checkboxControl}>
                    <span className={styles.checkboxMark} />
                  </span>
                  <span className={styles.checkboxLabel}>{t('generator.fields.text')}</span>
                </label>

                <label className={styles.checkboxToggle}>
                  <input
                    checked={Boolean(barcodeStyle.transparentBackground)}
                    className={styles.checkboxInput}
                    onChange={(event) =>
                      updateStyleField('transparentBackground', event.target.checked)
                    }
                    type="checkbox"
                    disabled={isGenerating || isPreparingPrint}
                  />
                  <span aria-hidden="true" className={styles.checkboxControl}>
                    <span className={styles.checkboxMark} />
                  </span>
                  <span className={styles.checkboxLabel}>{transparentBackgroundLabel}</span>
                </label>
              </div>

              <section
                className={clsx(
                  styles.textEditorCard,
                  !barcodeStyle.showText && styles.textEditorCardDisabled,
                )}
              >
                <div className={styles.textEditorHeader}>
                  <Type aria-hidden="true" className={styles.textEditorBadge} size={16} />
                  <div className={styles.textEditorCopy}>
                    <h3 className={styles.textEditorTitle}>{t('generator.textEditor.title')}</h3>
                    <p className={styles.textEditorDescription}>
                      {t('generator.textEditor.description')}
                    </p>
                  </div>
                </div>

                <div className={styles.textEditorGrid}>
                  <div className={styles.editorBlock}>
                    <span className={styles.editorLabel}>{t('generator.fields.textStyle')}</span>
                    <div className={styles.iconToggleGroup}>
                      <button
                        aria-label={t('generator.textEditor.bold')}
                        aria-pressed={textBold}
                        className={clsx(styles.iconToggle, textBold && styles.iconToggleActive)}
                        disabled={!barcodeStyle.showText || isGenerating || isPreparingPrint}
                        onClick={() => updateStyleField('textBold', !textBold)}
                        title={t('generator.textEditor.bold')}
                        type="button"
                      >
                        <Bold size={16} />
                      </button>

                      <button
                        aria-label={t('generator.textEditor.italic')}
                        aria-pressed={textItalic}
                        className={clsx(
                          styles.iconToggle,
                          textItalic && styles.iconToggleActive,
                        )}
                        disabled={!barcodeStyle.showText || isGenerating || isPreparingPrint}
                        onClick={() => updateStyleField('textItalic', !textItalic)}
                        title={t('generator.textEditor.italic')}
                        type="button"
                      >
                        <Italic size={16} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.editorBlock}>
                    <span className={styles.editorLabel}>
                      {t('generator.fields.textPosition')}
                    </span>
                    <div className={styles.iconToggleGroup}>
                      {TEXT_POSITION_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                        <button
                          key={value}
                          aria-label={t(labelKey)}
                          aria-pressed={textPosition === value}
                          className={clsx(
                            styles.iconToggle,
                            textPosition === value && styles.iconToggleActive,
                          )}
                          disabled={
                            !barcodeStyle.showText || isGenerating || isPreparingPrint
                          }
                          onClick={() => updateStyleField('textPosition', value)}
                          title={t(labelKey)}
                          type="button"
                        >
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.rotationBlock}>
                    <Slider
                      disabled={!barcodeStyle.showText || isGenerating || isPreparingPrint}
                      id="xlsx-text-rotation"
                      label={t('generator.fields.textRotation')}
                      max={MAX_TEXT_ROTATION}
                      min={0}
                      onChange={(event) =>
                        updateStyleField(
                          'textRotation',
                          toNumber(event.target.value, textRotation, 0, MAX_TEXT_ROTATION),
                        )
                      }
                      step={TEXT_ROTATION_STEP}
                      suffix="°"
                      value={textRotation}
                    />
                  </div>
                </div>
              </section>

              <div className={styles.fieldGrid}>
                <Field label={t('generator.fields.rotation')} htmlFor="xlsx-rotation">
                  <SelectInput
                    id="xlsx-rotation"
                    onChange={(event) =>
                      updateStyleField('rotation', Number.parseInt(event.target.value, 10))
                    }
                    value={barcodeStyle.rotation}
                    disabled={isGenerating || isPreparingPrint}
                  >
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </SelectInput>
                </Field>

                <Slider
                  id="xlsx-scale"
                  label={t('generator.fields.scale')}
                  max={MAX_BARCODE_SCALE}
                  min={0.5}
                  onChange={(event) =>
                    updateStyleField(
                      'scale',
                      toNumber(event.target.value, barcodeStyle.scale, 0.5, MAX_BARCODE_SCALE),
                    )
                  }
                  step={0.25}
                  suffix="x"
                  value={barcodeStyle.scale}
                  disabled={isGenerating || isPreparingPrint}
                />
              </div>

              <div className={styles.fieldGrid}>
                <Field label={t('generator.fields.barColor')} htmlFor="xlsx-barcolor">
                  <TextInput
                    id="xlsx-barcolor"
                    onChange={(event) => updateStyleField('barColor', event.target.value)}
                    type="color"
                    value={barcodeStyle.barColor}
                    disabled={isGenerating || isPreparingPrint}
                  />
                </Field>

                <Field label={t('generator.fields.backgroundColor')} htmlFor="xlsx-bgcolor">
                  <TextInput
                    id="xlsx-bgcolor"
                    onChange={(event) => updateStyleField('backgroundColor', event.target.value)}
                    type="color"
                    value={barcodeStyle.backgroundColor}
                    disabled={isGenerating || isPreparingPrint}
                  />
                </Field>
              </div>

              <div className={styles.fieldGrid}>
                <Slider
                  id="xlsx-height"
                  label={t('generator.fields.height')}
                  max={MAX_BARCODE_HEIGHT}
                  min={1}
                  onChange={(event) =>
                    updateStyleField(
                      'height',
                      toNumber(event.target.value, barcodeStyle.height, 1, MAX_BARCODE_HEIGHT),
                    )
                  }
                  step={1}
                  suffix="px"
                  value={barcodeStyle.height}
                  disabled={isGenerating || isPreparingPrint}
                />

                <Slider
                  id="xlsx-margin"
                  label={t('generator.fields.margin')}
                  max={MAX_BARCODE_MARGIN}
                  min={0}
                  onChange={(event) =>
                    updateStyleField(
                      'margin',
                      toNumber(event.target.value, barcodeStyle.margin, 0, MAX_BARCODE_MARGIN),
                    )
                  }
                  step={1}
                  suffix="px"
                  value={barcodeStyle.margin}
                  disabled={isGenerating || isPreparingPrint}
                />
              </div>

              <div className={styles.fieldGrid}>
                <Slider
                  id="xlsx-bar-width"
                  label={t('generator.fields.barWidth')}
                  max={MAX_BARCODE_BAR_WIDTH}
                  min={MIN_BARCODE_BAR_WIDTH}
                  onChange={(event) =>
                    updateStyleField(
                      'barWidth',
                      toNumber(
                        event.target.value,
                        barcodeStyle.barWidth,
                        MIN_BARCODE_BAR_WIDTH,
                        MAX_BARCODE_BAR_WIDTH,
                      ),
                    )
                  }
                  step={BARCODE_BAR_WIDTH_STEP}
                  value={barcodeStyle.barWidth}
                  disabled={isGenerating || isPreparingPrint}
                />

                <Slider
                  id="xlsx-font-size"
                  label={t('generator.fields.fontSize')}
                  max={MAX_BARCODE_FONT_SIZE}
                  min={8}
                  onChange={(event) =>
                    updateStyleField(
                      'fontSize',
                      toNumber(
                        event.target.value,
                        barcodeStyle.fontSize,
                        8,
                        MAX_BARCODE_FONT_SIZE,
                      ),
                    )
                  }
                  step={1}
                  suffix="px"
                  value={barcodeStyle.fontSize}
                  disabled={isGenerating || isPreparingPrint}
                />
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
                      disabled={isGenerating || isPreparingPrint}
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
                      disabled={isGenerating || isPreparingPrint}
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
                      disabled={isGenerating || isPreparingPrint}
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
                      disabled={isGenerating || isPreparingPrint}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
              {!isSettingsValid && (
                <div className={styles.error}>{t('xlsx.errors.invalidAppearance')}</div>
              )}
            </div>

            {workbook && (
              <>
                <Button
                  variant="accent"
                  onClick={handleReplaceFileClick}
                  disabled={isGenerating || isPreparingPrint}
                  fullWidth
                  className={styles.changeFileButton}
                >
                  <UploadCloud size={18} />
                  {t('xlsx.dropzone.changeFile')}
                </Button>
                <div className={styles.actionsRow}>
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    fullWidth
                    disabled={!isValidToGenerate || isGenerating || isPreparingPrint}
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
                  <Button
                    variant="secondary"
                    onClick={handlePrintCards}
                    fullWidth
                    disabled={isGenerating || isPreparingPrint}
                    progress={isPreparingPrint ? 100 : undefined}
                  >
                    <Printer size={18} />
                    {isPreparingPrint
                      ? t('xlsx.print.preparing')
                      : t('xlsx.actions.printCards')}
                  </Button>
                </div>
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
                disabled={isGenerating || isPreparingPrint}
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
