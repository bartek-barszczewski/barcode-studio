import { useTranslation } from 'react-i18next';
import styles from './BuyMeCoffee.module.css';

export function BuyMeCoffee() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <span className={styles.shape} aria-hidden="true" />
      <span className={styles.shape} aria-hidden="true" />
      <span className={styles.shape} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.textSide}>
          <h3 className={styles.title}>{t('support.title')}</h3>
          <div className={styles.paragraphs}>
            <p>{t('support.description')}</p>
            <p className={styles.highlight}>{t('support.privacy')}</p>
            <p>{t('support.buyMeACoffee')}</p>
            <p>{t('support.signal')}</p>
            <p className={styles.thanks}>{t('support.thanks')}</p>
          </div>
        </div>
        <div className={styles.qrSide}>
          <a 
            href="https://www.naffy.io/bjart-bersvik/barcode-studio-buyme-a-coffee" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.qrLink}
          >
            <img 
              src="/naffy-coffee.svg" 
              alt="Support via naffy.io" 
              className={styles.qrImage}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
