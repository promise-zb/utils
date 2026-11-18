import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { containInBox, isPdf, signedFileName, stampPdf } from './index'

const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (char) => char.charCodeAt(0),
)

describe('sign', () => {
  it('给导出文件加上已签名', () => {
    expect(signedFileName('合同.pdf')).toBe('合同-已签名.pdf')
    expect(signedFileName('说明.docx')).toBe('说明-已签名.pdf')
  })

  it('只认 PDF', () => {
    expect(isPdf('a.bin', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true)
    expect(isPdf('a.docx', new Uint8Array([1, 2, 3, 4]))).toBe(false)
    expect(isPdf('扫描.pdf', new Uint8Array([1, 2, 3, 4]))).toBe(true)
  })

  it('高图放进扁框时左右留白', () => {
    const fitted = containInBox(10, 40, 100, 20)
    expect(fitted.height).toBe(20)
    expect(fitted.width).toBe(5)
    expect(fitted.dx).toBe(47.5)
  })

  it('把签名写进 PDF', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([600, 800])
    const raw = await pdf.save()
    const source = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
    const out = await stampPdf(source, [
      { pngBytes: png, pageIndex: 0, placement: { x: 0.5, y: 0.7, width: 0.2 } },
    ])
    const saved = await PDFDocument.load(out)
    expect(saved.getPageCount()).toBe(1)
    expect(out.length).toBeGreaterThan(raw.length)
  })
})
