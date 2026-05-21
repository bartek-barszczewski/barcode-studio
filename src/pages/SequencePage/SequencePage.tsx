import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Library, Printer } from 'lucide-react'
import styles from './SequencePage.module.css'

import { Panel } from '../../shared/ui/Panel/Panel'
import { Field } from '../../shared/ui/Field/Field'
import { TextInput } from '../../shared/ui/TextInput/TextInput'
import { SearchableSelect } from '../../shared/ui/SearchableSelect/SearchableSelect'
import { Button } from '../../shared/ui/Button/Button'

import { BARCODE_TYPE_OPTIONS } from '../../features/barcode/constants/barcodeTypes'
import {
  validateBarcodeValue,
  getTranslationKeyForMessage,
} from '../../features/barcode/validation/barcodeValidation'
import { useBarcodeSet } from '../../features/barcode/hooks/useBarcodeSet'
import { SimpleBarcodePreview } from '../../features/barcode/components/SimpleBarcodePreview/SimpleBarcodePreview'
import { renderBarcodeToSvgString } from '../../features/barcode/rendering/renderBarcode'
import { printBarcodeSetGrid } from '../../features/barcode/export/barcodeExport'

import type { BarcodeType, BarcodeFormState } from '../../features/barcode/types/barcode'
import type { BarcodeSetItem } from '../../features/barcode/types/barcodeSet'

const NUMERIC_ONLY_STANDARDS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'ITF', 'PHARMACODE']
const MAX_SEQUENCE_ITEMS = 5000

export function SequencePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { replaceItems } = useBarcodeSet()

  // State fields
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128')
  const [prefix, setPrefix] = useState('')
  const [startValue, setStartValue] = useState(1)
  const [endValue, setEndValue] = useState(100)
  const [stepValue, setStepValue] = useState(1)
  const [paddingValue, setPaddingValue] = useState(4)
  const [suffix, setSuffix] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [showText, setShowText] = useState(true)

  // Print Queue State
  const [printProgress, setPrintProgress] = useState<{
    isOpen: boolean
    current: number
    total: number
  }>({
    isOpen: false,
    current: 0,
    total: 0,
  })

  // Detect numeric-only constraints
  const isNumericType = NUMERIC_ONLY_STANDARDS.includes(barcodeType)

  // Auto-clean prefix and suffix if standard changes to numeric-only
  const activePrefix = isNumericType ? '' : prefix
  const activeSuffix = isNumericType ? '' : suffix

  // Compute sequence items
  const { sequence, isTooLarge, isZeroStep, isCapped } = useMemo(() => {
    if (stepValue <= 0) {
      return { sequence: [], isTooLarge: false, isZeroStep: true, isCapped: false }
    }
    if (startValue > endValue) {
      return { sequence: [], isTooLarge: true, isZeroStep: false, isCapped: false }
    }

    const items: Array<{ value: string; displayValue: string }> = []
    let current = startValue
    let capped = false

    while (current <= endValue) {
      if (items.length >= MAX_SEQUENCE_ITEMS) {
        capped = true
        break
      }
      
      const currentStr = String(current)
      const paddedStr = currentStr.padStart(paddingValue, '0')
      const sequenceValue = `${activePrefix}${paddedStr}${activeSuffix}`
      
      let displayVal = ''
      if (customLabel.trim()) {
        displayVal = customLabel.replace(/{value}/g, sequenceValue)
      }

      items.push({
        value: sequenceValue,
        displayValue: displayVal,
      })

      current += stepValue
    }

    return {
      sequence: items,
      isTooLarge: false,
      isZeroStep: false,
      isCapped: capped,
    }
  }, [startValue, endValue, stepValue, paddingValue, activePrefix, activeSuffix, customLabel])

  // Single barcode format validation check on first generated value
  const validation = useMemo(() => {
    if (sequence.length === 0) {
      return { isValid: true }
    }
    const sample = sequence[0].value
    return validateBarcodeValue(barcodeType, sample)
  }, [sequence, barcodeType])

  // Map standards for SearchableSelect
  const barcodeOptions = useMemo(() => {
    return BARCODE_TYPE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: t(`barcode.types.${opt.value}`),
    }))
  }, [t])

  // Trigger Bulk Editor conversion and navigation
  const handleGenerateToBulk = () => {
    if (sequence.length === 0 || !validation.isValid) return

    const bulkItems: BarcodeSetItem[] = sequence.map((item) => ({
      id: crypto.randomUUID(),
      value: item.value,
      displayValue: item.displayValue || '',
      type: barcodeType,
      options: {
        height: 32,
        barWidth: 3,
        scale: 1,
        margin: 8,
        rotation: 0,
        foreground: '#000000',
        background: '#ffffff',
        transparentBackground: false,
        textMode: showText ? 'below' : 'hidden',
        fontSize: 20,
        textBold: false,
        textItalic: false,
        textPosition: 'bottom',
        textRotation: 0,
      },
    }))

    replaceItems(bulkItems)
    navigate('/barcode-set')
  }

  // Quick Print execution with chunked frames to avoid main thread lockups
  const handleQuickPrint = () => {
    if (sequence.length === 0 || !validation.isValid) return

    const total = sequence.length
    setPrintProgress({
      isOpen: true,
      current: 0,
      total,
    })

    const svgs: string[] = []
    const batchSize = 50

    const processBatch = async (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, total)

      for (let i = startIndex; i < endIndex; i++) {
        const item = sequence[i]
        const settings: BarcodeFormState = {
          value: item.value,
          displayValue: item.displayValue || undefined,
          type: barcodeType,
          barColor: '#000000',
          backgroundColor: '#ffffff',
          showText: showText,
          fontSize: 20,
          height: 32,
          barWidth: 3,
          margin: 8,
          scale: 1,
          rotation: 0,
          textBold: false,
          textItalic: false,
          textPosition: 'bottom',
          textRotation: 0,
        }

        try {
          const svgMarkup = await renderBarcodeToSvgString(settings)
          svgs.push(svgMarkup)
        } catch (err) {
          console.error(`Failed to render print SVG for ${item.value}`, err)
          svgs.push('')
        }
      }

      setPrintProgress((prev) => ({ ...prev, current: endIndex }))

      if (endIndex < total) {
        requestAnimationFrame(() => {
          void processBatch(endIndex)
        })
      } else {
        setPrintProgress((prev) => ({ ...prev, isOpen: false }))
        try {
          await printBarcodeSetGrid(svgs)
        } catch (err) {
          console.error('Failed to launch native print window:', err)
        }
      }
    }

    requestAnimationFrame(() => {
      void processBatch(0)
    })
  }

  // Virtualized list items to show (first 3 and last 1)
  const renderedPreviewItems = useMemo(() => {
    if (sequence.length === 0) return []
    if (sequence.length <= 4) {
      return sequence.map((item, idx) => ({ item, index: idx, isEllipsis: false }))
    }
    
    return [
      { item: sequence[0], index: 0, isEllipsis: false },
      { item: sequence[1], index: 1, isEllipsis: false },
      { item: sequence[2], index: 2, isEllipsis: false },
      { item: sequence[0], index: -1, isEllipsis: true }, // Placeholder for ellipsis
      { item: sequence[sequence.length - 1], index: sequence.length - 1, isEllipsis: false },
    ]
  }, [sequence])

  return (
    <div className={styles.page}>
      {/* Left Configuration Column */}
      <div className={styles.leftColumn}>
        <Panel
          title={t('sequence.title')}
          description={t('sequence.description')}
          className={styles.formPanel}
          contentClassName={styles.formContent}
        >
          <div className={styles.scrollBody}>
            {/* Barcode Type Dropdown */}
            <Field label={t('sequence.form.standard')} htmlFor="seq-standard">
              <SearchableSelect
                id="seq-standard"
                options={barcodeOptions}
                value={barcodeType}
                onChange={(val) => setBarcodeType(val as BarcodeType)}
              />
            </Field>

            {/* Prefix & Suffix Inputs (Disabled for numeric) */}
            <div className={styles.fieldGrid}>
              <div className={isNumericType ? styles.visuallyDisabled : ''}>
                <Field label={t('sequence.form.prefix')} htmlFor="seq-prefix">
                  <TextInput
                    id="seq-prefix"
                    value={activePrefix}
                    disabled={isNumericType}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                </Field>
              </div>
              <div className={isNumericType ? styles.visuallyDisabled : ''}>
                <Field label={t('sequence.form.suffix')} htmlFor="seq-suffix">
                  <TextInput
                    id="seq-suffix"
                    value={activeSuffix}
                    disabled={isNumericType}
                    onChange={(e) => setSuffix(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* Start & End Numeric Values */}
            <div className={styles.fieldGrid}>
              <Field label={t('sequence.form.start')} htmlFor="seq-start">
                <TextInput
                  id="seq-start"
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(Number(e.target.value))}
                />
              </Field>
              <Field label={t('sequence.form.end')} htmlFor="seq-end">
                <TextInput
                  id="seq-end"
                  type="number"
                  value={endValue}
                  onChange={(e) => setEndValue(Number(e.target.value))}
                />
              </Field>
            </div>

            {/* Step & Padding Values */}
            <div className={styles.fieldGrid}>
              <Field label={t('sequence.form.step')} htmlFor="seq-step">
                <TextInput
                  id="seq-step"
                  type="number"
                  min="1"
                  value={stepValue}
                  onChange={(e) => setStepValue(Math.max(1, Number(e.target.value)))}
                />
              </Field>
              <Field label={t('sequence.form.padding')} htmlFor="seq-padding">
                <TextInput
                  id="seq-padding"
                  type="number"
                  min="0"
                  value={paddingValue}
                  onChange={(e) => setPaddingValue(Math.max(0, Number(e.target.value)))}
                />
              </Field>
            </div>

            <Field label={t('sequence.form.customLabel')} htmlFor="seq-custom-label">
              <TextInput
                id="seq-custom-label"
                value={customLabel}
                placeholder="e.g. SN-{value}"
                onChange={(e) => setCustomLabel(e.target.value)}
              />
              <span className={styles.helperText}>{t('sequence.form.customLabelHelp')}</span>
            </Field>

            <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
              <label className={styles.checkboxToggle}>
                <input
                  type="checkbox"
                  checked={showText}
                  className={styles.checkboxInput}
                  onChange={(e) => setShowText(e.target.checked)}
                />
                <span aria-hidden="true" className={styles.checkboxControl}>
                  <span className={styles.checkboxMark} />
                </span>
                <span className={styles.checkboxLabel}>{t('generator.fields.text')}</span>
              </label>
            </div>

            {/* Validation Alerts */}
            {isTooLarge && (
              <div className={styles.validationWarning}>
                <AlertTriangle size={18} />
                <span>{t('sequence.preview.tooLarge')}</span>
              </div>
            )}

            {isZeroStep && (
              <div className={styles.validationWarning}>
                <AlertTriangle size={18} />
                <span>{t('sequence.preview.zeroStep')}</span>
              </div>
            )}

            {!validation.isValid && validation.message && (
              <div className={styles.validationWarning}>
                <AlertTriangle size={18} />
                <span>{t(getTranslationKeyForMessage(validation.message))}</span>
              </div>
            )}
          </div>

          {/* Bottom Actions Row */}
          <div className={styles.actionsPanel}>
            <Button
              className={styles.actionButton}
              variant="secondary"
              disabled={sequence.length === 0 || !validation.isValid}
              onClick={handleGenerateToBulk}
            >
              <Library aria-hidden="true" />
              {t('sequence.actions.generateToBulk')}
            </Button>
            <Button
              className={styles.actionButton}
              variant="primary"
              disabled={sequence.length === 0 || !validation.isValid}
              onClick={handleQuickPrint}
            >
              <Printer aria-hidden="true" />
              {t('sequence.actions.quickPrint')}
            </Button>
          </div>
        </Panel>
      </div>

      {/* Right Virtual Live Preview Column */}
      <div className={styles.rightColumn}>
        <Panel
          title={t('sequence.preview.title')}
          description={
            isCapped
              ? t('sequence.preview.total', { count: MAX_SEQUENCE_ITEMS }) + ' (Capped)'
              : t('sequence.preview.total', { count: sequence.length })
          }
          className={styles.previewPanel}
          contentClassName={styles.previewContent}
        >
          <div className={styles.previewCards}>
            {sequence.length === 0 ? (
              <div className={styles.previewStats}>
                {t(isTooLarge ? 'sequence.preview.tooLarge' : isZeroStep ? 'sequence.preview.zeroStep' : 'sequence.preview.invalid')}
              </div>
            ) : (
              renderedPreviewItems.map((pi, idx) => {
                if (pi.isEllipsis) {
                  return (
                    <div key={`ellipsis-${idx}`} className={styles.ellipsis}>
                      <span className={styles.ellipsisDot} />
                      <span className={styles.ellipsisDot} />
                      <span className={styles.ellipsisDot} />
                    </div>
                  )
                }

                return (
                  <div key={`${pi.item.value}-${pi.index}`} className={styles.previewCardWrapper}>
                    <SimpleBarcodePreview
                      value={pi.item.value}
                      displayValue={pi.item.displayValue || undefined}
                      type={barcodeType}
                      barColor="#000000"
                      backgroundColor="#ffffff"
                      showText={showText}
                      fontSize={16}
                      height={40}
                      barWidth={2}
                      margin={6}
                      scale={1}
                      rotation={0}
                    />
                  </div>
                )
              })
            )}
          </div>
        </Panel>
      </div>

      {/* Progress Dialog Overlay */}
      {printProgress.isOpen && (
        <div className={styles.progressOverlay}>
          <div className={styles.progressCard}>
            <div className={styles.progressSpinner} />
            <h3 className={styles.progressTitle}>
              {t('sequence.actions.quickPrint')}
            </h3>
            <p className={styles.progressSubtitle}>
              {t('sequence.printing', {
                current: printProgress.current,
                total: printProgress.total,
              })}
            </p>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${(printProgress.current / printProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
