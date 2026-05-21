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
  Sun,
  Moon,
  Palette,
  RotateCcw,
  Hash,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import styles from './NavigationRail.module.css'

const navItems = [
  { to: '/home', labelKey: 'navigation.home', icon: House },
  { to: '/generator', labelKey: 'navigation.generator', icon: ScanBarcode },
  { to: '/barcode-set', labelKey: 'navigation.barcodeSet', icon: Library },
  { to: '/xlsx', labelKey: 'navigation.xlsx', icon: FileSpreadsheet },
  { to: '/docx', labelKey: 'navigation.docx', icon: FileText },
  { to: '/sequence', labelKey: 'navigation.sequence', icon: Hash },
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
  const {
    theme,
    setTheme,
    lightColors,
    darkColors,
    updateCustomColors,
    resetColors,
  } = useTheme()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)

  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
    setIsMenuOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
      if (themeRef.current && !themeRef.current.contains(target)) {
        setIsThemeOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
        {/* Theme Settings Popover */}
        <div className={styles.themeWrapper} ref={themeRef}>
          <button
            aria-label={i18n.language.startsWith('pl') ? 'Ustawienia motywu' : 'Theme Settings'}
            className={styles.themeButton}
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            type="button"
          >
            <div className={styles.iconContainer}>
              <Palette aria-hidden="true" size={20} />
            </div>
            <span className={styles.label}>
              {i18n.language.startsWith('pl') ? 'WYGLĄD' : 'THEME'}
            </span>
          </button>

          {isThemeOpen && (
            <div className={styles.themeMenu}>
              <h4 className={styles.menuTitle}>
                {i18n.language.startsWith('pl') ? 'Wygląd aplikacji' : 'Appearance'}
              </h4>
              
              {/* Theme Mode Selector */}
              <div className={styles.settingGroup}>
                <span className={styles.settingLabel}>
                  {i18n.language.startsWith('pl') ? 'Tryb' : 'Mode'}
                </span>
                <div className={styles.toggleGroup}>
                  <button
                    className={clsx(styles.toggleBtn, theme === 'light' && styles.activeToggleBtn)}
                    onClick={() => setTheme('light')}
                    type="button"
                  >
                    <Sun size={14} />
                    <span>{i18n.language.startsWith('pl') ? 'Jasny' : 'Light'}</span>
                  </button>
                  <button
                    className={clsx(styles.toggleBtn, theme === 'dark' && styles.activeToggleBtn)}
                    onClick={() => setTheme('dark')}
                    type="button"
                  >
                    <Moon size={14} />
                    <span>{i18n.language.startsWith('pl') ? 'Ciemny' : 'Dark'}</span>
                  </button>
                </div>
              </div>

              {/* Color Customizer */}
              <div className={styles.settingGroup}>
                <span className={styles.settingLabel}>
                  {i18n.language.startsWith('pl') ? 'Kolor wiodący' : 'Primary color'}
                </span>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme === 'light' ? lightColors.primary : darkColors.primary}
                    onChange={(e) => updateCustomColors(theme, { primary: e.target.value })}
                    className={styles.colorPicker}
                  />
                  <span className={styles.colorText}>
                    {theme === 'light' ? lightColors.primary.toUpperCase() : darkColors.primary.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <span className={styles.settingLabel}>
                  {i18n.language.startsWith('pl') ? 'Kolor tła' : 'Background color'}
                </span>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme === 'light' ? lightColors.background : darkColors.background}
                    onChange={(e) => updateCustomColors(theme, { background: e.target.value })}
                    className={styles.colorPicker}
                  />
                  <span className={styles.colorText}>
                    {theme === 'light' ? lightColors.background.toUpperCase() : darkColors.background.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => resetColors(theme)}
                className={styles.resetBtn}
                type="button"
              >
                <RotateCcw size={12} />
                <span>{i18n.language.startsWith('pl') ? 'Przywróć domyślne' : 'Reset defaults'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Existing Language Wrapper */}
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
                  type="button"
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
