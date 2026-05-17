import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, CheckCircle2, FileSpreadsheet, Type, UploadCloud } from 'lucide-react';
import { saveAs } from 'file-saver';
import type { BarcodeType } from '../../features/barcode/types/barcode';
import type { WorkbookPreview, SelectedColumns, XlsxPlacement, CellPreview } from '../../features/xlsx/types/xlsx';
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
import clsx from 'clsx';
import ExcelJS from 'exceljs';

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
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumns>({
    sourceColumnIndex: null,
    targetColumnIndex: null,
    placement: 'right',
  });
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
      setOriginalFile(file);
      setSelectedColumns({ sourceColumnIndex: null, targetColumnIndex: null, placement: 'right' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('xlsx.errors.loadFailed'));
    }
  };

  const handleColumnClick = (columnIndex: number) => {
    if (isGenerating) return;

    setSelectedColumns((prev) => {
      if (prev.sourceColumnIndex === null) {
        return {
          ...prev,
          sourceColumnIndex: columnIndex,
          targetColumnIndex: columnIndex,
        };
      }

      return { ...prev, targetColumnIndex: columnIndex };
    });
  };

  const handleClearSelection = () => {
    setSelectedColumns({ sourceColumnIndex: null, targetColumnIndex: null, placement: 'right' });
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

  const sourceRowsWithData = useMemo(() => {
    if (!workbook || selectedColumns.sourceColumnIndex === null) return [];

    return workbook.rows
      .filter((row) => {
        const sourceCell = row.find(
          (cell) => cell.columnIndex === selectedColumns.sourceColumnIndex,
        );

        return sourceCell && !sourceCell.isEmpty;
      })
      .map((row) => {
        const cell = row.find(
          (candidate) => candidate.columnIndex === selectedColumns.sourceColumnIndex,
        )!;

        return { rowNumber: cell.rowNumber, value: cell.value };
      });
  }, [workbook, selectedColumns.sourceColumnIndex]);

  const validatedRows = useMemo(() => {
    if (!workbook) return [];

    const resultRows: CellPreview[][] = [];
    let currentRowCounter = workbook.rows.length > 0 ? workbook.rows[0][0].rowNumber : 1;

    workbook.rows.forEach((row) => {
      const sourceCell = row.find(c => c.columnIndex === selectedColumns.sourceColumnIndex);
      const sourceValue = sourceCell?.value ?? '';
      const isSourceValid = sourceValue.trim() !== '' && validateBarcodeValue(barcodeType, sourceValue).isValid;

      if (selectedColumns.placement.startsWith('top') && isSourceValid) {
        let hOffset = 0;
        if (selectedColumns.placement.endsWith('-left')) hOffset = -1;
        else if (selectedColumns.placement.endsWith('-right')) hOffset = 1;

        const barcodeColIndex = Math.max(0, (selectedColumns.targetColumnIndex ?? 0) + hOffset);

        const barcodeRow: CellPreview[] = row.map((cell) => {
          if (cell.columnIndex === barcodeColIndex) {
            return {
              ...cell,
              rowNumber: currentRowCounter,
              value: '',
              isEmpty: true,
              barcodePreviewData: {
                value: sourceValue,
                type: barcodeType,
              },
            };
          }
          return { ...cell, rowNumber: currentRowCounter, value: '', isEmpty: true, barcodePreviewData: undefined };
        });
        resultRows.push(barcodeRow);
        currentRowCounter++;
      }

      const validatedOriginalRow = row.map((cell) => {
        const baseCell = { ...cell, rowNumber: currentRowCounter };

        if (selectedColumns.sourceColumnIndex === cell.columnIndex) {
          if (cell.isEmpty) {
            return { ...baseCell, isValid: true };
          }

          const result = validateBarcodeValue(barcodeType, cell.value);
          return {
            ...baseCell,
            isValid: result.isValid,
            validationError: result.message,
          };
        }

        if (
          selectedColumns.targetColumnIndex === cell.columnIndex &&
          (selectedColumns.placement === 'left' || selectedColumns.placement === 'right')
        ) {
          if (isSourceValid) {
            return {
              ...baseCell,
              barcodePreviewData: {
                value: sourceValue,
                type: barcodeType,
              },
            };
          }
        }

        return baseCell;
      });
      resultRows.push(validatedOriginalRow);
      currentRowCounter++;

      if (selectedColumns.placement.startsWith('bottom') && isSourceValid) {
        let hOffset = 0;
        if (selectedColumns.placement.endsWith('-left')) hOffset = -1;
        else if (selectedColumns.placement.endsWith('-right')) hOffset = 1;

        const barcodeColIndex = Math.max(0, (selectedColumns.targetColumnIndex ?? 0) + hOffset);

        const barcodeRow: CellPreview[] = row.map((cell) => {
          if (cell.columnIndex === barcodeColIndex) {
            return {
              ...cell,
              rowNumber: currentRowCounter,
              value: '',
              isEmpty: true,
              barcodePreviewData: {
                value: sourceValue,
                type: barcodeType,
              },
            };
          }
          return { ...cell, rowNumber: currentRowCounter, value: '', isEmpty: true, barcodePreviewData: undefined };
        });
        resultRows.push(barcodeRow);
        currentRowCounter++;
      }
    });

    return resultRows;
  }, [
    workbook,
    selectedColumns.sourceColumnIndex,
    selectedColumns.targetColumnIndex,
    selectedColumns.placement,
    barcodeType,
  ]);

  const invalidSourceCount = useMemo(() => {
    if (!workbook || selectedColumns.sourceColumnIndex === null) {
      return 0;
    }

    return validatedRows
      .flatMap((row) =>
        row.filter(
          (cell) =>
            cell.columnIndex === selectedColumns.sourceColumnIndex &&
            !cell.isEmpty &&
            cell.isValid === false,
        ),
      )
      .length;
  }, [validatedRows, workbook, selectedColumns.sourceColumnIndex]);

  const hasSourceData = sourceRowsWithData.length > 0;

  const isValidToGenerate = useMemo(() => {
    return (
      selectedColumns.sourceColumnIndex !== null &&
      selectedColumns.targetColumnIndex !== null &&
      invalidSourceCount === 0 &&
      hasSourceData &&
      isSettingsValid
    );
  }, [
    selectedColumns,
    invalidSourceCount,
    hasSourceData,
    isSettingsValid,
  ]);

  const handleGenerate = async () => {
    if (
      !originalFile ||
      !workbook ||
      !isValidToGenerate ||
      selectedColumns.sourceColumnIndex === null ||
      selectedColumns.targetColumnIndex === null
    ) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setProgress(null);

    try {
      const fileBuffer = await originalFile.arrayBuffer();
      const sourceColumnIndex = selectedColumns.sourceColumnIndex;

      const fullWorkbook = new ExcelJS.Workbook();
      await fullWorkbook.xlsx.load(fileBuffer);
      const worksheet = fullWorkbook.getWorksheet(workbook.activeSheetName);

      if (!worksheet) {
        throw new Error(t('xlsx.errors.sheetMissingInFile'));
      }

      const allSourceRows: { rowNumber: number; value: string }[] = [];
      worksheet.eachRow((row, rowNumber) => {
        const cell = row.getCell(sourceColumnIndex + 1);
        let value = '';

        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'result' in cell.value) {
            value = String(cell.value.result ?? '');
          } else if (typeof cell.value === 'object' && 'text' in cell.value) {
            value = String(cell.value.text ?? '');
          } else {
            value = String(cell.value);
          }
        }

        if (value.trim() !== '') {
          allSourceRows.push({ rowNumber, value });
        }
      });

      if (allSourceRows.length === 0) {
        throw new Error(t('xlsx.errors.noDataInColumn'));
      }

      const resultBlob = await writeWorkbookWithBarcodes({
        sourceFile: originalFile,
        sheetName: workbook.activeSheetName,
        targetColumnIndex: selectedColumns.targetColumnIndex,
        placement: selectedColumns.placement,
        barcodeType,
        barcodeStyle,
        sourceRows: allSourceRows,
      });

      saveAs(resultBlob, createOutputFileName(originalFile.name));
      setSuccessMessage(t('xlsx.success.generated', { count: allSourceRows.length }));
      setIsGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('xlsx.errors.generateFailed'));
      setIsGenerating(false);
    }
  };

  const updateStyleField = (key: keyof typeof barcodeStyle, value: unknown) => {
    setBarcodeStyle((prev) => ({ ...prev, [key]: value }));
  };

  const handlePlacementChange = (placement: XlsxPlacement) => {
    if (isGenerating) return;
    setSelectedColumns(prev => ({ ...prev, placement }));
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

              {workbook && (
                <div className={styles.field}>
                  <label className={styles.label}>Pozycja wzglÄ™dem tekstu</label>

                  <div className={styles.placementMatrix}>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'top-left' })}
                      onClick={() => handlePlacementChange('top-left')}
                      title="PowyĹĽej w lewo"
                      disabled={isGenerating}
                    >
                      <ArrowUpLeft size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'top' })}
                      onClick={() => handlePlacementChange('top')}
                      title="PowyĹĽej"
                      disabled={isGenerating}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'top-right' })}
                      onClick={() => handlePlacementChange('top-right')}
                      title="PowyĹĽej w prawo"
                      disabled={isGenerating}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'left' })}
                      onClick={() => handlePlacementChange('left')}
                      title="Po lewej"
                      disabled={isGenerating}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className={styles.matrixCenter}>
                      <Type size={16} />
                    </div>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'right' })}
                      onClick={() => handlePlacementChange('right')}
                      title="Po prawej"
                      disabled={isGenerating}
                    >
                      <ArrowRight size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'bottom-left' })}
                      onClick={() => handlePlacementChange('bottom-left')}
                      title="PoniĹĽej w lewo"
                      disabled={isGenerating}
                    >
                      <ArrowDownLeft size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'bottom' })}
                      onClick={() => handlePlacementChange('bottom')}
                      title="PoniĹĽej"
                      disabled={isGenerating}
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      className={clsx(styles.matrixButton, { [styles.active]: selectedColumns.placement === 'bottom-right' })}
                      onClick={() => handlePlacementChange('bottom-right')}
                      title="PoniĹĽej w prawo"
                      disabled={isGenerating}
                    >
                      <ArrowDownRight size={18} />
                    </button>
                  </div>
                </div>
              )}

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
                <div className={styles.actionsRow}>
                  <Button
                    variant="secondary"
                    onClick={handleClearSelection}
                    fullWidth
                    disabled={
                      isGenerating ||
                      (selectedColumns.sourceColumnIndex === null &&
                        selectedColumns.targetColumnIndex === null)
                    }
                    className={styles.actionButton}
                  >
                    {t('xlsx.actions.deselect')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    fullWidth
                    disabled={!isValidToGenerate || isGenerating}
                    className={styles.actionButton}
                    progress={isGenerating && progress ? (progress.current / progress.total) * 100 : undefined}
                  >
                    {isGenerating
                      ? progress
                        ? `${t('generator.actions.generating')} (${Math.round((progress.current / progress.total) * 100)}%)`
                        : t('generator.actions.generating')
                      : t('generator.actions.generate')}
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
                  <XlsxWorkbookViewer
                    workbook={{ ...workbook, rows: validatedRows }}
                    selectedColumns={selectedColumns}
                    onColumnClick={handleColumnClick}
                    barcodeStyle={barcodeStyle}
                  />
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
