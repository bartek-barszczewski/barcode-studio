// @ts-expect-error - bwip-js lacks proper type definitions for some exports in this environment
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import type { BarcodeFormState, BarcodeType } from '../types/barcode';
import {
  getBarcodeTextLayout,
  getBarcodeTextMetrics,
  getBarcodeTextValue,
  getRenderScale,
  shouldRenderCustomText,
  supportsNativeTextLayout,
  TEXT_FONT_FAMILY,
} from './barcodeText';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const BWIP_JS_FORMATS: Partial<Record<BarcodeType, string>> = {
  CODE128: 'code128',
  EAN13: 'ean13',
  EAN8: 'ean8',
  UPCA: 'upca',
  UPCE: 'upce',
  CODE39: 'code39',
  CODE39EXT: 'code39ext',
  CODE93: 'code93',
  CODE93EXT: 'code93ext',
  CODABAR: 'rationalizedCodabar',
  ITF: 'interleaved2of5',
  DATAMATRIX: 'datamatrix',
  PDF417: 'pdf417',
  AZTEC: 'azteccode',
  PHARMACODE: 'pharmacode',
};

const BWIP_MAX_TEXT_SIZE = 25;

const isFixedSquareMatrixCode = (type: BarcodeType) =>
  type === 'DATAMATRIX' || type === 'AZTEC';

const assertColor = (color: string, fieldName: string) => {
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error(`${fieldName} musi być kolorem HEX.`);
  }
};

const injectTextToCanvas = (
  canvas: OffscreenCanvas,
  input: BarcodeFormState,
  originalWidth: number,
  originalHeight: number
) => {
  if (!shouldRenderCustomText(input)) return canvas;

  const metrics = getBarcodeTextMetrics(input);
  const layout = getBarcodeTextLayout(
    { minX: 0, minY: 0, width: originalWidth, height: originalHeight },
    metrics,
  );
  const newMinX = Math.min(0, layout.minX);
  const newMinY = Math.min(0, layout.minY);
  const newMaxX = Math.max(originalWidth, layout.maxX);
  const newMaxY = Math.max(originalHeight, layout.maxY);

  const newCanvas = new OffscreenCanvas(
    Math.ceil(newMaxX - newMinX),
    Math.ceil(newMaxY - newMinY),
  );
  const newCtx = newCanvas.getContext('2d');
  if (!newCtx) throw new Error('Nie można utworzyć kontekstu 2d.');

  // Fill background
  newCtx.fillStyle = input.backgroundColor;
  newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

  // Draw original image
  newCtx.drawImage(canvas, -newMinX, -newMinY);

  // Draw text
  newCtx.save();
  newCtx.fillStyle = input.barColor;
  newCtx.font = `${metrics.fontStyle} ${metrics.fontWeight} ${metrics.fontSize}px ${TEXT_FONT_FAMILY}`;
  newCtx.textAlign = 'center';
  newCtx.textBaseline = 'middle';
  newCtx.translate(layout.x - newMinX, layout.y - newMinY);
  newCtx.rotate((metrics.rotation * Math.PI) / 180);
  newCtx.fillText(getBarcodeTextValue(input), 0, 0);
  newCtx.restore();

  return newCanvas;
};

const renderQrCodeCanvas = async (input: BarcodeFormState): Promise<OffscreenCanvas> => {
  const scale = getRenderScale(input.scale);
  const size = Math.max(1, Math.round(input.height)) * scale;

  const canvas = new OffscreenCanvas(size, size);

  await QRCode.toCanvas(canvas as unknown as HTMLCanvasElement, input.value, {
    margin: input.margin,
    width: Math.round(size),
    color: {
      dark: input.barColor,
      light: input.backgroundColor,
    },
  });

  return injectTextToCanvas(canvas, input, canvas.width, canvas.height);
};

const forceSquareMatrixCanvas = (
  canvas: OffscreenCanvas,
  input: BarcodeFormState,
): OffscreenCanvas => {
  const side = Math.max(1, canvas.height);

  if (canvas.width === side && canvas.height === side) {
    return canvas;
  }

  const squareCanvas = new OffscreenCanvas(side, side);
  const context = squareCanvas.getContext('2d');

  if (!context) {
    throw new Error('Nie można utworzyć kontekstu 2d.');
  }

  if (!input.transparentBackground) {
    context.fillStyle = input.backgroundColor;
    context.fillRect(0, 0, side, side);
  }

  const drawScale = side / Math.max(canvas.width, canvas.height);
  const drawWidth = canvas.width * drawScale;
  const drawHeight = canvas.height * drawScale;
  const offsetX = (side - drawWidth) / 2;
  const offsetY = (side - drawHeight) / 2;

  context.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
  return squareCanvas;
};

const renderBwipBarcodeCanvas = (input: BarcodeFormState): OffscreenCanvas => {
  const bcid = BWIP_JS_FORMATS[input.type];
  if (!bcid) {
    throw new Error('Nieprawidłowy typ kodu kreskowego dla bwip-js.');
  }

  const scale = getRenderScale(input.scale);
  const barWidth = input.barWidth || 2;
  const bwipScale = barWidth * scale;
  const bwipHeight = input.height / barWidth;
  const bwipTextSize = input.fontSize / bwipScale;

  const supportsBuiltInText = ['EAN13', 'EAN8', 'UPCA', 'UPCE'].includes(input.type);
  const useBuiltInText =
    supportsBuiltInText &&
    input.showText &&
    !input.displayValue &&
    supportsNativeTextLayout(input) &&
    bwipTextSize > 0 &&
    bwipTextSize < BWIP_MAX_TEXT_SIZE;

  let textToRender = input.value;
  if (input.type === 'EAN13' && textToRender.length === 13) {
    textToRender = textToRender.substring(0, 12);
  } else if (input.type === 'EAN8' && textToRender.length === 8) {
    textToRender = textToRender.substring(0, 7);
  } else if (input.type === 'UPCA' && textToRender.length === 12) {
    textToRender = textToRender.substring(0, 11);
  } else if (input.type === 'UPCE' && textToRender.length === 8) {
    textToRender = textToRender.substring(0, 7);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    bcid,
    text: textToRender,
    scale: bwipScale,
    height: bwipHeight,
    barcolor: input.barColor.replace('#', ''),
    backgroundcolor: input.backgroundColor.replace('#', ''),
    includetext: useBuiltInText,
    guardwhitespace: false,
  };

  if (useBuiltInText) {
    options.textsize = bwipTextSize;
    const pad = (input.fontSize + 10) / bwipScale;
    options.paddingwidth = Math.max(input.margin / bwipScale, 2);
    options.paddingheight = Math.max(input.margin / bwipScale, pad);
  } else {
    options.paddingwidth = input.margin / bwipScale;
    options.paddingheight = input.margin / bwipScale;
  }

  const canvas = new OffscreenCanvas(1, 1);
  try {
    bwipjs.toCanvas(canvas as unknown as HTMLCanvasElement, options);
  } catch (error) {
    const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
    let friendlyMessage = message;
    if (message.includes('code39badCharacter')) {
      friendlyMessage = 'Code 39 obsługuje tylko cyfry, wielkie litery i znaki: - . $ / + % oraz spację.';
    }
    throw new Error(friendlyMessage || 'Błąd generowania kodu.', { cause: error });
  }

  const renderedCanvas = useBuiltInText
    ? canvas
    : injectTextToCanvas(canvas, input, canvas.width, canvas.height);

  if (isFixedSquareMatrixCode(input.type)) {
    return forceSquareMatrixCanvas(renderedCanvas, input);
  }

  return renderedCanvas;
};

export const renderBarcodeToOffscreenCanvas = async (
  input: BarcodeFormState
): Promise<OffscreenCanvas> => {
  assertColor(input.barColor, 'Kolor kodu');
  assertColor(input.backgroundColor, 'Tło');

  if (input.type === 'QR') {
    return renderQrCodeCanvas(input);
  }

  if (BWIP_JS_FORMATS[input.type]) {
    return renderBwipBarcodeCanvas(input);
  }

  throw new Error('Nieobsługiwany typ kodu kreskowego.');
};

export const offscreenCanvasToUint8Array = async (canvas: OffscreenCanvas): Promise<Uint8Array> => {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

export const offscreenCanvasToBase64 = async (canvas: OffscreenCanvas): Promise<string> => {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // remove data:image/png;base64,
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
