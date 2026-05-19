import { useTranslation } from 'react-i18next'
import { X, Trash2 } from 'lucide-react'
import type { BarcodeFormState } from '../../types/barcode'
import type { BarcodeSetItem } from '../../types/barcodeSet'
import { mapBarcodeSetItemToFormState } from '../../utils/barcodeSetUtils'
import { BarcodeForm } from '../BarcodeForm/BarcodeForm'
import { Button } from '../../../../shared/ui/Button/Button'
import styles from './BarcodeSet.module.css'

interface BarcodeSetSettingsSidebarProps {
  item: BarcodeSetItem | null
  index: number
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<BarcodeSetItem>) => void
  onOptionsUpdate: (id: string, options: Partial<BarcodeSetItem['options']>) => void
  onRemove: (id: string) => void
}

export function BarcodeSetSettingsSidebar({
  item,
  index,
  isOpen,
  onClose,
  onUpdate,
  onOptionsUpdate,
  onRemove,
}: BarcodeSetSettingsSidebarProps) {
  const { t } = useTranslation()

  if (!item) return null

  const handleRemove = () => {
    onRemove(item.id)
    onClose()
  }

  const formState = mapBarcodeSetItemToFormState(item)

  const handleFormFieldUpdate = <Key extends keyof BarcodeFormState>(
    key: Key,
    value: BarcodeFormState[Key],
  ) => {
    if (key === 'type' || key === 'value' || key === 'displayValue') {
      onUpdate(item.id, {
        [key]: value,
      } as Partial<BarcodeSetItem>)
      return
    }

    if (key === 'showText') {
      onOptionsUpdate(item.id, {
        textMode: value ? 'below' : 'hidden',
      })
      return
    }

    const optionUpdates: Partial<BarcodeSetItem['options']> = {}

    switch (key) {
      case 'rotation':
        optionUpdates.rotation = value as BarcodeSetItem['options']['rotation']
        break
      case 'barColor':
        optionUpdates.foreground = value as string
        break
      case 'backgroundColor':
        optionUpdates.background = value as string
        break
      case 'transparentBackground':
        optionUpdates.transparentBackground = Boolean(value)
        break
      case 'height':
        optionUpdates.height = value as number
        break
      case 'margin':
        optionUpdates.margin = value as number
        break
      case 'barWidth':
        optionUpdates.barWidth = value as number
        break
      case 'fontSize':
        optionUpdates.fontSize = value as number
        break
      case 'scale':
        optionUpdates.scale = value as number
        break
      case 'textBold':
        optionUpdates.textBold = Boolean(value)
        break
      case 'textItalic':
        optionUpdates.textItalic = Boolean(value)
        break
      case 'textPosition':
        optionUpdates.textPosition = value as BarcodeSetItem['options']['textPosition']
        break
      case 'textRotation':
        optionUpdates.textRotation = value as number
        break
      default:
        return
    }

    onOptionsUpdate(item.id, optionUpdates)
  }

  return (
    <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
      <div className={styles.drawerHeader}>
        <div className={styles.drawerTitleGroup}>
          <h2>{t('barcodeSet.sidebar.title')}</h2>
          <span className={styles.drawerSubtitle}>
            {t('barcodeSet.sidebar.editing', { index: index + 1 })}
          </span>
        </div>
        <button className={styles.closeDrawer} onClick={onClose} type="button">
          <X size={24} />
        </button>
      </div>

      <div className={styles.drawerContent}>
        <div className={styles.drawerActions}>
          <Button variant="ghost" onClick={handleRemove} className={styles.drawerDelete}>
            <Trash2 size={18} />
            {t('barcodeSet.actions.remove')}
          </Button>
        </div>

        <div className={styles.drawerForm}>
          <BarcodeForm
            formState={formState}
            scrollable={false}
            showPreviewFrame={false}
            updateField={handleFormFieldUpdate}
          />
        </div>
      </div>
    </div>
  )
}
