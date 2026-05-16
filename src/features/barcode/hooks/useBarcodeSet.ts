import { useState, useCallback, useEffect } from 'react'
import type { BarcodeSetItem } from '../types/barcodeSet'
import * as utils from '../utils/barcodeSetUtils'

const STORAGE_KEY = 'barcode-studio-set'

export function useBarcodeSet() {
  const [items, setItems] = useState<BarcodeSetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (utils.validateBarcodeSetItems(parsed)) {
          // Repair existing items that might have empty values from previous versions
          return parsed.map(item => ({
            ...item,
            value: item.value.trim() || '12345678'
          }))
        }
      }
    } catch (e) {
      console.error('Failed to load barcode set from localStorage', e)
    }
    return [utils.createDefaultBarcodeSetItem()]
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback(() => {
    setItems((prev) => utils.addBarcodeItem(prev))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => utils.removeBarcodeItem(prev, id))
  }, [])

  const removeLastItem = useCallback(() => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      const lastItem = prev[prev.length - 1]
      return utils.removeBarcodeItem(prev, lastItem.id)
    })
  }, [])

  const updateItem = useCallback(
    (id: string, patch: Partial<BarcodeSetItem>) => {
      setItems((prev) => utils.updateBarcodeItem(prev, id, patch))
    },
    [],
  )

  const updateOptions = useCallback(
    (id: string, optionsPatch: Partial<BarcodeSetItem['options']>) => {
      setItems((prev) => utils.updateBarcodeOptions(prev, id, optionsPatch))
    },
    [],
  )

  const clearAll = useCallback(() => {
    setItems(utils.clearAllBarcodes())
  }, [])

  const replaceItems = useCallback((newItems: BarcodeSetItem[]) => {
    setItems(newItems.length > 0 ? newItems : [utils.createDefaultBarcodeSetItem()])
  }, [])

  const appendItems = useCallback((newItems: BarcodeSetItem[]) => {
    setItems((prev) => [...prev, ...utils.reassignIds(newItems)])
  }, [])

  const resetSaved = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([utils.createDefaultBarcodeSetItem()])
  }, [])

  return {
    items,
    addItem,
    removeItem,
    removeLastItem,
    updateItem,
    updateOptions,
    clearAll,
    replaceItems,
    appendItems,
    resetSaved,
  }
}
