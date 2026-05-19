import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react'
import clsx from 'clsx'
import styles from './BarcodePreview.module.css'

type BarcodePreviewProps = {
  svg: string | null
  showPreviewFrame?: boolean
  error?: string | null
  typeLabel?: string
  showMetadata?: boolean
  isWidget?: boolean
  className?: string
}

export function BarcodePreview({
  svg,
  showPreviewFrame = true,
  error = null,
  typeLabel = 'Code 128',
  showMetadata = true,
  isWidget = false,
  className,
}: BarcodePreviewProps) {
  const { t } = useTranslation()
  const status = error
    ? t('barcodePreview.status.error')
    : svg
      ? t('barcodePreview.status.ready')
      : t('barcodePreview.status.empty')
  const StatusIcon = error ? AlertCircle : svg ? CheckCircle2 : CircleDashed

  const renderContent = () => {
    if (error) {
      return (
        <div className={styles.state} role="alert">
          {error}
        </div>
      )
    }

    if (!svg) {
      return <div className={styles.state}>{t('barcodePreview.empty')}</div>
    }

    const artwork = (
      <div
        className={clsx(styles.artwork, showPreviewFrame && styles.withFrame)}
      >
        <div
          aria-label={t('barcodePreview.ariaLabel')}
          className={styles.svg}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    )

    if (isWidget) {
      return artwork
    }

    return (
      <div className={styles.captureViewport}>
        <div className={styles.captureTarget} id="capture-target">
          {artwork}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx(styles.preview, isWidget && styles.minimalPreview, className)}>
      {renderContent()}

      {showMetadata && (
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
      )}
    </div>
  )
}
