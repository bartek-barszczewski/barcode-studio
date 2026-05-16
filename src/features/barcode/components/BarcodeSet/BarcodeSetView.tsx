import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Printer, Trash2 } from 'lucide-react'
import { useBarcodeSet } from '../../hooks/useBarcodeSet'
import { Button } from '../../../../shared/ui/Button/Button'
import { BarcodeSetCard } from './BarcodeSetCard'
import { BarcodeSetSettingsSidebar } from './BarcodeSetSettingsSidebar'
import { renderBarcodeToSvgString } from '../../rendering/renderBarcode'
import { mapBarcodeSetItemToFormState } from '../../utils/barcodeSetUtils'
import { validateBarcodeValue } from '../../validation/barcodeValidation'
import { printBarcodeSetGrid } from '../../export/barcodeExport'
import styles from './BarcodeSet.module.css'

export function BarcodeSetView() {
  const { t } = useTranslation()
  const {
    items,
    addItem,
    removeItem,
    removeLastItem,
    updateItem,
    updateOptions,
    clearAll,
  } = useBarcodeSet()

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const handleEdit = (id: string) => {
    setSelectedItemId(id)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  const selectedItem = items.find(i => i.id === selectedItemId) || null
  const selectedIndex = items.findIndex(i => i.id === selectedItemId)

  // Ensure selection persists if drawer is open but item index changes (e.g. duplicate)
  useEffect(() => {
    if (isDrawerOpen && !items.find(i => i.id === selectedItemId)) {
      setIsDrawerOpen(false)
    }
  }, [items, selectedItemId, isDrawerOpen])

  const handleAddItem = () => {
    setIsDrawerOpen(false)
    addItem()
    
    // Smooth scroll to bottom after state update
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)
  }

  const handleRemoveLastItem = () => {
    setIsDrawerOpen(false)
    removeLastItem()
  }

  const handlePrintAll = async () => {
    if (items.length === 0 || isPrinting) return
    
    setIsPrinting(true)
    try {
      const svgs: string[] = []
      
      for (const item of items) {
        if (!item.value.trim()) continue
        
        const formState = mapBarcodeSetItemToFormState(item)
        const validation = validateBarcodeValue(formState.type, formState.value)
        
        if (validation.isValid) {
          try {
            const svg = await renderBarcodeToSvgString(formState)
            svgs.push(svg)
          } catch (err) {
            console.error(`Failed to render barcode for item ${item.id}:`, err)
          }
        }
      }
      
      if (svgs.length > 0) {
        await printBarcodeSetGrid(svgs)
      }
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className={`${styles.container} ${isDrawerOpen ? styles.containerWithDrawer : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>{t('barcodeSet.title')}</h1>
          <p>{t('barcodeSet.description')}</p>
          
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              onClick={handlePrintAll}
              disabled={isPrinting || items.every(i => !i.value.trim())}
              className={styles.printAllButton}
            >
              <Printer size={20} />
              {isPrinting ? t('generator.actions.generating') : t('barcodeSet.actions.printAll')}
            </Button>
            <Button
              variant="ghost"
              onClick={clearAll}
              className={styles.clearAllButton}
            >
              <Trash2 size={20} />
              {t('barcodeSet.actions.clearAll')}
            </Button>
          </div>
        </div>
      </header>

      <div className={styles.list}>
        {items.map((item, index) => (
          <BarcodeSetCard
            key={item.id}
            item={item}
            index={index}
            onEdit={handleEdit}
            onRemove={removeItem}
            isActive={selectedItemId === item.id && isDrawerOpen}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleAddItem}
          className={styles.roundActionButton}
        >
          <Plus size={32} />
        </Button>
        <Button
          variant="secondary"
          onClick={handleRemoveLastItem}
          disabled={items.length <= 1}
          className={styles.roundActionButton}
        >
          <Minus size={32} />
        </Button>
      </div>

      <BarcodeSetSettingsSidebar
        item={selectedItem}
        index={selectedIndex}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUpdate={updateItem}
        onOptionsUpdate={updateOptions}
        onRemove={removeItem}
      />
    </div>
  )
}
