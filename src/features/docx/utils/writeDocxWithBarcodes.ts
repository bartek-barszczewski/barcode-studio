import { Document, Packer, Paragraph, ImageRun, TextRun } from 'docx';
import {
  generateBarcodePngDataUrl,
  dataUrlToBase64,
  type BarcodeImageResult,
} from '../../barcode/export/generateBarcodePng';
import type { BarcodeType, BarcodeFormState } from '../../barcode/types/barcode';

export type BarcodeStyle = Omit<BarcodeFormState, 'type' | 'value'>;

interface WriteDocxParams {
  lines: string[];
  barcodeType: BarcodeType;
  barcodeStyle: BarcodeStyle;
}

export const createDocxOutputFileName = (originalName: string): string => {
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) return `${originalName}_barcodes.docx`;

  const name = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${name}_barcodes${ext}`;
};

export const writeDocxWithBarcodes = async (params: WriteDocxParams): Promise<Blob> => {
  const { lines, barcodeType, barcodeStyle } = params;

  const children: Paragraph[] = [];
  const CONCURRENCY_LIMIT = 50;

  // Generate all barcodes in parallel chunks
  const barcodeResults: (BarcodeImageResult | { error: unknown })[] = [];
  for (let i = 0; i < lines.length; i += CONCURRENCY_LIMIT) {
    const chunk = lines.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map(async (line) => {
        const barcodeState: BarcodeFormState = {
          ...barcodeStyle,
          type: barcodeType,
          value: line,
        };
        try {
          return await generateBarcodePngDataUrl(barcodeState);
        } catch (error) {
          return { error };
        }
      })
    );
    barcodeResults.push(...chunkResults);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = barcodeResults[i];

    // Add text paragraph
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
      }),
    );

    if ('error' in result) {
      console.error(`Failed to generate barcode for line: ${line}`, result.error);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `[Error generating barcode: ${line}]`, color: 'FF0000' })],
        }),
      );
    } else {
      const { dataUrl, width, height } = result;
      const base64 = dataUrlToBase64(dataUrl);
      const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      // Add barcode image paragraph
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: buffer,
              type: 'png',
              transformation: {
                width: width * 0.75,
                height: height * 0.75,
              },
            }),
          ],
        }),
      );
    }

    // Add empty paragraph for spacing
    children.push(new Paragraph({}));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
};
