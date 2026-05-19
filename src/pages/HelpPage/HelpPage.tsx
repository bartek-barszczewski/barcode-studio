import { useTranslation } from 'react-i18next';
import { 
  Barcode, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  AlertTriangle,
  HelpCircle,
  Info,
  CheckCircle2,
  Layers
} from 'lucide-react';
import styles from './HelpPage.module.css';
import { Panel } from '../../shared/ui/Panel/Panel';
import { BuyMeCoffee } from '../../shared/ui/BuyMeCoffee/BuyMeCoffee';
import { BARCODE_TYPE_OPTIONS } from '../../features/barcode/constants/barcodeTypes';

const HELP_STANDARD_KEYS = BARCODE_TYPE_OPTIONS.map(({ value }) => value);

export function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Panel title={t('help.title')} description={t('help.description')}>
        <div className={styles.grid}>
          {/* Generator Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Barcode size={24} />
              </div>
              <h3>{t('help.sections.generator.title')}</h3>
            </div>
            <p>{t('help.sections.generator.body')}</p>
          </section>

          {/* Barcode Set Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Layers size={24} />
              </div>
              <h3>{t('help.sections.barcodeSet.title')}</h3>
            </div>
            <div className={styles.workflow}>
              <p>{t('help.sections.barcodeSet.body')}</p>
              <strong>{t('help.sections.barcodeSet.features.title')}</strong>
              <ul>
                <li>{t('help.sections.barcodeSet.features.nav')}</li>
                <li>{t('help.sections.barcodeSet.features.edit')}</li>
                <li>{t('help.sections.barcodeSet.features.print')}</li>
                <li>{t('help.sections.barcodeSet.features.shortcut')}</li>
              </ul>
            </div>
          </section>

          {/* XLSX Workflow Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <FileSpreadsheet size={24} />
              </div>
              <h3>{t('help.sections.xlsx.title')}</h3>
            </div>
            <div className={styles.workflow}>
              <strong>{t('help.sections.xlsx.workflow.title')}</strong>
              <ul>
                <li>{t('help.sections.xlsx.workflow.step1')}</li>
                <li>{t('help.sections.xlsx.workflow.step2')}</li>
                <li>{t('help.sections.xlsx.workflow.step3')}</li>
                <li>{t('help.sections.xlsx.workflow.step4')}</li>
              </ul>
            </div>
            <div className={styles.workflow}>
              <strong>{t('help.sections.xlsx.printCards.title')}</strong>
              <ul>
                <li>{t('help.sections.xlsx.printCards.step1')}</li>
                <li>{t('help.sections.xlsx.printCards.step2')}</li>
                <li>{t('help.sections.xlsx.printCards.step3')}</li>
              </ul>
            </div>
          </section>

          {/* DOCX Workflow Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <FileText size={24} />
              </div>
              <h3>{t('help.sections.docx.title')}</h3>
            </div>
            <div className={styles.workflow}>
              <strong>{t('help.sections.docx.workflow.title')}</strong>
              <ul>
                <li>{t('help.sections.docx.workflow.step1')}</li>
                <li>{t('help.sections.docx.workflow.step2')}</li>
                <li>{t('help.sections.docx.workflow.step3')}</li>
              </ul>
            </div>
          </section>

          {/* Printing Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Printer size={24} />
              </div>
              <h3>{t('help.sections.printing.title')}</h3>
            </div>
            <p className={styles.preLine}>{t('help.sections.printing.body')}</p>
          </section>

          {/* Troubleshooting Section */}
          <section className={`${styles.card} ${styles.warningCard}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrapper} ${styles.warningIcon}`}>
                <AlertTriangle size={24} />
              </div>
              <h3>{t('help.sections.troubleshooting.title')}</h3>
            </div>
            <ul className={styles.plainList}>
              <li><strong>EAN:</strong> {t('help.sections.troubleshooting.eanError')}</li>
              <li><strong>Widoczność:</strong> {t('help.sections.troubleshooting.invisibleCode')}</li>
            </ul>
          </section>

          {/* Standards Reference Section */}
          <section className={`${styles.card} ${styles.fullWidth}`}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Info size={24} />
              </div>
              <h3>{t('help.sections.standards.title')}</h3>
            </div>
            <p className={styles.introText}>{t('help.sections.standards.intro')}</p>
            <div className={styles.standardsGrid}>
              {HELP_STANDARD_KEYS.map((key) => (
                <div key={key} className={styles.standardItem}>
                  <strong>{t(`help.sections.standards.types.${key}.name`)}</strong>
                  <p>{t(`help.sections.standards.types.${key}.desc`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Buy Me Coffee Section - Moved Higher */}
          <div className={styles.buyMeCoffeeWrapper}>
            <BuyMeCoffee />
          </div>

          {/* FAQ Section */}
          <section className={`${styles.card} ${styles.fullWidth}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrapper} ${styles.faqIcon}`}>
                <HelpCircle size={24} />
              </div>
              <h3>{t('help.sections.faq.title')}</h3>
            </div>
            <div className={styles.faqList}>
              <div className={styles.faqItem}>
                <strong>Q: {t('help.sections.faq.q1')}</strong>
                <p>A: {t('help.sections.faq.a1')}</p>
              </div>
              <div className={styles.faqItem}>
                <strong>Q: {t('help.sections.faq.q2')}</strong>
                <p>A: {t('help.sections.faq.a2')}</p>
              </div>
            </div>
          </section>
          
          <div className={styles.footer}>
            <div className={styles.badge}>
              <CheckCircle2 size={14} />
              <span>Bezpieczne przetwarzanie lokalne</span>
            </div>
            <div className={styles.version}>
              <Info size={14} />
              <span>Barcode Studio v1.0.0 • 2026</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
