import type { PrintCardData } from './preparePrintData';

const PX_PER_MM = 96 / 25.4;
const mmToPx = (valueMm: number): number => valueMm * PX_PER_MM;

const PRINT_CARD_WIDTH_MM = 85.6;
const PRINT_CARD_HEIGHT_MM = 53.98;
const LABEL_BLEED_WIDTH_MM = 15;
const CUT_LINE_BORDER_WIDTH_MM = 1.05;
const PAGE_WIDTH_PX = 210 * PX_PER_MM;
const PAGE_HEIGHT_PX = 297 * PX_PER_MM;
const PAGE_PADDING_PX = 12 * PX_PER_MM;
const GRID_GAP_PX = 6 * PX_PER_MM;
const SHEET_META_HEIGHT_PX = 48;
const AVAILABLE_GRID_WIDTH_PX = PAGE_WIDTH_PX - PAGE_PADDING_PX * 2;
const AVAILABLE_GRID_HEIGHT_PX =
  PAGE_HEIGHT_PX - PAGE_PADDING_PX * 2 - SHEET_META_HEIGHT_PX;
const CARD_WIDTH_PX = Math.min(AVAILABLE_GRID_WIDTH_PX, mmToPx(PRINT_CARD_WIDTH_MM));
const CARD_HEIGHT_PX = Math.min(AVAILABLE_GRID_HEIGHT_PX, mmToPx(PRINT_CARD_HEIGHT_MM));
const CARD_STACK_VERTICAL_PADDING_PX = 4;
const CARD_STACK_HORIZONTAL_PADDING_PX = 2;
const STACK_GAP_PX = 12;
const LABEL_VERTICAL_PADDING_PX = 8;
const LABEL_BASE_FONT_SIZE_PX = 12;
const MIN_LABEL_FONT_SIZE_PX = 8;
const LABEL_FONT = `400 ${LABEL_BASE_FONT_SIZE_PX}px Roboto, "Segoe UI", Arial, sans-serif`;
const MAX_STACK_WIDTH_PX = CARD_WIDTH_PX - CARD_STACK_HORIZONTAL_PADDING_PX * 2;
const MAX_STACK_HEIGHT_PX = CARD_HEIGHT_PX - CARD_STACK_VERTICAL_PADDING_PX * 2;
const LABEL_AVAILABLE_WIDTH_PX = CARD_HEIGHT_PX - LABEL_VERTICAL_PADDING_PX * 2;

type PrintableCard = PrintCardData & {
  cardWidthPx: number;
  cardHeightPx: number;
  primaryRenderWidthPx: number;
  primaryRenderHeightPx: number;
  secondaryRenderWidthPx: number;
  secondaryRenderHeightPx: number;
  labelFontSizePx: number;
};

type PrintableRow = PrintableCard[];

type PrintablePage = PrintableRow[];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const measureLongestLabelLineWidth = (label: string): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return 0;
  }

  context.font = LABEL_FONT;

  return label.split('\n').reduce((longestWidth, line) => {
    const metricsWidth = context.measureText(line).width;
    const letterSpacingWidth = Math.max(0, line.length - 1) * 0.48;
    return Math.max(longestWidth, metricsWidth + letterSpacingWidth);
  }, 0);
};

const parseSvgDimension = (svg: string, attribute: 'width' | 'height'): number => {
  const match = svg.match(new RegExp(`${attribute}="([0-9.]+)`));

  if (!match) {
    return 0;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getWidthFitScale = (widestBarcodeWidth: number): number => {
  if (widestBarcodeWidth <= 0) {
    return 1;
  }

  return Math.min(1, MAX_STACK_WIDTH_PX / widestBarcodeWidth);
};

const getBarcodeStackScale = (
  widestBarcodeWidth: number,
  barcodeStackHeight: number,
): number => {
  const widthScale = getWidthFitScale(widestBarcodeWidth);

  if (barcodeStackHeight <= 0) {
    return widthScale;
  }

  const scaledHeight = barcodeStackHeight * widthScale;
  if (scaledHeight <= MAX_STACK_HEIGHT_PX) {
    return widthScale;
  }

  return widthScale * (MAX_STACK_HEIGHT_PX / scaledHeight);
};

const scaleDimension = (value: number, scale: number): number => {
  if (value <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(value * scale));
};

const toPrintableCard = (card: PrintCardData): PrintableCard => {
  const primaryWidth = parseSvgDimension(card.primaryBarcodeSvg, 'width');
  const primaryHeight = parseSvgDimension(card.primaryBarcodeSvg, 'height');
  const secondaryWidth = parseSvgDimension(card.secondaryBarcodeSvg, 'width');
  const secondaryHeight = parseSvgDimension(card.secondaryBarcodeSvg, 'height');
  const widestBarcodeWidth = Math.max(primaryWidth, secondaryWidth);
  const barcodeStackHeight = primaryHeight + secondaryHeight + STACK_GAP_PX;
  const longestLineWidth = measureLongestLabelLineWidth(card.combinedLabel);
  const labelWidthScale =
    longestLineWidth > 0 ? Math.min(1, LABEL_AVAILABLE_WIDTH_PX / longestLineWidth) : 1;
  const barcodeScale = getBarcodeStackScale(widestBarcodeWidth, barcodeStackHeight);
  const primaryRenderWidthPx = scaleDimension(primaryWidth, barcodeScale);
  const primaryRenderHeightPx = scaleDimension(primaryHeight, barcodeScale);
  const secondaryRenderWidthPx = scaleDimension(secondaryWidth, barcodeScale);
  const secondaryRenderHeightPx = scaleDimension(secondaryHeight, barcodeScale);
  const cardWidthPx = CARD_WIDTH_PX;
  const cardHeightPx = CARD_HEIGHT_PX;
  const labelFontSizePx = Math.max(
    MIN_LABEL_FONT_SIZE_PX,
    Number((LABEL_BASE_FONT_SIZE_PX * labelWidthScale).toFixed(2)),
  );

  return {
    ...card,
    cardWidthPx,
    cardHeightPx,
    primaryRenderWidthPx,
    primaryRenderHeightPx,
    secondaryRenderWidthPx,
    secondaryRenderHeightPx,
    labelFontSizePx,
  };
};

const createPages = (cards: PrintCardData[]): PrintablePage[] => {
  const pages: PrintablePage[] = [];
  const printableCards = cards.map(toPrintableCard);
  let currentPage: PrintablePage = [];
  let currentPageHeight = 0;

  printableCards.forEach((card) => {
    const rowHeight = card.cardHeightPx;
    const nextPageHeight =
      currentPageHeight + rowHeight + (currentPage.length > 0 ? GRID_GAP_PX : 0);

    if (currentPage.length > 0 && nextPageHeight > AVAILABLE_GRID_HEIGHT_PX) {
      pages.push(currentPage);
      currentPage = [];
      currentPageHeight = 0;
    }

    currentPage.push([card]);
    currentPageHeight += rowHeight + (currentPage.length > 1 ? GRID_GAP_PX : 0);
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

const PRINT_FRAME_ID = 'xlsx-print-cards-frame';

const getOrCreatePrintFrame = (): HTMLIFrameElement => {
  const existingFrame = document.getElementById(PRINT_FRAME_ID);

  if (existingFrame instanceof HTMLIFrameElement) {
    return existingFrame;
  }

  const frame = document.createElement('iframe');
  frame.id = PRINT_FRAME_ID;
  frame.title = 'Print cards';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);
  return frame;
};

const renderCard = (card: PrintableCard): string => `
  <div class="card-shell" style="--label-font-size: ${card.labelFontSizePx}px;">
    <article class="card">
      <div class="card__stack">
        <section class="barcode-slot">
          <div class="barcode-slot__svg" style="width: ${card.primaryRenderWidthPx}px; height: ${card.primaryRenderHeightPx}px;">${card.primaryBarcodeSvg}</div>
        </section>
        <section class="barcode-slot">
          <div class="barcode-slot__svg" style="width: ${card.secondaryRenderWidthPx}px; height: ${card.secondaryRenderHeightPx}px;">${card.secondaryBarcodeSvg}</div>
        </section>
      </div>
    </article>
    <aside class="card__labelBleed" aria-label="Labels for row ${card.rowNumber}">
      <div class="card__labelBleedInner">
        <span>${escapeHtml(card.combinedLabel).replace(/\n/g, '<br />')}</span>
      </div>
    </aside>
  </div>
`;

const renderPage = (rows: PrintableRow[], pageNumber: number, pageCount: number): string => `
  <section class="print-page">
    <div class="sheet">
      <header class="sheet__meta">
        <span>PRINT CARDS</span>
        <span>${rows.reduce((count, row) => count + row.length, 0)} cards</span>
        <span>${pageNumber}/${pageCount}</span>
      </header>
      <div class="sheet__grid">
        ${rows
          .map(
            (row) => `
              <div class="sheet__row">
                ${row.map(renderCard).join('')}
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  </section>
`;

const buildDocument = (cards: PrintCardData[], title: string): string => {
  const pages = createPages(cards);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --page-width: 210mm;
        --page-height: 297mm;
        --page-padding: 12mm;
        --grid-gap: 6mm;
        --card-width-mm: ${PRINT_CARD_WIDTH_MM.toFixed(2)}mm;
        --card-height-mm: ${PRINT_CARD_HEIGHT_MM.toFixed(2)}mm;
        --label-bleed-width-mm: ${LABEL_BLEED_WIDTH_MM.toFixed(2)}mm;
        --cut-line: #b8bcc2;
        --ink: #111111;
        --muted: #5b616b;
        --card-radius: 1.6mm;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #eceff3;
        color: var(--ink);
        font-family: Roboto, "Segoe UI", Arial, sans-serif;
      }

      body {
        padding: 16px;
      }

      .print-page {
        width: var(--page-width);
        min-height: var(--page-height);
        margin: 0 auto 18px;
        background: #ffffff;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
        page-break-after: always;
        break-after: page;
      }

      .print-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .sheet {
        display: grid;
        grid-template-rows: auto 1fr;
        width: 100%;
        min-height: var(--page-height);
        padding: var(--page-padding);
      }

      .sheet__meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5mm;
        padding-bottom: 2.5mm;
        border-bottom: 0.35mm solid #d9dce1;
        color: var(--muted);
        font-size: 9pt;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .sheet__grid {
        display: grid;
        gap: var(--grid-gap);
        align-content: start;
      }

      .sheet__row {
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      .card-shell {
        display: flex;
        align-items: stretch;
        width: calc(var(--card-width-mm) + var(--label-bleed-width-mm));
        max-width: 100%;
        min-height: var(--card-height-mm);
        height: var(--card-height-mm);
        break-inside: avoid;
        flex: 0 0 auto;
      }

      .card {
        width: var(--card-width-mm);
        max-width: 100%;
        min-height: var(--card-height-mm);
        height: var(--card-height-mm);
        border: ${CUT_LINE_BORDER_WIDTH_MM}mm dotted var(--cut-line);
        border-radius: var(--card-radius);
        background: #ffffff;
        overflow: hidden;
        flex: 0 0 auto;
      }

      .card__stack {
        display: grid;
        grid-template-rows: repeat(2, minmax(0, 1fr));
        gap: ${STACK_GAP_PX}px;
        width: 100%;
        height: 100%;
        padding: ${CARD_STACK_VERTICAL_PADDING_PX}px ${CARD_STACK_HORIZONTAL_PADDING_PX}px;
      }

      .barcode-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
      }

      .barcode-slot + .barcode-slot {
        border-top: 0.2mm solid #e3e6ea;
      }

      .barcode-slot__svg {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        max-height: 100%;
      }

      .barcode-slot__svg svg {
        display: block;
        width: 100%;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        flex: 0 0 auto;
      }

      .barcode-slot__svg svg,
      .barcode-slot__svg svg * {
        shape-rendering: crispEdges;
        text-rendering: geometricPrecision;
      }

      .card__labelBleed {
        position: relative;
        width: var(--label-bleed-width-mm);
        min-width: var(--label-bleed-width-mm);
        padding-left: 2mm;
      }

      .card__labelBleedInner {
        position: absolute;
        inset: 0 0 0 2mm;
        overflow: hidden;
      }

      .card__labelBleedInner span {
        position: absolute;
        left: 50%;
        top: 50%;
        display: block;
        width: calc(var(--card-height-mm) - ${LABEL_VERTICAL_PADDING_PX * 2}px);
        max-width: calc(var(--card-height-mm) - ${LABEL_VERTICAL_PADDING_PX * 2}px);
        color: var(--ink);
        font-size: var(--label-font-size);
        font-weight: 400;
        letter-spacing: 0.01em;
        line-height: 1.3;
        text-align: center;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
        transform: translate(-50%, -50%) rotate(90deg);
        transform-origin: center;
      }

      @page {
        size: A4 portrait;
        margin: 0;
      }

      @media print {
        html, body {
          background: #ffffff;
        }

        body {
          padding: 0;
        }

        .print-page {
          margin: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    ${pages.map((page, index) => renderPage(page, index + 1, pages.length)).join('')}
  </body>
</html>`;
};

export const openPrintCardsDocument = async (cards: PrintCardData[], title: string) => {
  const documentMarkup = buildDocument(cards, title);
  const frame = getOrCreatePrintFrame();
  const printWindow = frame.contentWindow;

  if (!printWindow) {
    throw new Error('Print frame is unavailable.');
  }

  printWindow.document.open();
  printWindow.document.write(documentMarkup);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    setTimeout(() => resolve(), 180);
  });

  printWindow.focus();
  printWindow.print();
};
