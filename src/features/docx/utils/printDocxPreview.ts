const DOCX_PRINT_FRAME_ID = 'docx-preview-print-frame'

const getDocumentStylesMarkup = () =>
  Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')

export const printDocxPreview = async (paperElement: HTMLElement): Promise<void> => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Print is not available in this browser.')
  }

  const existingFrame = document.getElementById(DOCX_PRINT_FRAME_ID)

  if (existingFrame) {
    existingFrame.remove()
  }

  const iframe = document.createElement('iframe')

  iframe.id = DOCX_PRINT_FRAME_ID
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
    throw new Error('Could not prepare the print frame.')
  }

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove()
    }, 0)
  }

  frameWindow.addEventListener('afterprint', cleanup, { once: true })

  const stylesMarkup = getDocumentStylesMarkup()

  frameDocument.open()
  frameDocument.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>DOCX Preview Print</title>
    ${stylesMarkup}
    <style>
      @page {
        size: A4;
        margin: 0;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        display: flex;
        justify-content: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .docx-print-root {
        width: 210mm;
        margin: 0 auto;
      }

      .docx-print-root [class*="paper"] {
        box-shadow: none !important;
      }

      .docx-print-root svg {
        max-width: 100%;
        height: auto !important;
      }
    </style>
  </head>
  <body>
    <div class="docx-print-root">${paperElement.outerHTML}</div>
  </body>
</html>`)
  frameDocument.close()

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 50)
  })

  frameWindow.focus()
  frameWindow.print()

  window.setTimeout(cleanup, 1000)
}
