import { saveAs } from 'file-saver'
import { toBlob } from 'html-to-image'

const CAPTURE_TARGET_ID = 'capture-target'
const PNG_MIME_TYPE = 'image/png'

const withPngExtension = (filename: string) =>
  filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`

const forceCaptureSurface = (element: HTMLElement) => {
  const originalStyles = {
    background: element.style.background,
    backgroundColor: element.style.backgroundColor,
    border: element.style.border,
    borderRadius: element.style.borderRadius,
    boxShadow: element.style.boxShadow,
  }

  element.style.background = '#ffffff'
  element.style.backgroundColor = '#ffffff'
  element.style.border = '0'
  element.style.borderRadius = '0'
  element.style.boxShadow = 'none'

  return () => {
    element.style.background = originalStyles.background
    element.style.backgroundColor = originalStyles.backgroundColor
    element.style.border = originalStyles.border
    element.style.borderRadius = originalStyles.borderRadius
    element.style.boxShadow = originalStyles.boxShadow
  }
}

export const captureBarcodeTargetAsPng = async (
  filename: string,
): Promise<void> => {
  const element = document.getElementById(CAPTURE_TARGET_ID)

  if (!(element instanceof HTMLElement)) {
    throw new Error('Nie znaleziono obszaru kodu do zrzutu.')
  }

  const restoreStyles = forceCaptureSurface(element)

  try {
    const blob = await toBlob(element, {
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        background: '#ffffff',
        backgroundColor: '#ffffff',
        border: '0',
        borderRadius: '0',
        boxShadow: 'none',
      },
    })

    if (!blob) {
      throw new Error('Nie udało się utworzyć zrzutu PNG.')
    }

    saveAs(new Blob([blob], { type: PNG_MIME_TYPE }), withPngExtension(filename))
  } finally {
    restoreStyles()
  }
}
