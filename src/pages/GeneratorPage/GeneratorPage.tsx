import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import styles from './GeneratorPage.module.css'
import { BarcodePreview } from '../../features/barcode/components/BarcodePreview/BarcodePreview'
import { BarcodeForm } from '../../features/barcode/components/BarcodeForm/BarcodeForm'
import { useBarcodeGeneration } from '../../features/barcode/hooks/useBarcodeGeneration'
import {
  downloadPngFromSvg,
  downloadSvg,
} from '../../features/barcode/export/barcodeExport'
import { Button } from '../../shared/ui/Button/Button'
import { Panel } from '../../shared/ui/Panel/Panel'

export function GeneratorPage() {
  const { t } = useTranslation()
  const [showPreviewFrame, setShowPreviewFrame] = useState(true)
  const {
    formState,
    previewState,
    exportError,
    setExportError,
    updateField,
  } = useBarcodeGeneration()

  const handleDownloadSvg = () => {
    if (!previewState.svg) {
      return
    }

    try {
      setExportError(null)
      downloadSvg(previewState.svg, 'barcode.svg')
    } catch {
      setExportError(t('generator.exportErrors.svg'))
    }
  }

  const handleDownloadPng = async () => {
    if (!previewState.svg) {
      return
    }

    try {
      setExportError(null)
      await downloadPngFromSvg(previewState.svg, 'barcode.png')
    } catch {
      setExportError(t('generator.exportErrors.png'))
    }
  }

  const previewSettings = previewState.settings ?? formState
  const hasGeneratedBarcode = Boolean(previewState.svg)

  return (
    <div className={styles.layout}>
      <Panel
        title={t('generator.panelTitle')}
        description={t('generator.panelDescription')}
        className={styles.controlsPanel}
      >
        <BarcodeForm
          formState={formState}
          showPreviewFrame={showPreviewFrame}
          updateField={updateField}
          updateShowPreviewFrame={setShowPreviewFrame}
        />
      </Panel>

      <Panel
        title={t('generator.preview.title')}
        description={t('generator.preview.description')}
        className={styles.previewPanel}
      >
        <div
          className={styles.toolbar}
          aria-label={t('generator.preview.toolbarLabel')}
        >
          <Button
            disabled={!hasGeneratedBarcode}
            onClick={handleDownloadSvg}
            variant="secondary"
            className={styles.downloadButton}
          >
            <Download aria-hidden="true" />
            {t('generator.actions.downloadSvg')}
          </Button>
          <Button
            disabled={!hasGeneratedBarcode}
            onClick={handleDownloadPng}
            variant="primary"
            className={styles.downloadButton}
          >
            <Download aria-hidden="true" />
            {t('generator.actions.downloadPng')}
          </Button>
        </div>
        {exportError && (
          <p className={styles.exportError} role="alert">
            {exportError}
          </p>
        )}

        <div className={styles.previewBox}>
          <BarcodePreview
            error={previewState.error}
            rotation={previewSettings.rotation}
            showPreviewFrame={showPreviewFrame}
            svg={previewState.svg}
            typeLabel={t(`barcode.types.${previewSettings.type}`)}
          />
        </div>
      </Panel>
    </div>
  )
}
