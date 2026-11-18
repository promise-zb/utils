import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

let workerSrcReady = false

function ensureWorker() {
  if (workerSrcReady) return
  GlobalWorkerOptions.workerSrc = pdfWorker
  workerSrcReady = true
}

export async function loadPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  ensureWorker()
  const task = getDocument({ data: new Uint8Array(data.slice(0)), verbosity: 0 })
  return task.promise
}

export async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
) {
  const page = await pdf.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(2.2, maxWidth / base.width)
  const viewport = page.getViewport({ scale })
  const outputScale = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0)
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
}
