import type { BarcodeSetItem } from '../types/barcodeSet'
import type { BarcodeFormState } from '../types/barcode'

export function mapBarcodeSetItemToFormState(
  item: BarcodeSetItem,
): BarcodeFormState {
  return {
    type: item.type,
    value: item.value,
    rotation: item.options.rotation,
    barColor: item.options.foreground,
    backgroundColor: item.options.background,
    height: item.options.height,
    margin: item.options.margin,
    barWidth: item.options.barWidth,
    fontSize: item.options.fontSize,
    scale: item.options.scale,
    showText: item.options.textMode !== 'hidden',
  }
}

export function createDefaultBarcodeSetItem(): BarcodeSetItem {
  return {
    id: crypto.randomUUID(),
    value: '12345678',
    type: 'CODE128',
    options: {
      height: 32,
      barWidth: 3,
      scale: 1,
      margin: 8,
      rotation: 0,
      foreground: '#000000',
      background: '#ffffff',
      textMode: 'below',
      fontSize: 20,
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
