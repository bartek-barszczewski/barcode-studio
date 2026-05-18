import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import pl from './locales/pl.json'
import de from './locales/de.json'
import es from './locales/es.json'
import ja from './locales/ja.json'
import fr from './locales/fr.json'
import it from './locales/it.json'

i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    ja: { translation: ja },
    fr: { translation: fr },
    it: { translation: it },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
