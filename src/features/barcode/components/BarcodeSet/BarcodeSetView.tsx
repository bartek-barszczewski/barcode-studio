import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Printer, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
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
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false)
  const prevItemsLengthRef = useRef(items.length)

  // Use IntersectionObserver for high-performance scroll tracking
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-45% 0px -45% 0px', // Target the exact center to match 'block: center'
      threshold: 0
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Ignore observer updates if we are in the middle of a dot-click scroll
      if (isProgrammaticScroll) return;

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'))
          if (!isNaN(index)) {
            setActiveItemIndex(index)
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)
    
    // Watch all cards
    const cards = document.querySelectorAll(`.${styles.minimalCard}`)
    cards.forEach((card, index) => {
      card.setAttribute('data-index', index.toString())
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [items.length, isProgrammaticScroll])

  // Sync selection when items change (add/remove) and ensure drawer stays open
  useEffect(() => {
    if (isDrawerOpen) {
      const currentExists = items.find(i => i.id === selectedItemId)
      
      // If a new item was added OR the currently selected item was removed
      if (items.length > prevItemsLengthRef.current || !currentExists) {
        const lastItem = items[items.length - 1]
        if (lastItem) {
          setSelectedItemId(lastItem.id)
        }
      }
    }
    prevItemsLengthRef.current = items.length
  }, [items, isDrawerOpen, selectedItemId])

  // Calculate indicator position (only for every 5th dot)
  const activeDotIndex = Math.floor(activeItemIndex / 5)
  // dot height (14) + gap (20 aka 1.25rem) = 34px. 
  // Initial top padding of sideNav is 1.5rem (24px).
  // The indicator is 32px high, dot is 14px high. To center 32px indicator on 14px dot:
  // indicatorTop = dotTop - (indicatorHeight - dotHeight) / 2 = dotTop - 9px.
  const indicatorOffset = activeDotIndex * 34;
  const indicatorTransform = `translateY(${indicatorOffset}px)`

  const scrollToItem = useCallback((index: number) => {
    // Manually set index immediately for visual responsiveness
    setActiveItemIndex(index)
    setIsProgrammaticScroll(true)
    
    // Reset programmatic scroll flag after animation completes
    setTimeout(() => setIsProgrammaticScroll(false), 1000)

    if (index === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const totalNavDots = Math.ceil(items.length / 5);
    const currentDotIndex = index / 5;
    if (currentDotIndex === totalNavDots - 1) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      return;
    }

    const cardElements = document.querySelectorAll(`.${styles.minimalCard}`);
    const targetElement = cardElements[index] as HTMLElement;
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [items.length]);

  const handleEdit = (id: string) => {
    setSelectedItemId(id)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  const selectedItem = items.find(i => i.id === selectedItemId) || null
  const selectedIndex = items.findIndex(i => i.id === selectedItemId)

  const handleNavigate = useCallback((direction: 'up' | 'down') => {
    if (items.length <= 1 || selectedIndex === -1) return

    let nextIndex = selectedIndex
    if (direction === 'up') {
      nextIndex = (selectedIndex - 1 + items.length) % items.length
    } else {
      nextIndex = (selectedIndex + 1) % items.length
    }

    const nextItem = items[nextIndex]
    if (nextItem) {
      setSelectedItemId(nextItem.id)
      scrollToItem(nextIndex)
    }
  }, [items, selectedIndex, scrollToItem])

  const handleAddItem = () => {
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
    removeLastItem()
  }

  const handlePrintAll = useCallback(async () => {
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
  }, [items, isPrinting]);

  // Keyboard shortcut: Ctrl+P for Print All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for P key with Ctrl (Windows/Linux) or Meta (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        void handlePrintAll()
      }
      
      // Arrow navigation when sidebar is open
      if (isDrawerOpen) {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          handleNavigate('up')
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          handleNavigate('down')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrintAll, isDrawerOpen, handleNavigate]) // Optimized dependencies

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
            showPreviewFrame={false}
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
          onClick={handlePrintAll}
          disabled={isPrinting || items.every(i => !i.value.trim())}
          className={`${styles.roundActionButton} ${styles.printActionButton}`}
          title={t('barcodeSet.actions.printAll')}
        >
          <Printer size={32} />
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

      {items.length > 1 && (
        <nav className={styles.sideNav}>
          <div 
            className={styles.navIndicator} 
            style={{ transform: indicatorTransform }}
          />
          {items.map((item, index) => {
            // Only show a dot for every 5th item (0, 5, 10...)
            if (index % 5 !== 0) return null;
            
            const isActive = activeItemIndex >= index && activeItemIndex < index + 5;
            
            return (
              <button
                key={`nav-${item.id}`}
                className={`${styles.navDot} ${isActive ? styles.navDotActive : ''}`}
                onClick={() => scrollToItem(index)}
                aria-label={`Scroll to items starting at ${index + 1}`}
              >
                <span className={styles.navDotTooltip}>
                  #{index + 1} {items.length > index + 1 ? ` - #${Math.min(index + 5, items.length)}` : ''}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <div className={`${styles.sidebarNavArrows} ${isDrawerOpen ? styles.sidebarNavArrowsVisible : ''}`}>
        <button 
          className={styles.navArrowButton} 
          onClick={() => handleNavigate('up')}
          aria-label={t('barcodeSet.actions.previous')}
          title={t('barcodeSet.actions.previous')}
        >
          <ChevronUp size={28} />
        </button>
        <button 
          className={styles.navArrowButton} 
          onClick={() => handleNavigate('down')}
          aria-label={t('barcodeSet.actions.next')}
          title={t('barcodeSet.actions.next')}
        >
          <ChevronDown size={28} />
        </button>
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
