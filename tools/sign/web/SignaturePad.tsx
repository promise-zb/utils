import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export type SignaturePadHandle = {
  clear: () => void
  isEmpty: () => boolean
  toPngBytes: () => Promise<Uint8Array>
}

type Props = {
  className?: string
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const emptyRef = useRef(true)
  const drawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      if (!emptyRef.current) return
      const parent = canvas.parentElement
      const width = parent?.clientWidth ?? 320
      const height = Math.max(140, Math.round(width * 0.38))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.4
      ctx.strokeStyle = '#111827'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      emptyRef.current = true
    },
    isEmpty() {
      return emptyRef.current
    },
    toPngBytes() {
      const canvas = canvasRef.current
      if (!canvas) return Promise.reject(new Error('签名板未就绪'))
      const trimmed = trimCanvas(canvas)
      return new Promise<Uint8Array>((resolve, reject) => {
        trimmed.toBlob((blob) => {
          if (!blob) {
            reject(new Error('无法导出签名'))
            return
          }
          void blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject)
        }, 'image/png')
      })
    },
  }))

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onPointerDown={(event) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        drawingRef.current = true
        emptyRef.current = false
        canvas.setPointerCapture(event.pointerId)
        const { x, y } = point(event)
        ctx.beginPath()
        ctx.moveTo(x, y)
      }}
      onPointerMove={(event) => {
        if (!drawingRef.current) return
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        const { x, y } = point(event)
        ctx.lineTo(x, y)
        ctx.stroke()
      }}
      onPointerUp={(event) => {
        drawingRef.current = false
        canvasRef.current?.releasePointerCapture(event.pointerId)
      }}
      onPointerLeave={() => {
        drawingRef.current = false
      }}
    />
  )
})

function trimCanvas(source: HTMLCanvasElement) {
  const ctx = source.getContext('2d')
  if (!ctx) return source
  const { width, height } = source
  const pixels = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3] ?? 0
      if (alpha > 8) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return source
  const pad = 8
  const sx = Math.max(0, minX - pad)
  const sy = Math.max(0, minY - pad)
  const sw = Math.min(width - sx, maxX - minX + pad * 2)
  const sh = Math.min(height - sy, maxY - minY + pad * 2)
  const out = document.createElement('canvas')
  out.width = sw
  out.height = sh
  const outCtx = out.getContext('2d')
  if (!outCtx) return source
  outCtx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return out
}

export default SignaturePad
