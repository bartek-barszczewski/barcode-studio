import { saveAs } from 'file-saver'

const SVG_MIME_TYPE = 'image/svg+xml;charset=utf-8'
const DOM_PARSER_SVG_MIME_TYPE = 'image/svg+xml'
const PNG_MIME_TYPE = 'image/png'
const FALLBACK_SIZE = 512
const PRINT_FRAME_ID = 'barcode-print-frame'

const withExtension = (filename: string, extension: string) =>
  filename.toLowerCase().endsWith(`.${extension}`)
    ? filename
    : `${filename}.${extension}`

const parseSvgDimension = (value: string | null) => {
  if (!value) {
    return null
  }

  const parsedValue = Number.parseFloat(value)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null
}

const getSvgSize = (svg: string) => {
  const document = new DOMParser().parseFromString(svg, DOM_PARSER_SVG_MIME_TYPE)
  const svgElement = document.documentElement
  const width = parseSvgDimension(svgElement.getAttribute('width'))
  const height = parseSvgDimension(svgElement.getAttribute('height'))

  if (width && height) {
    return { width, height }
  }

  const viewBox = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number)

  if (
    viewBox?.length === 4 &&
    Number.isFinite(viewBox[2]) &&
    Number.isFinite(viewBox[3]) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] }
  }

  return { width: FALLBACK_SIZE, height: FALLBACK_SIZE }
}

const getPrintableSvg = (svg: string) => {
  const document = new DOMParser().parseFromString(svg, DOM_PARSER_SVG_MIME_TYPE)
  const svgElement = document.documentElement
  const size = getSvgSize(svg)

  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svgElement.setAttribute('width', `${size.width}`)
  svgElement.setAttribute('height', `${size.height}`)
  svgElement.setAttribute(
    'style',
    `display:block;width:${size.width}px;height:${size.height}px;`,
  )

  return {
    markup: new XMLSerializer().serializeToString(svgElement),
    size,
  }
}

const normalizeScale = (scale: number) =>
  Number.isFinite(scale) && scale > 0 ? scale : 1

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('Nie udało się wczytać SVG do eksportu PNG.'))
    image.src = url
  })

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('Nie udało się utworzyć pliku PNG.'))
    }, PNG_MIME_TYPE)
  })

export const downloadSvg = (svg: string, filename: string): void => {
  const blob = new Blob([svg], { type: SVG_MIME_TYPE })

  saveAs(blob, withExtension(filename, 'svg'))
}

export const downloadPngFromSvg = async (
  svg: string,
  filename: string,
  scale = 1,
): Promise<void> => {
  const svgBlob = new Blob([svg], { type: SVG_MIME_TYPE })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)
    const svgSize = getSvgSize(svg)
    const exportScale = normalizeScale(scale)
    const width = (image.naturalWidth || svgSize.width) * exportScale
    const height = (image.naturalHeight || svgSize.height) * exportScale
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Przeglądarka nie udostępnia kontekstu canvas.')
    }

    canvas.width = Math.ceil(width)
    canvas.height = Math.ceil(height)

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await canvasToBlob(canvas)

    saveAs(pngBlob, withExtension(filename, 'png'))
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export const printSvg = async (svg: string): Promise<void> => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Przeglądarka nie obsługuje wydruku.')
  }

  const existingFrame = document.getElementById(PRINT_FRAME_ID)

  if (existingFrame) {
    existingFrame.remove()
  }

  const { markup, size } = getPrintableSvg(svg)
  const iframe = document.createElement('iframe')

  iframe.id = PRINT_FRAME_ID
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const frameDocument = frameWindow?.document

  if (!frameWindow || !frameDocument) {
    iframe.remove()
    throw new Error('Nie udało się przygotować okna wydruku.')
  }

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove()
    }, 0)
  }

  frameWindow.addEventListener('afterprint', cleanup, { once: true })

  frameDocument.open()
  frameDocument.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Barcode Print</title>
    <style>
      @page {
        margin: 10mm;
      }

      html,
      body {
        margin: 0;
        background: #ffffff;
      }

      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
      }

      .sheet {
        display: grid;
        place-items: center;
        padding: 10mm;
      }

      .sheet svg {
        display: block;
        width: ${Math.ceil(size.width)}px;
        height: ${Math.ceil(size.height)}px;
        max-width: calc(100vw - 20mm);
        max-height: calc(100vh - 20mm);
      }
    </style>
  </head>
  <body>
    <div class="sheet">${markup}</div>
  </body>
</html>`)
  frameDocument.close()

  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 50)
  })

  frameWindow.focus()
  frameWindow.print()

  window.setTimeout(cleanup, 1000)
}
