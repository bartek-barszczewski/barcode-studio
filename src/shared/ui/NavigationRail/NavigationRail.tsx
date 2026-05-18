import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import {
  CircleHelp,
  FileSpreadsheet,
  FileText,
  House,
  Languages,
  Library,
  ScanBarcode,
  Check,
} from 'lucide-react'
import styles from './NavigationRail.module.css'

const navItems = [
  { to: '/home', labelKey: 'navigation.home', icon: House },
  { to: '/generator', labelKey: 'navigation.generator', icon: ScanBarcode },
  { to: '/barcode-set', labelKey: 'navigation.barcodeSet', icon: Library },
  { to: '/xlsx', labelKey: 'navigation.xlsx', icon: FileSpreadsheet },
  { to: '/docx', labelKey: 'navigation.docx', icon: FileText },
  { to: '/help', labelKey: 'navigation.help', icon: CircleHelp },
]

const languages = [
  { code: 'pl', label: 'Polski' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
]

export function NavigationRail() {
  const { i18n, t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
    setIsMenuOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <aside className={styles.rail}>
      <div className={styles.topSection}>
        <NavLink className={styles.brand} to="/home">
          <ScanBarcode aria-hidden="true" size={32} />
        </NavLink>
      </div>

      <nav className={styles.navigation} aria-label={t('navigation.ariaLabel')}>
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              className={({ isActive }) =>
                clsx(styles.link, isActive && styles.activeLink)
              }
              key={item.to}
              to={item.to}
            >
              <div className={styles.activeIndicator} />
              <div className={styles.iconContainer}>
                <Icon aria-hidden="true" size={24} />
              </div>
              <span className={styles.label}>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className={styles.bottomSection}>
        <div className={styles.languageWrapper} ref={menuRef}>
          <button
            aria-label={t('navigation.languageToggle')}
            className={styles.languageButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
          >
            <div className={styles.iconContainer}>
              <Languages aria-hidden="true" size={20} />
            </div>
            <span className={styles.label}>{i18n.language.toUpperCase()}</span>
          </button>

          {isMenuOpen && (
            <div className={styles.languageMenu}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={clsx(
                    styles.menuItem,
                    i18n.language === lang.code && styles.activeMenuItem
                  )}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span style={{ flex: 1 }}>{lang.label}</span>
                  {i18n.language === lang.code && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
