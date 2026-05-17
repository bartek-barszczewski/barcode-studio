import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  CircleHelp,
  FileSpreadsheet,
  FileText,
  House,
  Languages,
  Library,
  ScanBarcode,
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

export function NavigationRail() {
  const { i18n, t } = useTranslation()

  const handleLanguageToggle = () => {
    void i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl')
  }

  return (
    <aside className={styles.rail}>
      <div className={styles.topSection}>
        <NavLink className={styles.brand} to="/home">
          <ScanBarcode aria-hidden="true" size={32} />
          <span className={styles.brandText}>{t('navigation.brand')}</span>
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
              <div className={styles.iconContainer}>
                <Icon aria-hidden="true" size={24} />
              </div>
              <span className={styles.label}>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className={styles.bottomSection}>
        <button
          aria-label={t('navigation.languageToggle')}
          className={styles.languageButton}
          onClick={handleLanguageToggle}
          type="button"
        >
          <Languages aria-hidden="true" size={20} />
          <span className={styles.label}>PL / EN</span>
        </button>
      </div>
    </aside>
  )
}
