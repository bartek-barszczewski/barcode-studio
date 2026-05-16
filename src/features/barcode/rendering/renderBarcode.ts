// @ts-expect-error - bwip-js lacks proper type definitions for some exports in this environment
import bwipjs from 'bwip-js'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { BarcodeFormState, BarcodeType } from '../types/barcode'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

const JS_BARCODE_FORMATS: Partial<Record<BarcodeType, string>> = {
  CODE128: 'CODE128',
}

const BWIP_JS_FORMATS: Partial<Record<BarcodeType, string>> = {
  EAN13: 'ean13',
  EAN8: 'ean8',
  UPCA: 'upca',
  UPCE: 'upce',
  CODE39: 'code39',
  CODE93: 'code93',
  CODABAR: 'rationalizedCodabar',
  ITF: 'interleaved2of5',
  DATAMATRIX: 'datamatrix',
  PDF417: 'pdf417',
  AZTEC: 'azteccode',
  PHARMACODE: 'pharmacode',
}

const MIN_QR_SIZE = 240
const BWIP_MAX_TEXT_SIZE = 25
const TEXT_WIDTH_RATIO = 0.92
const ESTIMATED_TEXT_CHAR_WIDTH = 0.58
const MIN_FITTED_FONT_RATIO = 0.55

const getRenderScale = (scale: number) =>
  Number.isFinite(scale) && scale > 0 ? scale : 1

const formatSvgNumber = (value: number) =>
  Number.parseFloat(value.toFixed(3)).toString()

const parseSvgNumberAttribute = (svg: string, attribute: 'width' | 'height') => {
  const match = svg.match(new RegExp(`${attribute}="([0-9.]+)`))
  if (!match) return null

  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const assertSvgColor = (color: string, fieldName: string) => {
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error(`${fieldName} musi być kolorem HEX.`)
  }
}

const injectTextToSvg = (svg: string, input: BarcodeFormState): string => {
  if (!input.showText) return svg

  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) return svg

  const parts = viewBoxMatch[1].split(/\s+/)
  if (parts.length !== 4) return svg

  const [minX, minY, width, height] = parts.map(parseFloat)
  const scale = getRenderScale(input.scale)
  const renderedWidth = parseSvgNumberAttribute(svg, 'width') ?? width
  const renderedHeight = parseSvgNumberAttribute(svg, 'height') ?? height
  const unitsPerPixelX = width / renderedWidth
  const unitsPerPixelY = height / renderedHeight
  const maxTextWidth = width * TEXT_WIDTH_RATIO
  const desiredFontSize = input.fontSize * scale * unitsPerPixelX
  const estimatedTextWidth =
    input.value.length * desiredFontSize * ESTIMATED_TEXT_CHAR_WIDTH
  const fittedFontSize =
    estimatedTextWidth > maxTextWidth && input.value.length > 0
      ? Math.max(
          maxTextWidth / (input.value.length * ESTIMATED_TEXT_CHAR_WIDTH),
          desiredFontSize * MIN_FITTED_FONT_RATIO,
        )
      : desiredFontSize
  const textLength =
    estimatedTextWidth > maxTextWidth
      ? ` textLength="${formatSvgNumber(maxTextWidth)}" lengthAdjust="spacingAndGlyphs"`
      : ''
  const spacing = 8 * scale * unitsPerPixelY
  const extraHeight = fittedFontSize * 1.25 + spacing
  const extraRenderedHeight = extraHeight / unitsPerPixelY
  const newHeight = height + extraHeight
  const newViewBox = [minX, minY, width, newHeight]
    .map(formatSvgNumber)
    .join(' ')
  const textX = minX + width / 2
  const textY = minY + height + spacing + fittedFontSize
  const textElement = `<text x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" fill="${input.barColor}" font-family="Arial, sans-serif" font-size="${formatSvgNumber(fittedFontSize)}" text-anchor="middle"${textLength}>${escapeSvgText(input.value)}</text>`

  let updatedSvg = svg.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`)

  updatedSvg = updatedSvg.replace(
    /(<svg[^>]+height=")(\d+\.?\d*)/,
    (_, p1, p2) =>
      p1 + formatSvgNumber(Number.parseFloat(p2) + extraRenderedHeight),
  )

  return updatedSvg.replace('</svg>', `${textElement}</svg>`)
}

const renderLinearBarcode = (input: BarcodeFormState): string => {
  try {
    const format = JS_BARCODE_FORMATS[input.type]
    if (!format) {
      throw new Error('Nieprawidłowy typ kodu kreskowego dla JsBarcode.')
    }

    if (typeof document === 'undefined') {
      throw new Error('Renderowanie SVG wymaga środowiska przeglądarki.')
    }

    const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
    let isValid = true
    const scale = getRenderScale(input.scale)

    JsBarcode(svg, input.value, {
      format: format,
      lineColor: input.barColor,
      background: input.backgroundColor,
      width: input.barWidth * scale,
      height: input.height * scale,
      margin: input.margin * scale,
      font: 'Arial',
      fontSize: input.fontSize * scale,
      displayValue: false, // We will inject text manually for consistency
      valid: (valid) => {
        isValid = valid
      },
    })

    if (!isValid) {
      throw new Error('Nie udało się wygenerować kodu dla podanych danych.')
    }

    const svgString = new XMLSerializer().serializeToString(svg)
    return injectTextToSvg(svgString, input)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Błąd generowania kodu.',
      { cause: error },
    )
  }
}

const renderQrCode = async (input: BarcodeFormState): Promise<string> => {
  try {
    const scale = getRenderScale(input.scale)
    const size = Math.max(MIN_QR_SIZE, Math.round(input.height)) * scale
    
    const svg = await QRCode.toString(input.value, {
      type: 'svg',
      margin: input.margin,
      width: Math.round(size),
      color: {
        dark: input.barColor,
        light: input.backgroundColor,
      },
    })

    if (!svg.includes('<svg')) {
      throw new Error('Biblioteka qrcode nie zwróciła SVG.')
    }

    return injectTextToSvg(svg, input)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Nie udało się wygenerować QR Code.',
      { cause: error },
    )
  }
}

const renderBwipBarcode = (input: BarcodeFormState): string => {
  try {
    const bcid = BWIP_JS_FORMATS[input.type]
    if (!bcid) {
      throw new Error('Nieprawidłowy typ kodu kreskowego dla bwip-js.')
    }

    const scale = getRenderScale(input.scale)
    const barWidth = input.barWidth || 2
    const bwipScale = barWidth * scale
    const bwipHeight = input.height / barWidth
    const bwipTextSize = input.fontSize / bwipScale

    // EAN and UPC have special text rendering that we should keep
    const supportsBuiltInText = ['EAN13', 'EAN8', 'UPCA', 'UPCE'].includes(
      input.type,
    )
    const useBuiltInText =
      supportsBuiltInText &&
      input.showText &&
      bwipTextSize > 0 &&
      bwipTextSize < BWIP_MAX_TEXT_SIZE

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      bcid,
      text: input.value,
      scale: bwipScale,
      height: bwipHeight,
      barcolor: input.barColor.replace('#', ''),
      backgroundcolor: input.backgroundColor.replace('#', ''),
      includetext: useBuiltInText,
      guardwhitespace: false,
    }

    // Add padding to make room for built-in text
    if (useBuiltInText) {
      options.textsize = bwipTextSize
      const pad = (input.fontSize + 10) / bwipScale
      options.paddingwidth = Math.max(input.margin / bwipScale, 2)
      options.paddingheight = Math.max(input.margin / bwipScale, pad)
    } else {
      options.paddingwidth = input.margin / bwipScale
      options.paddingheight = input.margin / bwipScale
    }

    const svg = bwipjs.toSVG(options)

    if (!svg) {
      throw new Error('Błąd generowania kodu.')
    }
    
    return useBuiltInText ? svg : injectTextToSvg(svg, input)
  } catch (error) {
    const message = typeof error === 'string' ? error : (error instanceof Error ? error.message : '')
    
    // Humanize common BWIPP errors
    let friendlyMessage = message
    if (message.includes('code39badCharacter')) {
      friendlyMessage = 'Code 39 obsługuje tylko cyfry, wielkie litery i znaki: - . $ / + % oraz spację.'
    } else if (message.includes('bwipp.')) {
      const match = message.match(/bwipp\.[^:]+:\s*(.*)/)
      if (match) {
        friendlyMessage = match[1]
      }
    }

    if (!friendlyMessage || friendlyMessage === message) {
      friendlyMessage = message || 'Błąd generowania kodu.'
    }

    throw new Error(friendlyMessage, { cause: error })
  }
}


export const renderBarcodeToSvgString = async (
  input: BarcodeFormState,
): Promise<string> => {
  assertSvgColor(input.barColor, 'Kolor kodu')
  assertSvgColor(input.backgroundColor, 'Tło')

  if (input.type === 'QR') {
    return renderQrCode(input)
  }

  if (JS_BARCODE_FORMATS[input.type]) {
    return renderLinearBarcode(input)
  }

  if (BWIP_JS_FORMATS[input.type]) {
    return renderBwipBarcode(input)
  }

  throw new Error('Nieobsługiwany typ kodu kreskowego.')
}
