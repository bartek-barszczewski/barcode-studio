import { renderBarcodeToSvgString } from '../rendering/renderBarcode';
import type { BarcodeFormState } from '../types/barcode';

export const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

export interface BarcodeImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

const svgToPngDataUrl = (svgString: string): Promise<BarcodeImageResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Nie można utworzyć kontekstu canvas.'));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Błąd podczas ładowania obrazu SVG.'));
    };

    img.src = url;
  });
};

export const generateBarcodePngDataUrl = async (input: BarcodeFormState): Promise<BarcodeImageResult> => {
  try {
    const svgString = await renderBarcodeToSvgString(input);
    return await svgToPngDataUrl(svgString);
  } catch (error) {
    throw new Error('Nie udało się wygenerować obrazu PNG kodu kreskowego.', { cause: error });
  }
};
