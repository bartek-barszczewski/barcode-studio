import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  CircleHelp,
  FileSpreadsheet,
  FileText,
  Languages,
  ScanBarcode,
} from 'lucide-react'
import styles from './TopNavigation.module.css'

const navItems = [
  { to: '/generator', labelKey: 'navigation.generator', icon: ScanBarcode },
  { to: '/xlsx', labelKey: 'navigation.xlsx', icon: FileSpreadsheet },
  { to: '/docx', labelKey: 'navigation.docx', icon: FileText },
  { to: '/help', labelKey: 'navigation.help', icon: CircleHelp },
]

export function TopNavigation() {
  const { i18n, t } = useTranslation()

  const handleLanguageToggle = () => {
    void i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl')
  }

  return (
    <header className={styles.topbar}>
      <NavLink className={styles.brand} to="/generator">
        <ScanBarcode aria-hidden="true" />
        {t('navigation.brand')}
      </NavLink>
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
              <Icon aria-hidden="true" />
              {t(item.labelKey)}
            </NavLink>
          )
        })}
      </nav>
      <button
        aria-label={t('navigation.languageToggle')}
        className={styles.languageButton}
        onClick={handleLanguageToggle}
        type="button"
      >
        <Languages aria-hidden="true" />
        PL / EN
      </button>
    </header>
  )
}
