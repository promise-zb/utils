import { PDFDocument } from 'pdf-lib'
import { containInBox, signatureBoxAspect, type PdfStamp } from './place'

export async function stampPdf(original: ArrayBuffer, stamps: PdfStamp[]) {
  const pdf = await PDFDocument.load(original)
  const pageCount = pdf.getPageCount()
  const imageCache = new Map<Uint8Array, Awaited<ReturnType<typeof pdf.embedPng>>>()

  for (const stamp of stamps) {
    if (stamp.pageIndex < 0 || stamp.pageIndex >= pageCount) continue
    let image = imageCache.get(stamp.pngBytes)
    if (!image) {
      image = await pdf.embedPng(stamp.pngBytes)
      imageCache.set(stamp.pngBytes, image)
    }
    const page = pdf.getPage(stamp.pageIndex)
    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()
    const boxW = Math.max(8, pageWidth * stamp.placement.width)
    const boxH = boxW * signatureBoxAspect
    const fitted = containInBox(image.width, image.height, boxW, boxH)
    const x = pageWidth * stamp.placement.x + fitted.dx
    const y = pageHeight - pageHeight * stamp.placement.y - fitted.dy - fitted.height
    page.drawImage(image, { x, y, width: fitted.width, height: fitted.height })
  }

  return pdf.save()
}
