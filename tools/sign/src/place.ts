export type SignaturePlacement = {
  x: number
  y: number
  width: number
}

export type PdfStamp = {
  pngBytes: Uint8Array
  pageIndex: number
  placement: SignaturePlacement
}

/** 签名框高宽比，避免瘦高笔画按页宽放大后撑满整页 */
export const signatureBoxAspect = 0.38

export function signatureBoxSize(widthRatio: number, pageAspect: number) {
  return {
    width: widthRatio,
    height: (widthRatio * signatureBoxAspect) / Math.max(pageAspect, 0.2),
  }
}

export function containInBox(imgW: number, imgH: number, boxW: number, boxH: number) {
  const imgAspect = imgH / imgW || signatureBoxAspect
  const boxAspect = boxH / boxW
  if (imgAspect > boxAspect) {
    const height = boxH
    const width = height / imgAspect
    return { width, height, dx: (boxW - width) / 2, dy: 0 }
  }
  const width = boxW
  const height = width * imgAspect
  return { width, height, dx: 0, dy: (boxH - height) / 2 }
}

const pdfMagic = [0x25, 0x50, 0x44, 0x46]

export function isPdf(name: string, bytes: Uint8Array) {
  if (bytes.length >= pdfMagic.length && pdfMagic.every((byte, index) => bytes[index] === byte)) {
    return true
  }
  return name.toLowerCase().endsWith('.pdf')
}

export function signedFileName(originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, '') || 'document'
  return `${base}-已签名.pdf`
}

export function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}
