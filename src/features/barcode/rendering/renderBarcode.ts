// @ts-expect-error - bwip-js lacks proper type definitions for some exports in this environment
import bwipjs from 'bwip-js'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { BarcodeFormState, BarcodeType } from '../types/barcode'
import {
  getBarcodeTextLayout,
  getBarcodeTextMetrics,
  getBarcodeTextValue,
  getRenderScale,
  shouldRenderCustomText,
  supportsNativeTextLayout,
  TEXT_FONT_FAMILY,
} from './barcodeText'

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
  CODE39EXT: 'code39ext',
  CODE93: 'code93',
  CODE93EXT: 'code93ext',
  CODABAR: 'rationalizedCodabar',
  ITF: 'interleaved2of5',
  DATAMATRIX: 'datamatrix',
  PDF417: 'pdf417',
  AZTEC: 'azteccode',
  PHARMACODE: 'pharmacode',
}

const BWIP_MAX_TEXT_SIZE = 25
const TRANSPARENT_SVG_COLOR = '#FFFFFF00'

const isFixedSquareMatrixCode = (type: BarcodeType) =>
  type === 'DATAMATRIX' || type === 'AZTEC'

const formatSvgNumber = (value: number) =>
  Number.parseFloat(value.toFixed(3)).toString()

const parseSvgNumberAttribute = (svg: string, attribute: 'width' | 'height') => {
  const match = svg.match(new RegExp(`${attribute}="([0-9.]+)`))
  if (!match) return null

  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

const parseSvgViewBox = (svg: string): [number, number, number, number] | null => {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) return null

  const values = viewBoxMatch[1].split(/\s+/).map(Number.parseFloat)
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value))
  ) {
    return null
  }

  return values as [number, number, number, number]
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
  if (!shouldRenderCustomText(input)) return svg

  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) return svg

  const parts = viewBoxMatch[1].split(/\s+/)
  if (parts.length !== 4) return svg

  const [minX, minY, width, height] = parts.map(parseFloat)
  const renderedWidth = parseSvgNumberAttribute(svg, 'width') ?? width
  const renderedHeight = parseSvgNumberAttribute(svg, 'height') ?? height
  const unitsPerPixelX = width / renderedWidth
  const unitsPerPixelY = height / renderedHeight
  const metrics = getBarcodeTextMetrics(input, unitsPerPixelX, unitsPerPixelY)
  const layout = getBarcodeTextLayout(
    { minX, minY, width, height },
    metrics,
  )
  const newMinX = Math.min(minX, layout.minX)
  const newMinY = Math.min(minY, layout.minY)
  const newMaxX = Math.max(minX + width, layout.maxX)
  const newMaxY = Math.max(minY + height, layout.maxY)
  const newWidth = newMaxX - newMinX
  const newHeight = newMaxY - newMinY
  const newViewBox = [newMinX, newMinY, newWidth, newHeight]
    .map(formatSvgNumber)
    .join(' ')
  const newRenderedWidth = renderedWidth * (newWidth / width)
  const newRenderedHeight = renderedHeight * (newHeight / height)
  const rotationAttribute = metrics.rotation === 0
    ? ''
    : ` transform="rotate(${formatSvgNumber(metrics.rotation)} ${formatSvgNumber(layout.x)} ${formatSvgNumber(layout.y)})"`
  const textElement = `<text x="${formatSvgNumber(layout.x)}" y="${formatSvgNumber(layout.y)}" fill="${input.barColor}" font-family="${TEXT_FONT_FAMILY}" font-size="${formatSvgNumber(metrics.fontSize)}" font-style="${metrics.fontStyle}" font-weight="${metrics.fontWeight}" text-anchor="middle" dominant-baseline="middle"${rotationAttribute}>${escapeSvgText(getBarcodeTextValue(input))}</text>`

  let updatedSvg = svg.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`)

  if (updatedSvg.match(/<svg[^>]+width="/)) {
    updatedSvg = updatedSvg.replace(
      /(<svg[^>]+width=")(\d+\.?\d*)/,
      (_, p1) => p1 + formatSvgNumber(newRenderedWidth),
    )
  }

  if (updatedSvg.match(/<svg[^>]+height="/)) {
    updatedSvg = updatedSvg.replace(
      /(<svg[^>]+height=")(\d+\.?\d*)/,
      (_, p1) => p1 + formatSvgNumber(newRenderedHeight),
    )
  }

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
    const size = Math.max(1, Math.round(input.height)) * scale
    
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
      !input.displayValue &&
      supportsNativeTextLayout(input) &&
      bwipTextSize > 0 &&
      bwipTextSize < BWIP_MAX_TEXT_SIZE

    // EAN and UPC have special checksum requirements.
    // If a user provides the full length (e.g. 13 for EAN13), 
    // BWIP validates the last digit. If it fails, it throws an error.
    // To make it more user friendly, if we detect the full length, 
    // we can trim the last digit and let BWIP recalculate it.
    let textToRender = input.value
    if (input.type === 'EAN13' && textToRender.length === 13) {
      textToRender = textToRender.substring(0, 12)
    } else if (input.type === 'EAN8' && textToRender.length === 8) {
      textToRender = textToRender.substring(0, 7)
    } else if (input.type === 'UPCA' && textToRender.length === 12) {
      textToRender = textToRender.substring(0, 11)
    } else if (input.type === 'UPCE' && textToRender.length === 8) {
      textToRender = textToRender.substring(0, 7)
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


const normalizeSvgAttributes = (svg: string): string => {
  if (!svg.includes('<svg')) return svg

  const width = parseSvgNumberAttribute(svg, 'width')
  const height = parseSvgNumberAttribute(svg, 'height')
  const hasViewBox = svg.includes('viewBox=')

  let normalized = svg

  // Ensure viewBox exists if we have dimensions
  if (!hasViewBox && width !== null && height !== null) {
    normalized = normalized.replace(
      '<svg',
      `<svg viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}"`,
    )
  }

  // Ensure the SVG fills its container responsively
  if (!normalized.includes('preserveAspectRatio=')) {
    normalized = normalized.replace(
      '<svg',
      '<svg preserveAspectRatio="xMidYMid meet"',
    )
  }

  return normalized
}

const forceSquareMatrixSvg = (svg: string): string => {
  const normalizedSvg = normalizeSvgAttributes(svg)
  const renderedHeight = parseSvgNumberAttribute(normalizedSvg, 'height')
  const viewBox = parseSvgViewBox(normalizedSvg)

  if (renderedHeight === null || !viewBox) {
    return normalizedSvg
  }

  const side = formatSvgNumber(renderedHeight)
  const [minX, minY, width, height] = viewBox
  const targetSide = Math.max(width, height)
  const offsetX = minX - (targetSide - width) / 2
  const offsetY = minY - (targetSide - height) / 2
  let squareSvg = normalizedSvg.replace(
    /viewBox="[^"]+"/,
    `viewBox="${[offsetX, offsetY, targetSide, targetSide].map(formatSvgNumber).join(' ')}"`,
  )

  if (squareSvg.match(/<svg[^>]+width="/)) {
    squareSvg = squareSvg.replace(
      /(<svg[^>]+width=")(\d+\.?\d*)/,
      (_, p1) => p1 + side,
    )
  }

  if (squareSvg.match(/<svg[^>]+height="/)) {
    squareSvg = squareSvg.replace(
      /(<svg[^>]+height=")(\d+\.?\d*)/,
      (_, p1) => p1 + side,
    )
  }

  return squareSvg
}

const applyRotationToSvg = (svg: string, rotation: number): string => {
  if (rotation === 0) return svg

  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) return svg

  const parts = viewBoxMatch[1].split(/\s+/)
  if (parts.length !== 4) return svg

  const [minX, minY, width, height] = parts.map(parseFloat)

  let newViewBox: string
  let transform: string

  if (rotation === 90) {
    newViewBox = `${formatSvgNumber(-minY - height)} ${formatSvgNumber(minX)} ${formatSvgNumber(height)} ${formatSvgNumber(width)}`
    transform = 'rotate(90)'
  } else if (rotation === 180) {
    newViewBox = `${formatSvgNumber(-minX - width)} ${formatSvgNumber(-minY - height)} ${formatSvgNumber(width)} ${formatSvgNumber(height)}`
    transform = 'rotate(180)'
  } else if (rotation === 270) {
    newViewBox = `${formatSvgNumber(minY)} ${formatSvgNumber(-minX - width)} ${formatSvgNumber(height)} ${formatSvgNumber(width)}`
    transform = 'rotate(270)'
  } else {
    return svg
  }

  const contentStart = svg.indexOf('>') + 1
  const contentEnd = svg.lastIndexOf('</svg>')
  const header = svg.substring(0, contentStart)
  const content = svg.substring(contentStart, contentEnd)
  const footer = svg.substring(contentEnd)

  let rotatedHeader = header.replace(
    /viewBox="[^"]+"/,
    `viewBox="${newViewBox}"`,
  )

  const oldWidth = parseSvgNumberAttribute(svg, 'width')
  const oldHeight = parseSvgNumberAttribute(svg, 'height')

  if (oldWidth !== null && oldHeight !== null) {
    if (rotation === 90 || rotation === 270) {
      rotatedHeader = rotatedHeader
        .replace(/width="[0-9.]+"/, `width="${formatSvgNumber(oldHeight)}"`)
        .replace(/height="[0-9.]+"/, `height="${formatSvgNumber(oldWidth)}"`)
    }
  }

  return `${rotatedHeader}<g transform="${transform}">${content}</g>${footer}`
}

const getEffectiveBackgroundColor = (input: BarcodeFormState) =>
  input.transparentBackground ? TRANSPARENT_SVG_COLOR : input.backgroundColor

export const renderBarcodeToSvgString = async (
  input: BarcodeFormState,
): Promise<string> => {
  assertSvgColor(input.barColor, 'Kolor kodu')
  assertSvgColor(input.backgroundColor, 'Tło')

  const normalizedInput: BarcodeFormState = {
    ...input,
    backgroundColor: getEffectiveBackgroundColor(input),
  }

  let result: string

  if (normalizedInput.type === 'QR') {
    result = await renderQrCode(normalizedInput)
  } else if (JS_BARCODE_FORMATS[normalizedInput.type]) {
    result = renderLinearBarcode(normalizedInput)
  } else if (BWIP_JS_FORMATS[normalizedInput.type]) {
    result = renderBwipBarcode(normalizedInput)
  } else {
    throw new Error('Nieobsługiwany typ kodu kreskowego.')
  }

  const normalizedResult = isFixedSquareMatrixCode(normalizedInput.type)
    ? forceSquareMatrixSvg(result)
    : normalizeSvgAttributes(result)
  return applyRotationToSvg(normalizedResult, input.rotation)
}
