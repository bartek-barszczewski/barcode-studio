import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle2, Printer } from 'lucide-react';
import { saveAs } from 'file-saver';
import type { BarcodeType } from '../../features/barcode/types/barcode';
import type { DocxPreview } from '../../features/docx/types/docx';
import styles from './DocxPage.module.css';
import { Dropzone } from '../../shared/ui/Dropzone/Dropzone';
import { Panel } from '../../shared/ui/Panel/Panel';
import { readDocx } from '../../features/docx/utils/readDocx';
import { writeDocxWithBarcodes, createDocxOutputFileName } from '../../features/docx/utils/writeDocxWithBarcodes';
import { DocxViewer } from '../../features/docx/components/DocxViewer/DocxViewer';
import { SearchableSelect } from '../../shared/ui/SearchableSelect/SearchableSelect';
import { BARCODE_TYPE_OPTIONS } from '../../features/barcode/constants/barcodeTypes';
import { Button } from '../../shared/ui/Button/Button';
import { Field } from '../../shared/ui/Field/Field';
import { TextInput } from '../../shared/ui/TextInput/TextInput';
import { SelectInput } from '../../shared/ui/SelectInput/SelectInput';
import { toNumber } from '../../shared/utils/number';

export function DocxPage() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DocxPreview>({ 
    lines: [{ index: 0, html: '', text: '', isEmpty: true }] 
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128');
  
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
        barcodeStyle,
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

  const updateStyleField = (key: keyof typeof barcodeStyle, value: unknown) => {
    setBarcodeStyle((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setPreview({ lines: [{ index: 0, html: '', text: '', isEmpty: true }] });
    setOriginalFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
      <div className={styles.page}>
          <div className={styles.leftColumn}>
              <Panel className={styles.uploadPanel} title={t("docx.title")} description={t("docx.description")}>
                  <div className={styles.controls}>
                      <div className={styles.field}>
                          <label className={styles.label}>{t("generator.fields.type")}</label>
                          <SearchableSelect
                              options={BARCODE_TYPE_OPTIONS}
                              value={barcodeType}
                              onChange={(value) => setBarcodeType(value as BarcodeType)}
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

              <Panel title={t("xlsx.appearance.title")} description={t("xlsx.appearance.description")}>
                  <div className={styles.settingsGrid}>
                      <Field label={t("generator.fields.height")} htmlFor="docx-height">
                          <TextInput
                              id="docx-height"
                              type="number"
                              min={4}
                              max={400}
                              step={2}
                              value={barcodeStyle.height}
                              onChange={(event) =>
                                  updateStyleField("height", toNumber(event.target.value, barcodeStyle.height, 4, 400))
                              }
                          />
                      </Field>
                      <Field label={t("generator.fields.barWidth")} htmlFor="docx-barwidth">
                          <TextInput
                              id="docx-barwidth"
                              type="number"
                              min={1}
                              max={12}
                              step={1}
                              value={barcodeStyle.barWidth}
                              onChange={(event) =>
                                  updateStyleField(
                                      "barWidth",
                                      toNumber(event.target.value, barcodeStyle.barWidth, 1, 12)
                                  )
                              }
                          />
                      </Field>
                      <Field label={t("generator.fields.scale")} htmlFor="docx-scale">
                          <TextInput
                              id="docx-scale"
                              type="number"
                              min={0.5}
                              max={4}
                              step={0.25}
                              value={barcodeStyle.scale}
                              onChange={(event) =>
                                  updateStyleField("scale", toNumber(event.target.value, barcodeStyle.scale, 0.5, 4))
                              }
                          />
                      </Field>
                      <Field label={t("generator.fields.fontSize")} htmlFor="docx-fontsize">
                          <TextInput
                              id="docx-fontsize"
                              type="number"
                              min={4}
                              max={128}
                              step={1}
                              value={barcodeStyle.fontSize}
                              onChange={(event) =>
                                  updateStyleField(
                                      "fontSize",
                                      toNumber(event.target.value, barcodeStyle.fontSize, 4, 128)
                                  )
                              }
                          />
                      </Field>

                      <Field label={t("generator.fields.barColor")} htmlFor="docx-barcolor">
                          <TextInput
                              id="docx-barcolor"
                              type="color"
                              value={barcodeStyle.barColor}
                              onChange={(event) => updateStyleField("barColor", event.target.value)}
                          />
                      </Field>

                      <Field label={t("generator.fields.backgroundColor")} htmlFor="docx-bgcolor">
                          <TextInput
                              id="docx-bgcolor"
                              type="color"
                              value={barcodeStyle.backgroundColor}
                              onChange={(event) => updateStyleField("backgroundColor", event.target.value)}
                          />
                      </Field>

                      <Field label={t("generator.fields.margin")} htmlFor="docx-margin">
                          <TextInput
                              id="docx-margin"
                              type="number"
                              min={0}
                              max={80}
                              step={4}
                              value={barcodeStyle.margin}
                              onChange={(event) =>
                                  updateStyleField("margin", toNumber(event.target.value, barcodeStyle.margin, 0, 80))
                              }
                          />
                      </Field>

                      <Field label={t("generator.fields.text")} htmlFor="docx-showtext">
                          <SelectInput
                              id="docx-showtext"
                              value={barcodeStyle.showText ? "show" : "hide"}
                              onChange={(event) => updateStyleField("showText", event.target.value === "show")}
                          >
                              <option value="show">{t("generator.textOptions.show")}</option>
                              <option value="hide">{t("generator.textOptions.hide")}</option>
                          </SelectInput>
                      </Field>

                      <div style={{gridColumn: "span 2"}}></div>
                  </div>
                  {!isSettingsValid && (
                      <div className={styles.error} style={{marginTop: "8px"}}>
                          {t("xlsx.errors.invalidAppearance")}
                      </div>
                  )}
              </Panel>

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
          </div>

          <div className={styles.rightColumn}>
              <Panel title={t("docx.previewTitle")} fullHeight>
                  <DocxViewer preview={preview} barcodeType={barcodeType} barcodeStyle={barcodeStyle} />
              </Panel>
          </div>
      </div>
  );
}
