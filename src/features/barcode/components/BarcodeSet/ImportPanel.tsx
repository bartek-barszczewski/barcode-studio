import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, FileJson, X } from 'lucide-react'
import { Button } from '../../../../shared/ui/Button/Button'
import { importFromText, validateBarcodeSetItems } from '../../utils/barcodeSetUtils'
import type { BarcodeSetItem } from '../../types/barcodeSet'
import styles from './BarcodeSet.module.css'

interface ImportPanelProps {
  onImport: (items: BarcodeSetItem[], mode: 'replace' | 'append') => void
  onClose: () => void
}

export function ImportPanel({ onImport, onClose }: ImportPanelProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleTextImport = (mode: 'replace' | 'append') => {
    const items = importFromText(text)
    if (items.length > 0) {
      onImport(items, mode)
      setText('')
      onClose()
    }
  }

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      const content = await file.text()
      const parsed = JSON.parse(content)
      
      if (validateBarcodeSetItems(parsed)) {
        const mode = window.confirm(t('barcodeSet.import.replace')) ? 'replace' : 'append'
        onImport(parsed, mode)
        onClose()
      } else {
        setError(t('barcodeSet.import.error'))
      }
    } catch {
      setError(t('barcodeSet.import.error'))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className={styles.importPanel}>
      <div className={styles.importHeader}>
        <h2>{t('barcodeSet.import.title')}</h2>
        <Button variant="ghost" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      <div className={styles.importBody}>
        <div className={styles.importSection}>
          <div className={styles.importLabel}>
            <FileText size={16} />
            {t('barcodeSet.actions.importText')}
          </div>
          <textarea
            className={styles.importTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('barcodeSet.import.textPlaceholder')}
          />
          <div className={styles.importActions}>
            <Button 
              variant="secondary" 
              onClick={() => handleTextImport('replace')}
              disabled={!text.trim()}
            >
              {t('barcodeSet.import.replace')}
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleTextImport('append')}
              disabled={!text.trim()}
            >
              {t('barcodeSet.import.append')}
            </Button>
          </div>
        </div>

        <div className={styles.importDivider} />

        <div className={styles.importSection}>
          <div className={styles.importLabel}>
            <FileJson size={16} />
            {t('barcodeSet.actions.importJson')}
          </div>
          <p className={styles.importHint}>{t('barcodeSet.import.jsonHint')}</p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleJsonFileChange}
            className={styles.hiddenInput}
            id="json-import-input"
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            {t('barcodeSet.actions.importJson')}
          </Button>
          {error && <div className={styles.importError}>{error}</div>}
        </div>
      </div>
    </div>
  )
}
