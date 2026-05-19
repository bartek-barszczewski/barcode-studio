import type { BarcodeFormState, BarcodeTextPosition } from '../types/barcode'

const DEFAULT_TEXT_POSITION: BarcodeTextPosition = 'bottom'
const DEFAULT_TEXT_ROTATION = 0
const ESTIMATED_TEXT_CHAR_WIDTH = 0.58
const TEXT_LINE_HEIGHT_RATIO = 1.25
const TEXT_VERTICAL_GAP = 8
const TEXT_HORIZONTAL_GAP = 12

export const TEXT_FONT_FAMILY = 'Arial, sans-serif'

export type BarcodeTextMetrics = {
  text: string
  fontSize: number
  fontWeight: 400 | 700
  fontStyle: 'normal' | 'italic'
  rotation: number
  position: BarcodeTextPosition
  estimatedWidth: number
  lineHeight: number
  boundingWidth: number
  boundingHeight: number
  gapX: number
  gapY: number
}

export type BarcodeTextLayout = {
  x: number
  y: number
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type BarcodeBounds = {
  minX: number
  minY: number
  width: number
  height: number
}

export const getRenderScale = (scale: number) =>
  Number.isFinite(scale) && scale > 0 ? scale : 1

export const getBarcodeTextValue = (input: BarcodeFormState) =>
  input.displayValue || input.value

export const getBarcodeTextPosition = (
  input: BarcodeFormState,
): BarcodeTextPosition => input.textPosition ?? DEFAULT_TEXT_POSITION

export const getBarcodeTextRotation = (input: BarcodeFormState) => {
  if (!Number.isFinite(input.textRotation)) {
    return DEFAULT_TEXT_ROTATION
  }

  const normalizedRotation = (input.textRotation ?? DEFAULT_TEXT_ROTATION) % 360
  return normalizedRotation < 0 ? normalizedRotation + 360 : normalizedRotation
}

export const shouldRenderCustomText = (input: BarcodeFormState) =>
  input.showText && Boolean(getBarcodeTextValue(input))

export const supportsNativeTextLayout = (input: BarcodeFormState) =>
  getBarcodeTextPosition(input) === DEFAULT_TEXT_POSITION &&
  getBarcodeTextRotation(input) === DEFAULT_TEXT_ROTATION &&
  !input.textBold &&
  !input.textItalic

export const getBarcodeTextMetrics = (
  input: BarcodeFormState,
  unitsPerPixelX = 1,
  unitsPerPixelY = 1,
): BarcodeTextMetrics => {
  const text = getBarcodeTextValue(input)
  const scale = getRenderScale(input.scale)
  const fontSize = input.fontSize * scale * unitsPerPixelY
  const lineHeight = Math.max(fontSize * TEXT_LINE_HEIGHT_RATIO, fontSize)
  const estimatedWidth = Math.max(
    fontSize * 0.75,
    text.length * fontSize * ESTIMATED_TEXT_CHAR_WIDTH,
  )
  const rotation = getBarcodeTextRotation(input)
  const rotationRadians = (rotation * Math.PI) / 180
  const boundingWidth =
    Math.abs(estimatedWidth * Math.cos(rotationRadians)) +
    Math.abs(lineHeight * Math.sin(rotationRadians))
  const boundingHeight =
    Math.abs(estimatedWidth * Math.sin(rotationRadians)) +
    Math.abs(lineHeight * Math.cos(rotationRadians))

  return {
    text,
    fontSize,
    fontWeight: input.textBold ? 700 : 400,
    fontStyle: input.textItalic ? 'italic' : 'normal',
    rotation,
    position: getBarcodeTextPosition(input),
    estimatedWidth,
    lineHeight,
    boundingWidth,
    boundingHeight,
    gapX: TEXT_HORIZONTAL_GAP * scale * unitsPerPixelX,
    gapY: TEXT_VERTICAL_GAP * scale * unitsPerPixelY,
  }
}

export const getBarcodeTextLayout = (
  bounds: BarcodeBounds,
  metrics: BarcodeTextMetrics,
): BarcodeTextLayout => {
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2

  let textCenterX = centerX
  let textCenterY = centerY

  switch (metrics.position) {
    case 'top':
      textCenterY = bounds.minY - metrics.gapY - metrics.boundingHeight / 2
      break
    case 'left':
      textCenterX = bounds.minX - metrics.gapX - metrics.boundingWidth / 2
      break
    case 'right':
      textCenterX =
        bounds.minX + bounds.width + metrics.gapX + metrics.boundingWidth / 2
      break
    case 'bottom':
    default:
      textCenterY =
        bounds.minY + bounds.height + metrics.gapY + metrics.boundingHeight / 2
      break
  }

  return {
    x: textCenterX,
    y: textCenterY,
    minX: textCenterX - metrics.boundingWidth / 2,
    minY: textCenterY - metrics.boundingHeight / 2,
    maxX: textCenterX + metrics.boundingWidth / 2,
    maxY: textCenterY + metrics.boundingHeight / 2,
  }
}
