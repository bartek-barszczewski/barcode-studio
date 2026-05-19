import React, { useEffect, useState, memo } from 'react';
import { renderBarcodeToSvgString } from '../../rendering/renderBarcode';
import type {
  BarcodeFormState,
  BarcodeRotation,
  BarcodeTextPosition,
  BarcodeType,
} from '../../types/barcode';
import styles from './SimpleBarcodePreview.module.css';

interface SimpleBarcodePreviewProps {
  value: string;
  displayValue?: string;
  type: BarcodeType;
  barColor: string;
  backgroundColor: string;
  showText: boolean;
  fontSize: number;
  height: number;
  barWidth: number;
  margin: number;
  scale: number;
  rotation: BarcodeRotation;
  textBold?: boolean;
  textItalic?: boolean;
  textPosition?: BarcodeTextPosition;
  textRotation?: number;
}

export const SimpleBarcodePreview: React.FC<SimpleBarcodePreviewProps> = memo(({
  value,
  displayValue,
  type,
  barColor,
  backgroundColor,
  showText,
  fontSize,
  height,
  barWidth,
  margin,
  scale,
  rotation,
  textBold,
  textItalic,
  textPosition,
  textRotation,
}) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const render = async () => {
      try {
        setError(false);
        const settings: BarcodeFormState = {
          value,
          displayValue,
          type,
          barColor,
          backgroundColor,
          showText,
          fontSize,
          height,
          barWidth,
          margin,
          scale,
          rotation,
          textBold,
          textItalic,
          textPosition,
          textRotation,
        };

        const svgString = await renderBarcodeToSvgString(settings);
        setSvg(svgString);
      } catch (err) {
        console.error('SimpleBarcodePreview error:', err);
        setError(true);
      }
    };

    render();
  }, [value, displayValue, type, barColor, backgroundColor, showText, fontSize, height, barWidth, margin, scale, rotation, textBold, textItalic, textPosition, textRotation]);

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
