import React, { useEffect, useState, memo } from 'react';
import { renderBarcodeToSvgString } from '../../rendering/renderBarcode';
import type { BarcodeType, BarcodeFormState } from '../../types/barcode';
import styles from './SimpleBarcodePreview.module.css';

interface SimpleBarcodePreviewProps {
  value: string;
  type: BarcodeType;
  barColor: string;
  backgroundColor: string;
  showText: boolean;
  fontSize: number;
  height: number;
  barWidth: number;
  margin: number;
  scale: number;
}

export const SimpleBarcodePreview: React.FC<SimpleBarcodePreviewProps> = memo(({
  value,
  type,
  barColor,
  backgroundColor,
  showText,
  fontSize,
  height,
  barWidth,
  margin,
  scale,
}) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const render = async () => {
      try {
        setError(false);
        const settings: BarcodeFormState = {
          value,
          type,
          barColor,
          backgroundColor,
          showText,
          fontSize,
          height,
          barWidth,
          margin,
          scale, // Respect the scale prop!
          rotation: 0,
        };

        const svgString = await renderBarcodeToSvgString(settings);
        setSvg(svgString);
      } catch (err) {
        console.error('SimpleBarcodePreview error:', err);
        setError(true);
      }
    };

    render();
  }, [value, type, barColor, backgroundColor, showText, fontSize, height, barWidth, margin, scale]);

  if (error) {
    return <div className={styles.previewContainer}><span className={styles.errorLabel}>!</span></div>;
  }

  return (
    <div 
      className={styles.previewContainer} 
      dangerouslySetInnerHTML={{ __html: svg || '' }} 
    />
  );
});
