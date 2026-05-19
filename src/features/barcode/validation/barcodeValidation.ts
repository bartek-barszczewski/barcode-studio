import { BARCODE_TYPE_LABELS } from '../constants/barcodeTypes'
import { VALIDATION_MESSAGE_KEYS } from '../constants/validationMessages'
import type { BarcodeType, ValidationResult } from '../types/barcode'

export const getTranslationKeyForMessage = (message?: string | null): string => {
  if (!message) return 'barcode.validation.invalid'
  return VALIDATION_MESSAGE_KEYS[message] ?? 'barcode.validation.invalid'
}

const DIGITS_ONLY_PATTERN = /^\d+$/
const CODE39_PATTERN = /^[0-9A-Z\-.$ /+%]+$/
const CODABAR_PATTERN = /^[A-D][0-9\- $:/.+]+[A-D]$/i

const valid = (): ValidationResult => ({ isValid: true })

const invalid = (message: string): ValidationResult => ({
  isValid: false,
  message,
})

export const validateBarcodeValue = (
  type: BarcodeType,
  value: string,
): ValidationResult => {
  const normalizedValue = value.trim()

  if (normalizedValue.length === 0) {
    return invalid('Wartość nie może być pusta.')
  }

  // QR, CODE128, DATAMATRIX, PDF417, AZTEC, CODE93, CODE39EXT and CODE93EXT can take most characters
  if (
    type === 'QR' ||
    type === 'CODE128' ||
    type === 'DATAMATRIX' ||
    type === 'PDF417' ||
    type === 'AZTEC' ||
    type === 'CODE39EXT' ||
    type === 'CODE93' ||
    type === 'CODE93EXT'
  ) {
    return valid()
  }

  if (type === 'EAN13' || type === 'UPCA') {
    if (!DIGITS_ONLY_PATTERN.test(normalizedValue)) {
      return invalid(`${BARCODE_TYPE_LABELS[type]} może zawierać tylko cyfry.`)
    }
    const len = normalizedValue.length
    if (type === 'UPCA' && (len < 11 || len > 12)) {
      return invalid('UPC-A wymaga 11 lub 12 cyfr (12-sta cyfra to suma kontrolna).')
    }
    if (type === 'EAN13' && (len < 12 || len > 13)) {
      return invalid('EAN-13 wymaga 12 lub 13 cyfr (13-sta cyfra to suma kontrolna).')
    }
    return valid()
  }

  if (type === 'EAN8' || type === 'UPCE') {
    if (!DIGITS_ONLY_PATTERN.test(normalizedValue)) {
      return invalid(`${BARCODE_TYPE_LABELS[type]} może zawierać tylko cyfry.`)
    }
    const len = normalizedValue.length
    if (type === 'UPCE' && (len < 6 || len > 8)) {
      return invalid('UPC-E wymaga od 6 do 8 cyfr (ostatnia to suma kontrolna).')
    }
    if (type === 'EAN8' && (len < 7 || len > 8)) {
      return invalid('EAN-8 wymaga 7 lub 8 cyfr (8-ma cyfra to suma kontrolna).')
    }
    return valid()
  }

  if (type === 'CODE39') {
    if (!CODE39_PATTERN.test(normalizedValue.toUpperCase())) {
      return invalid('Code 39 obsługuje tylko cyfry, wielkie litery i znaki: - . $ / + % oraz spację.')
    }
    return valid()
  }

  if (type === 'CODABAR') {
    if (!CODABAR_PATTERN.test(normalizedValue)) {
      return invalid('Codabar musi zaczynać się i kończyć literą A, B, C lub D oraz zawierać cyfry lub znaki: - $ : / . +')
    }
    return valid()
  }

  if (type === 'ITF') {
    if (!DIGITS_ONLY_PATTERN.test(normalizedValue)) {
      return invalid('ITF wymaga tylko cyfr.')
    }
    if (normalizedValue.length % 2 !== 0) {
      return invalid('ITF wymaga parzystej liczby cyfr.')
    }
    return valid()
  }

  if (type === 'PHARMACODE') {
    if (!DIGITS_ONLY_PATTERN.test(normalizedValue)) {
      return invalid('Pharmacode wymaga tylko cyfr.')
    }
    const num = Number.parseInt(normalizedValue, 10)
    if (num < 3 || num > 131070) {
      return invalid('Pharmacode musi być liczbą z zakresu od 3 do 131070.')
    }
    return valid()
  }

  return valid()
}
