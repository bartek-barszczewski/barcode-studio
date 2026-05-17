import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Info,
  Library,
  PlayCircle,
  ScanBarcode,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../../shared/ui/Button/Button'
import { Panel } from '../../shared/ui/Panel/Panel'
import styles from './HomePage.module.css'

const featureIconMap = {
  generatorTitle: ScanBarcode,
  setTitle: Library,
  xlsxTitle: FileSpreadsheet,
  docxTitle: FileText,
} as const

const featureCardKeys = [
  'generatorTitle',
  'setTitle',
  'xlsxTitle',
  'docxTitle',
] as const

const spotlightPointKeys = ['generator', 'set', 'xlsx', 'docx'] as const
const footerLinkKeys = ['generator', 'barcodeSet', 'xlsx', 'docx', 'help'] as const

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sloganItems = t('home.slogans.items', { returnObjects: true }) as string[]

  return (
    <div className={styles.page}>
      <div className={styles.backgroundOrbs} aria-hidden="true">
        <span className={styles.orbPrimary} />
        <span className={styles.orbSecondary} />
        <span className={styles.orbTertiary} />
        <span className={styles.orbRing} />
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{t('home.eyebrow')}</span>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.description}>{t('home.description')}</p>

          <div className={styles.actions}>
            <Button onClick={() => navigate('/generator')} variant="primary">
              <ArrowRight aria-hidden="true" />
              {t('home.primaryAction')}
            </Button>
            <Button onClick={() => navigate('/help')} variant="ghost">
              {t('home.secondaryAction')}
            </Button>
          </div>
        </div>

        <Panel
          className={styles.spotlightPanel}
          title={t('home.spotlightTitle')}
          description={t('home.spotlightDescription')}
        >
          <div className={styles.spotlightMetrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>4</span>
              <span className={styles.metricLabel}>
                {t('home.featureCards.title')}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>100%</span>
              <span className={styles.metricLabel}>
                {t('home.browserFirstMetric')}
              </span>
            </div>
          </div>

          <div className={styles.pointList}>
            {spotlightPointKeys.map((key) => (
              <div className={styles.pointItem} key={key}>
                <span className={styles.pointDot} />
                <p>{t(`home.spotlightPoints.${key}`)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className={styles.slogansSection} aria-labelledby="home-slogans">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>{t('home.sectionLabel')}</span>
          <h2 className={styles.sectionTitle} id="home-slogans">
            {t('home.slogans.title')}
          </h2>
        </div>

        <div className={styles.slogansList}>
          {sloganItems.map((item, index) => (
            <article
              className={styles.sloganCard}
              data-align={index % 2 === 0 ? 'left' : 'right'}
              key={item}
            >
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <Panel
          className={styles.videoPanel}
          title={t('home.video.title')}
          description={t('home.video.description')}
        >
          <div className={styles.videoPlaceholder}>
            <PlayCircle aria-hidden="true" size={56} />
            <span>{t('home.video.placeholder')}</span>
          </div>
        </Panel>

        <Panel className={styles.featuresPanel} title={t('home.featureCards.title')}>
          <div className={styles.featureCards}>
            {featureCardKeys.map((key) => {
              const Icon = featureIconMap[key]
              const bodyKey = key.replace('Title', 'Body')

              return (
                <article className={styles.featureCard} key={key}>
                  <div className={styles.featureIcon}>
                    <Icon aria-hidden="true" size={24} />
                  </div>
                  <h3>{t(`home.featureCards.${key}`)}</h3>
                  <p>{t(`home.featureCards.${bodyKey}`)}</p>
                </article>
              )
            })}
          </div>
        </Panel>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerIntro}>
          <span className={styles.footerEyebrow}>{t('home.footer.eyebrow')}</span>
          <h2 className={styles.footerTitle}>{t('home.footer.title')}</h2>
          <p className={styles.footerDescription}>{t('home.footer.description')}</p>
        </div>

        <div className={styles.footerMeta}>
          <div className={styles.footerBadge}>
            <ShieldCheck aria-hidden="true" size={16} />
            <span>{t('home.footer.badge')}</span>
          </div>

          <nav className={styles.footerLinks} aria-label={t('home.footer.linksLabel')}>
            {footerLinkKeys.map((key) => (
              <button
                className={styles.footerLink}
                key={key}
                onClick={() => navigate(`/${key === 'barcodeSet' ? 'barcode-set' : key}`)}
                type="button"
              >
                {t(`navigation.${key}`)}
              </button>
            ))}
          </nav>

          <div className={styles.footerVersion}>
            <Info aria-hidden="true" size={14} />
            <span>{`Barcode Studio • ${new Date().getFullYear()}`}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
