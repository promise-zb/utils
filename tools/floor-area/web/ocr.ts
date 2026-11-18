import { useEffect, useRef, useState } from 'react'
import { PSM, createWorker } from 'tesseract.js'
import type { TextBox } from '../src/types'

type OcrWord = {
  text?: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

type OcrLine = { words?: OcrWord[] }
type OcrParagraph = { lines?: OcrLine[] }
type OcrBlock = { paragraphs?: OcrParagraph[] }

type OcrData = {
  words?: OcrWord[]
  lines?: OcrWord[]
  blocks?: OcrBlock[]
}

let workerPromise: ReturnType<typeof createWorker> | null = null

async function getWorker() {
  if (!workerPromise) {
    const creating = createWorker('chi_sim+eng')
    workerPromise = creating
    try {
      const worker = await creating
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD })
    } catch (error) {
      workerPromise = null
      throw error
    }
  }
  return workerPromise
}

export function usePreview(file: File | null) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) return undefined
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

export async function recognize(file: File): Promise<TextBox[]> {
  const image = await resizeImage(file)
  try {
    const worker = await getWorker()
    const result = await worker.recognize(image, {}, { blocks: true })
    return toBoxes(result.data as OcrData)
  } catch (error) {
    workerPromise = null
    throw error instanceof Error ? error : new Error('识别失败')
  }
}

function toBoxes(data: OcrData) {
  const nested = (data.blocks ?? []).flatMap((block) =>
    (block.paragraphs ?? []).flatMap((paragraph) =>
      (paragraph.lines ?? []).flatMap((line) => line.words ?? []),
    ),
  )
  const words = nested.length ? nested : data.words?.length ? data.words : (data.lines ?? [])
  return words
    .filter((word) => word.text?.trim() && word.bbox)
    .map((word) => ({
      text: word.text ?? '',
      x: word.bbox.x0,
      y: word.bbox.y0,
      w: word.bbox.x1 - word.bbox.x0,
      h: word.bbox.y1 - word.bbox.y0,
    }))
}

async function resizeImage(file: File) {
  const bitmap = await createImageBitmap(file)
  const long = Math.max(bitmap.width, bitmap.height)
  const target = long < 1400 ? Math.min(2200, long * 2) : Math.min(1800, long)
  const scale = target / long
  if (Math.abs(scale - 1) < 0.05) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  )
  return blob ?? file
}

export function useFilePicker() {
  const inputRef = useRef<HTMLInputElement>(null)
  return { inputRef, open: () => inputRef.current?.click() }
}
