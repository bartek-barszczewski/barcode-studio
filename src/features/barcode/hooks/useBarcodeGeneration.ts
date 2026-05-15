import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderBarcodeToSvgString } from '../rendering/renderBarcode'
import type { BarcodeFormState, BarcodeType } from '../types/barcode'
import { validateBarcodeValue } from '../validation/barcodeValidation'
import { VALIDATION_MESSAGE_KEYS } from '../constants/validationMessages'
import { BARCODE_TEST_VALUES, DEFAULT_BARCODE_FORM_STATE } from '../constants/barcodeTypes'

export type PreviewState = {
  svg: string | null
  error: string | null
  settings: BarcodeFormState | null
}

export function useBarcodeGeneration() {
  const { t } = useTranslation()
  const [formState, setFormState] = useState<BarcodeFormState>(
    DEFAULT_BARCODE_FORM_STATE,
  )
  const [previewState, setPreviewState] = useState<PreviewState>({
    svg: null,
    error: null,
    settings: null,
  })
  const [exportError, setExportError] = useState<string | null>(null)

  const getValidationMessage = useCallback((message?: string) =>
    t(
      message
        ? (VALIDATION_MESSAGE_KEYS[message] ?? 'barcode.validation.invalid')
        : 'barcode.validation.invalid',
    ), [t])

  useEffect(() => {
    let isCurrent = true
    const currentSettings = { ...formState }
    const validationResult = validateBarcodeValue(
      currentSettings.type,
      currentSettings.value,
    )

    const generateBarcode = async () => {
      if (!validationResult.isValid) {
        setPreviewState({
          svg: null,
          error: validationResult.message || getValidationMessage(),
          settings: currentSettings,
        })
        return
      }

      try {
        const svg = await renderBarcodeToSvgString(currentSettings)

        if (!isCurrent) {
          return
        }

        setPreviewState({
          svg,
          error: null,
          settings: currentSettings,
        })
      } catch (error) {
        if (!isCurrent) {
          return
        }

        setPreviewState({
          svg: null,
          error:
            error instanceof Error
              ? error.message
              : t('barcode.validation.renderFailed'),
          settings: currentSettings,
        })
      }
    }

    void generateBarcode()

    return () => {
      isCurrent = false
    }
  }, [formState, t, getValidationMessage])

  const updateField = <Key extends keyof BarcodeFormState>(
    key: Key,
    value: BarcodeFormState[Key],
  ) => {
    setExportError(null)
    setFormState((currentState) => {
      const newState = {
        ...currentState,
        [key]: value,
      }

      // If type changed, also update the value to a test value
      if (key === 'type' && value !== currentState.type) {
        newState.value = BARCODE_TEST_VALUES[value as BarcodeType]
      }

      return newState
    })
  }

  return {
    formState,
    previewState,
    exportError,
    setExportError,
    updateField,
  }
}
