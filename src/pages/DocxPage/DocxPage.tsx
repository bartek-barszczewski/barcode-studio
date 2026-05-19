import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';
import { FileText, CheckCircle2, Printer } from 'lucide-react';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import type { BarcodeFormState, BarcodeType } from '../../features/barcode/types/barcode';
import type { DocxPreview } from '../../features/docx/types/docx';
import styles from './DocxPage.module.css';
import { Dropzone } from '../../shared/ui/Dropzone/Dropzone';
import { Panel } from '../../shared/ui/Panel/Panel';
import { readDocx } from '../../features/docx/utils/readDocx';
import { writeDocxWithBarcodes, createDocxOutputFileName } from '../../features/docx/utils/writeDocxWithBarcodes';
import { DocxViewer } from '../../features/docx/components/DocxViewer/DocxViewer';
import { printDocxPreview } from '../../features/docx/utils/printDocxPreview';
import { SearchableSelect } from '../../shared/ui/SearchableSelect/SearchableSelect';
import { BARCODE_TYPE_OPTIONS } from '../../features/barcode/constants/barcodeTypes';
import { Button } from '../../shared/ui/Button/Button';
import { BarcodeForm } from '../../features/barcode/components/BarcodeForm/BarcodeForm';

const DOCX_FORM_DEFAULTS: BarcodeFormState = {
  type: 'CODE128',
  value: '',
  displayValue: '',
  rotation: 0,
  barColor: '#0A0F0D',
  backgroundColor: '#FFFFFF',
  transparentBackground: false,
  height: 32,
  margin: 8,
  barWidth: 3,
  fontSize: 20,
  scale: 1,
  showText: false,
  textBold: false,
  textItalic: false,
  textPosition: 'bottom',
  textRotation: 0,
};

export function DocxPage() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DocxPreview>({ 
    lines: [{ index: 0, html: '', text: '', isEmpty: true }] 
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [docxFormState, setDocxFormState] = useState<BarcodeFormState>(DOCX_FORM_DEFAULTS);
  const hasUnsavedChanges = originalFile !== null && !isGenerating;
  const previewPaperRef = useRef<HTMLDivElement | null>(null);
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
  });

  const isSettingsValid = useMemo(() => {
    return (
      docxFormState.height >= 1 &&
      docxFormState.height <= 512 &&
      docxFormState.barWidth >= 1 &&
      docxFormState.barWidth <= 6 &&
      docxFormState.scale >= 0.5 &&
      docxFormState.scale <= 2.5 &&
      docxFormState.fontSize >= 8 &&
      docxFormState.fontSize <= 128 &&
      docxFormState.margin >= 0 &&
      docxFormState.margin <= 128 &&
      [0, 90, 180, 270].includes(docxFormState.rotation) &&
      (docxFormState.textRotation ?? 0) >= 0 &&
      (docxFormState.textRotation ?? 0) <= 360
    );
  }, [docxFormState]);

  const barcodeType = docxFormState.type;
  const docxBarcodeStyle = useMemo(
    () => ({
      rotation: docxFormState.rotation,
      barColor: docxFormState.barColor,
      backgroundColor: docxFormState.backgroundColor,
      transparentBackground: docxFormState.transparentBackground,
      height: docxFormState.height,
      margin: docxFormState.margin,
      barWidth: docxFormState.barWidth,
      fontSize: docxFormState.fontSize,
      scale: docxFormState.scale,
      showText: docxFormState.showText,
      textBold: docxFormState.textBold,
      textItalic: docxFormState.textItalic,
      textPosition: docxFormState.textPosition,
      textRotation: docxFormState.textRotation,
      displayValue: undefined,
    }),
    [docxFormState],
  );

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
    if (!file.name.endsWith('.docx')) {
      setError(t('docx.errors.onlyDocx'));
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      const buffer = await file.arrayBuffer();
      const docxPreview = await readDocx(buffer);
      setPreview(docxPreview);
      setOriginalFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docx.errors.loadFailed'));
    }
  };

  const handleGenerate = async () => {
    if (!preview || !isSettingsValid) return;

    try {
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);

      const blob = await writeDocxWithBarcodes({
        lines: preview.lines.map(l => l.text),
        barcodeType,
        barcodeStyle: docxBarcodeStyle,
      });

      const fileName = originalFile 
        ? createDocxOutputFileName(originalFile.name)
        : 'barcode_document.docx';

      saveAs(blob, fileName);
      setSuccessMessage(t('docx.success.generated', { count: preview.lines.length }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docx.errors.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const updateField = <Key extends keyof BarcodeFormState>(
    key: Key,
    value: BarcodeFormState[Key],
  ) => {
    setDocxFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = async () => {
    if (!previewPaperRef.current) {
      setError(t('generator.exportErrors.print'));
      return;
    }

    try {
      setError(null);
      await printDocxPreview(previewPaperRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generator.exportErrors.print'));
    }
  };

  return (
      <>
      <div className={styles.page}>
          <div className={styles.leftColumn}>
              <Panel 
                  className={clsx(styles.compactPanel, styles.uploadPanel)} 
                  contentClassName={styles.uploadPanelContent}
                  title={t("docx.title")} 
                  description={t("docx.description")}
              >
                  <div className={styles.controls}>
                      <div className={styles.field}>
                          <label className={styles.label}>{t("generator.fields.type")}</label>
                          <SearchableSelect
                              options={BARCODE_TYPE_OPTIONS}
                              value={barcodeType}
                              onChange={(value) => updateField('type', value as BarcodeType)}
                              disabled={isGenerating}
                          />
                      </div>

                      <Dropzone
                          onFilesSelected={handleFileSelect}
                          accept=".docx"
                          title={originalFile ? originalFile.name : t("docx.dropzone.selectFile")}
                          description={originalFile ? t("docx.dropzone.changeFile") : t("docx.dropzone.dropOrClick")}
                          fileIcon={<FileText />}
                          disabled={isGenerating}
                          className={styles.compactDropzone}
                      />

                      {error && <div className={styles.error}>{error}</div>}

                      {successMessage && (
                          <div className={styles.success}>
                              <CheckCircle2 size={18} />
                              {successMessage}
                          </div>
                      )}
                  </div>
              </Panel>

              <Panel 
                  className={clsx(styles.compactPanel, styles.settingsPanel)}
                  contentClassName={styles.settingsPanelContent}
                  title={t("xlsx.appearance.title")} 
                  description={t("xlsx.appearance.description")}
              >
                  <div className={styles.settingsBody}>
                      <BarcodeForm
                          className={styles.docxBarcodeForm}
                          formState={docxFormState}
                          hideDisplayValueField
                          hideTypeField
                          hideValueField
                          scrollable
                          updateField={updateField}
                      />
                      {!isSettingsValid && (
                          <div className={styles.error}>
                              {t("xlsx.errors.invalidAppearance")}
                          </div>
                      )}
                  </div>

                  <div className={styles.actionsRow}>
                      <Button
                          variant="primary"
                          onClick={handleGenerate}
                          fullWidth
                          disabled={!isSettingsValid || isGenerating}
                          className={styles.actionButton}
                      >
                          {isGenerating ? t("generator.actions.generating") : t("generator.actions.generate")}
                      </Button>
                      <Button
                          id="docx-print"
                          variant="secondary"
                          onClick={handlePrint}
                          fullWidth
                          className={styles.printButton}
                      >
                          <Printer size={18} style={{marginRight: "8px", color: "#000000"}} />
                          {t("docx.actions.print")}
                      </Button>
                  </div>
              </Panel>
          </div>

          <div className={styles.rightColumn}>
              <Panel title={t("docx.previewTitle")} fullHeight>
                  <DocxViewer
                      ref={previewPaperRef}
                      preview={preview}
                      barcodeType={barcodeType}
                      barcodeStyle={docxBarcodeStyle}
                  />
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
                  aria-labelledby="docx-leave-dialog-title"
                  aria-describedby="docx-leave-dialog-description"
                  onClick={(event) => event.stopPropagation()}
              >
                  <div className={styles.leaveDialogBody}>
                      <span className={styles.leaveDialogEyebrow}>{t("docx.leaveGuard.eyebrow")}</span>
                      <h2 id="docx-leave-dialog-title" className={styles.leaveDialogTitle}>
                          {t("docx.leaveGuard.title")}
                      </h2>
                      <p id="docx-leave-dialog-description" className={styles.leaveDialogDescription}>
                          {t("docx.leaveGuard.description")}
                      </p>
                  </div>
                  <div className={styles.leaveDialogActions}>
                      <Button variant="secondary" onClick={() => navigationBlocker.reset()}>
                          {t("docx.leaveGuard.cancel")}
                      </Button>
                      <Button variant="primary" onClick={() => navigationBlocker.proceed()}>
                          {t("docx.leaveGuard.confirm")}
                      </Button>
                  </div>
              </div>
          </div>
      )}
      </>
  );
}
