import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react'
import type { BarcodeRotation } from '../../types/barcode'
import styles from './BarcodePreview.module.css'

type BarcodePreviewProps = {
  svg: string | null
  rotation: BarcodeRotation
  showPreviewFrame?: boolean
  error?: string | null
  typeLabel?: string
}

export function BarcodePreview({
  svg,
  rotation,
  showPreviewFrame = true,
  error = null,
  typeLabel = 'Code 128',
}: BarcodePreviewProps) {
  const { t } = useTranslation()
  const status = error
    ? t('barcodePreview.status.error')
    : svg
      ? t('barcodePreview.status.ready')
      : t('barcodePreview.status.empty')
  const StatusIcon = error ? AlertCircle : svg ? CheckCircle2 : CircleDashed

  return (
    <div className={styles.preview}>
      {error ? (
        <div className={styles.state} role="alert">
          {error}
        </div>
      ) : svg ? (
        <div className={styles.captureViewport}>
          <div className={styles.captureTarget} id="capture-target">
            <div
              className={`${styles.artwork} ${showPreviewFrame ? styles.withFrame : ''}`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div
                aria-label={t('barcodePreview.ariaLabel')}
                className={styles.svg}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.state}>{t('barcodePreview.empty')}</div>
      )}

      <dl className={styles.metadata}>
        <div>
          <dt>{t('barcodePreview.metadata.type')}</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>{t('barcodePreview.metadata.status')}</dt>
          <dd>
            <StatusIcon aria-hidden="true" />
            {status}
          </dd>
        </div>
      </dl>
    </div>
  )
}
