import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DocxPreview } from '../../types/docx';
import type { BarcodeType } from '../../../barcode/types/barcode';
import type { BarcodeStyle } from '../../utils/writeDocxWithBarcodes';
import { renderBarcodeToSvgString } from '../../../barcode/rendering/renderBarcode';
import styles from './DocxViewer.module.css';

interface BarcodeSvgProps {
  value: string;
  type: BarcodeType;
  style: BarcodeStyle;
}

function BarcodeSvg({ value, type, style }: BarcodeSvgProps) {
  const [svg, ReactSetSvg] = React.useState<string>('');

  React.useEffect(() => {
    const generate = async () => {
      try {
        const svgString = await renderBarcodeToSvgString({
          value: value || ' ',
          type,
          ...style,
        });
        ReactSetSvg(svgString);
      } catch {
        ReactSetSvg('');
      }
    };
    generate();
  }, [value, type, style]);

  if (!svg) {
    return <div style={{ height: style.height, opacity: 0.1, background: '#eee' }} />;
  }

  return (
    <div 
      className={styles.barcodeWrapper} 
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}

interface DocxViewerProps {
  preview: DocxPreview;
  barcodeType: BarcodeType;
  barcodeStyle: BarcodeStyle;
}

export function DocxViewer({ preview, barcodeType, barcodeStyle }: DocxViewerProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.paperWrapper}>
        <div className={styles.paper}>
          {preview.lines.map((line, idx) => (
            <div key={idx} className={styles.block}>
              <div className={styles.content}>
                <div 
                  className={styles.text} 
                  dangerouslySetInnerHTML={{ __html: line.html || line.text || '&nbsp;' }} 
                />
                <BarcodeSvg 
                  value={line.text} 
                  type={barcodeType} 
                  style={barcodeStyle} 
                />
              </div>
            </div>
          ))}
          {preview.lines.length === 0 && (
            <div className={styles.empty}>{t('docx.preview.noLines')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
