import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, Edit3, FileCode, ImageIcon, Trash2 } from 'lucide-react'
import type { BarcodeSetItem } from '../../types/barcodeSet'
import { Button } from '../../../../shared/ui/Button/Button'
import { BarcodePreview } from '../BarcodePreview/BarcodePreview'
import { useBarcodeItemPreview } from '../../hooks/useBarcodeItemPreview'
import { BARCODE_TYPE_LABELS } from '../../constants/barcodeTypes'
import { 
  printSingleBarcode,
  exportBarcodeAsSvg,
  exportBarcodeAsPng,
  sanitizeFileName
} from '../../export/barcodeExport'
import styles from './BarcodeSet.module.css'

const CARD_VALUE_PREVIEW_LIMIT = 32

interface BarcodeSetCardProps {
  item: BarcodeSetItem
  index: number
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  isActive?: boolean
}

export const BarcodeSetCard = memo(function BarcodeSetCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive,
}: BarcodeSetCardProps) {
  const { t } = useTranslation()
  const { svg, error: previewError } = useBarcodeItemPreview(item)

  const getCardValuePreview = (value: string) => {
    if (value.length <= CARD_VALUE_PREVIEW_LIMIT) {
      return value
    }

    return `${value.slice(0, CARD_VALUE_PREVIEW_LIMIT)}...`
  }

  const getBaseFilename = () => {
    const value = sanitizeFileName(item.value)
    return value ? `barcode-${index + 1}-${value}` : `barcode-${index + 1}`
  }

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svg) return
    printSingleBarcode(svg)
  }

  const handleDownloadSvg = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svg) return
    exportBarcodeAsSvg(svg, getBaseFilename())
  }

  const handleDownloadPng = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svg) return
    await exportBarcodeAsPng(svg, getBaseFilename(), item.options.scale)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(item.id)
  }

  const barcodeTypeName = BARCODE_TYPE_LABELS[item.type] || item.type

  return (
    <div 
      className={`${styles.minimalCard} ${isActive ? styles.activeCard : ''}`}
      onClick={() => onEdit(item.id)}
    >
      <div className={styles.cardPreviewContainer}>
        <BarcodePreview
          svg={svg}
          rotation={item.options.rotation}
          error={previewError}
          showMetadata={false}
          showPreviewFrame={false}
          isWidget={true}
          className={styles.widgetPreview}
        />
      </div>

      <div className={styles.cardInfo}>
        <div className={styles.cardBadgeRow}>
          <span className={styles.cardBadge}>#{index + 1}</span>
          <span className={styles.barcodeTypeLabel}>{barcodeTypeName}</span>
        </div>
        <span className={styles.cardValue} title={item.value}>
          {item.value ? getCardValuePreview(item.value) : t('barcodeSet.status.empty')}
        </span>
      </div>

      <div className={styles.cornerActions}>
        <Button
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
          title={t('barcodeSet.actions.edit')}
          className={`${styles.iconButton} ${styles.editIconButton}`}
        >
          <Edit3 size={16} />
        </Button>
        <Button
          variant="ghost"
          onClick={handlePrint}
          disabled={!svg}
          title={t('barcodeSet.actions.print')}
          className={styles.iconButton}
        >
          <Printer size={16} />
        </Button>
        <Button
          variant="ghost"
          onClick={handleDownloadSvg}
          disabled={!svg}
          title="SVG"
          className={styles.iconButton}
        >
          <FileCode size={16} />
        </Button>
        <Button
          variant="ghost"
          onClick={handleDownloadPng}
          disabled={!svg}
          title="PNG"
          className={styles.iconButton}
        >
          <ImageIcon size={16} />
        </Button>
        <Button
          variant="ghost"
          onClick={handleRemove}
          title={t('barcodeSet.actions.remove')}
          className={`${styles.iconButton} ${styles.deleteIconButton}`}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
})
