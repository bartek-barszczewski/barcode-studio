import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { BarcodeSetItem } from '../types/barcodeSet'
import { renderBarcodeToSvgString } from '../rendering/renderBarcode'
import { mapBarcodeSetItemToFormState } from '../utils/barcodeSetUtils'
import { validateBarcodeValue, getTranslationKeyForMessage } from '../validation/barcodeValidation'

export type BarcodeItemStatus = 'ready' | 'empty' | 'invalid'

export function useBarcodeItemPreview(item: BarcodeSetItem | null) {
  const { t } = useTranslation()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<BarcodeItemStatus>('empty')

  // Create a stable string representation of options to use as a dependency
  const optionsKey = JSON.stringify(item?.options || {})

  useEffect(() => {
    let isCurrent = true

    if (!item) {
      setSvg(null)
      setError(null)
      setStatus('empty')
      return
    }

    const effectiveValue = item.value.trim() || '12345678'
    const formState = mapBarcodeSetItemToFormState(item)
    
    // Ensure the effective value is used in the form state for rendering
    formState.value = effectiveValue

    const validationResult = validateBarcodeValue(formState.type, formState.value)

    if (!validationResult.isValid) {
      setSvg(null)
      setError(t(getTranslationKeyForMessage(validationResult.message)))
      setStatus('invalid')
      return
    }

    const generate = async () => {
      try {
        const result = await renderBarcodeToSvgString(formState)
        if (isCurrent) {
          setSvg(result)
          setError(null)
          setStatus('ready')
        }
      } catch (err) {
        if (isCurrent) {
          setSvg(null)
          setError(err instanceof Error ? err.message : String(err))
          setStatus('invalid')
        }
      }
    }

    void generate()

    return () => {
      isCurrent = false
    }
  }, [item?.value, item?.type, optionsKey, t])

  return { svg, error, status }
}
