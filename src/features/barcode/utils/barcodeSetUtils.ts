import type { BarcodeSetItem } from '../types/barcodeSet'
import type { BarcodeFormState } from '../types/barcode'

const DEFAULT_BARCODE_SET_OPTIONS: BarcodeSetItem['options'] = {
  height: 32,
  barWidth: 3,
  scale: 1,
  margin: 8,
  rotation: 0,
  foreground: '#000000',
  background: '#ffffff',
  transparentBackground: false,
  textMode: 'below',
  fontSize: 20,
  textBold: false,
  textItalic: false,
  textPosition: 'bottom',
  textRotation: 0,
}

export function mapBarcodeSetItemToFormState(
  item: BarcodeSetItem,
): BarcodeFormState {
  return {
    type: item.type,
    value: item.value,
    displayValue: item.displayValue,
    rotation: item.options.rotation,
    barColor: item.options.foreground,
    backgroundColor: item.options.background,
    height: item.options.height,
    margin: item.options.margin,
    barWidth: item.options.barWidth,
    fontSize: item.options.fontSize,
    scale: item.options.scale,
    transparentBackground: Boolean(item.options.transparentBackground),
    showText: item.options.textMode !== 'hidden',
    textBold: Boolean(item.options.textBold),
    textItalic: Boolean(item.options.textItalic),
    textPosition: item.options.textPosition ?? 'bottom',
    textRotation: item.options.textRotation ?? 0,
  }
}

export function createDefaultBarcodeSetItem(): BarcodeSetItem {
  return {
    id: crypto.randomUUID(),
    value: '12345678',
    displayValue: '',
    type: 'CODE128',
    options: { ...DEFAULT_BARCODE_SET_OPTIONS },
  }
}

export function normalizeBarcodeSetItem(item: BarcodeSetItem): BarcodeSetItem {
  return {
    ...item,
    displayValue: item.displayValue ?? '',
    options: {
      ...DEFAULT_BARCODE_SET_OPTIONS,
      ...item.options,
      textMode: item.options.textMode === 'hidden' ? 'hidden' : 'below',
      transparentBackground: Boolean(item.options.transparentBackground),
      textBold: Boolean(item.options.textBold),
      textItalic: Boolean(item.options.textItalic),
      textPosition: item.options.textPosition ?? 'bottom',
      textRotation:
        typeof item.options.textRotation === 'number' ? item.options.textRotation : 0,
    },
  }
}

export function addBarcodeItem(items: BarcodeSetItem[]): BarcodeSetItem[] {
  return [...items, createDefaultBarcodeSetItem()]
}

export function removeBarcodeItem(
  items: BarcodeSetItem[],
  id: string,
): BarcodeSetItem[] {
  if (items.length <= 1) return items
  return items.filter((item) => item.id !== id)
}

export function updateBarcodeItem(
  items: BarcodeSetItem[],
  id: string,
  patch: Partial<BarcodeSetItem>,
): BarcodeSetItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function updateBarcodeOptions(
  items: BarcodeSetItem[],
  id: string,
  optionsPatch: Partial<BarcodeSetItem['options']>,
): BarcodeSetItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, options: { ...item.options, ...optionsPatch } }
      : item,
  )
}

export function clearAllBarcodes(): BarcodeSetItem[] {
  return [createDefaultBarcodeSetItem()]
}

export function validateBarcodeSetItem(item: unknown): item is BarcodeSetItem {
  if (typeof item !== 'object' || item === null) return false
  
  const candidate = item as Record<string, unknown>
  const options = candidate.options as Record<string, unknown> | undefined

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.value === 'string' &&
    typeof candidate.type === 'string' &&
    typeof options === 'object' &&
    options !== null &&
    typeof options.height === 'number' &&
    typeof options.barWidth === 'number'
  )
}

export function validateBarcodeSetItems(data: unknown): data is BarcodeSetItem[] {
  if (!Array.isArray(data)) return false
  return data.every(validateBarcodeSetItem)
}

export function importFromText(text: string): BarcodeSetItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((value) => ({
      ...createDefaultBarcodeSetItem(),
      value,
    }))
}

export function reassignIds(items: BarcodeSetItem[]): BarcodeSetItem[] {
  return items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }))
}
