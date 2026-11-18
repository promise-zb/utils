import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  bytesToArrayBuffer,
  isPdf,
  signatureBoxSize,
  signedFileName,
  stampPdf,
  type SignaturePlacement,
} from '../src/index'
import './polyfills'
import { loadPdf, renderPdfPage } from './pdf'
import { savePdf } from './save'
import SignaturePad, { type SignaturePadHandle } from './SignaturePad'
import './page.css'

type PlacedSignature = {
  id: string
  page: number
  url: string
  bytes: Uint8Array
  placement: SignaturePlacement
}

const accept = '.pdf,application/pdf'
const defaultPlacement: SignaturePlacement = { x: 0.58, y: 0.78, width: 0.16 }
const sizeMin = 4
const sizeMax = 55

function revokeStamps(list: PlacedSignature[]) {
  list.forEach((stamp) => URL.revokeObjectURL(stamp.url))
}

export default function SignPage() {
  const padRef = useRef<SignaturePadHandle>(null)
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const draggingId = useRef<string | null>(null)
  const lastSigBytes = useRef<Uint8Array | null>(null)
  const stampsRef = useRef<PlacedSignature[]>([])

  const [file, setFile] = useState<File | null>(null)
  const [opened, setOpened] = useState(false)
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [pageAspect, setPageAspect] = useState(1.414)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [stamps, setStamps] = useState<PlacedSignature[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string>()
  const [docError, setDocError] = useState<string>()

  stampsRef.current = stamps

  const showToast = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(undefined), 2800)
  }

  useEffect(() => {
    return () => {
      pdfRef.current?.cleanup()
      pdfRef.current = null
      revokeStamps(stampsRef.current)
    }
  }, [])

  const paintPdf = useCallback(async (pdf: PDFDocumentProxy, pageNumber: number) => {
    const canvas = pdfCanvasRef.current
    const stage = stageRef.current
    if (!canvas) return
    const maxWidth = Math.min(stage?.clientWidth || 640, 720)
    await renderPdfPage(pdf, pageNumber, canvas, maxWidth)
    if (canvas.offsetWidth > 0) setPageAspect(canvas.offsetHeight / canvas.offsetWidth)
  }, [])

  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf) return
    void paintPdf(pdf, page).catch((err: unknown) => {
      setDocError(err instanceof Error ? err.message : '预览 PDF 失败')
    })
  }, [page, paintPdf])

  useEffect(() => {
    setActiveId((prev) => {
      const visible = stamps.filter((stamp) => stamp.page === page)
      if (visible.some((stamp) => stamp.id === prev)) return prev
      return visible.at(-1)?.id ?? null
    })
  }, [page, stamps])

  function replaceStamps(next: PlacedSignature[]) {
    revokeStamps(stampsRef.current)
    setStamps(next)
    setActiveId(null)
  }

  async function onPickFile(next: File) {
    setDocError(undefined)
    setFile(next)
    setOpened(false)
    setPage(1)
    setPageCount(1)
    replaceStamps([])
    lastSigBytes.current = null
    const data = await next.arrayBuffer()
    const bytes = new Uint8Array(data)
    setBuffer(data)

    pdfRef.current?.cleanup()
    pdfRef.current = null

    if (!isPdf(next.name, bytes)) {
      setDocError('只支持 PDF。Word 请先另存为 PDF 再签名。')
      return
    }

    setLoadingDoc(true)
    try {
      const pdf = await loadPdf(data)
      pdfRef.current = pdf
      setPageCount(pdf.numPages)
      await paintPdf(pdf, 1)
      setOpened(true)
    } catch (err) {
      setDocError(err instanceof Error ? err.message : '打开文件失败')
    } finally {
      setLoadingDoc(false)
    }
  }

  function applySignature() {
    const pad = padRef.current
    if (!pad) return

    const fromPad = !pad.isEmpty()
    const reuse = lastSigBytes.current
    if (!fromPad && !reuse) {
      showToast('请先在签名板里手写签名')
      return
    }
    if (!file || !pdfRef.current) {
      showToast('请先选择 PDF')
      return
    }

    const finish = (bytes: Uint8Array) => {
      lastSigBytes.current = bytes
      const blob = new Blob([bytesToArrayBuffer(bytes)], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const id = crypto.randomUUID()
      setStamps((prev) => {
        const offset = prev.filter((stamp) => stamp.page === page).length
        const placement: SignaturePlacement = {
          ...defaultPlacement,
          y: Math.max(0.06, defaultPlacement.y - offset * 0.1),
        }
        return [...prev, { id, page, url, bytes, placement }]
      })
      setActiveId(id)
      requestAnimationFrame(() => {
        pageRef.current
          ?.querySelector('.sig.is-active')
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
      showToast(`已盖到第 ${page} 页，可拖动。翻页后再点一次可继续盖`)
    }

    if (fromPad) {
      void pad.toPngBytes().then(finish)
      return
    }
    if (reuse) finish(reuse)
  }

  function scrollStageIfNeeded(clientY: number) {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const edge = 48
    if (clientY > rect.bottom - edge) stage.scrollTop += 24
    else if (clientY < rect.top + edge) stage.scrollTop -= 24
  }

  function moveSignature(id: string, clientX: number, clientY: number, fromImage: boolean) {
    scrollStageIfNeeded(clientY)
    const box = pageRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return
    const offset = fromImage && dragOffset.current ? dragOffset.current : { x: 0, y: 0 }
    const nx = (clientX - box.left - offset.x) / box.width
    const ny = (clientY - box.top - offset.y) / box.height
    const activeEl = pageRef.current?.querySelector('.sig.is-active') as HTMLElement | null
    const heightRatio = activeEl ? activeEl.offsetHeight / box.height : 0.08
    setStamps((prev) =>
      prev.map((stamp) => {
        if (stamp.id !== id) return stamp
        return {
          ...stamp,
          placement: {
            ...stamp.placement,
            x: Math.min(1 - stamp.placement.width, Math.max(0, nx)),
            y: Math.min(1 - heightRatio, Math.max(0, ny)),
          },
        }
      }),
    )
  }

  function resizeActive(width: number) {
    if (!activeId) return
    setStamps((prev) =>
      prev.map((stamp) => {
        if (stamp.id !== activeId) return stamp
        return {
          ...stamp,
          placement: { ...stamp.placement, width, x: Math.min(1 - width, stamp.placement.x) },
        }
      }),
    )
  }

  function removeStamp(id: string) {
    setStamps((prev) => {
      const found = prev.find((stamp) => stamp.id === id)
      if (found) URL.revokeObjectURL(found.url)
      return prev.filter((stamp) => stamp.id !== id)
    })
    setActiveId((prev) => (prev === id ? null : prev))
  }

  async function exportPdf() {
    if (!file || !buffer || !pdfRef.current) {
      showToast('请先选择 PDF')
      return
    }
    if (stamps.length === 0) {
      showToast('请先写好签名并点「盖到当前页」')
      return
    }

    setExporting(true)
    try {
      const out = await stampPdf(
        buffer,
        stamps.map((stamp) => ({
          pngBytes: stamp.bytes,
          pageIndex: stamp.page - 1,
          placement: stamp.placement,
        })),
      )
      const blob = new Blob([bytesToArrayBuffer(out)], { type: 'application/pdf' })
      const mode = await savePdf(blob, signedFileName(file.name))
      if (mode === 'share') showToast('已打开系统分享，可选保存到文件')
      else if (mode === 'picker') showToast('已保存')
      else showToast('已开始下载')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const ready = opened && !docError
  const visibleStamps = stamps.filter((stamp) => stamp.page === page)
  const active = stamps.find((stamp) => stamp.id === activeId)

  return (
    <main className="sign">
      <h1>签名助手</h1>
      <p className="lead">给 PDF 手写签名，文件只在本机，不上传。</p>

      <section className="card">
        <h2>1. 选择 PDF</h2>
        <div className="row">
          <label className="btn btn--primary file-btn">
            打开 PDF
            <input
              type="file"
              accept={accept}
              onChange={(event) => {
                const next = event.target.files?.[0]
                event.target.value = ''
                if (next) void onPickFile(next)
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!ready || exporting || stamps.length === 0}
            onClick={() => void exportPdf()}
          >
            {exporting ? '导出中…' : '导出 PDF'}
          </button>
        </div>
        {file ? (
          <p className="muted">
            {file.name}
            {ready ? ` · ${pageCount} 页` : ''}
            {stamps.length > 0 ? ` · 已盖 ${stamps.length} 处` : ''}
          </p>
        ) : null}
        {docError ? <p className="warn">{docError}</p> : null}
      </section>

      <section className="card">
        <h2>2. 手写签名</h2>
        <div className="pad-wrap">
          <SignaturePad ref={padRef} className="pad" />
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => padRef.current?.clear()}>
            清空
          </button>
          <button type="button" className="btn btn--primary" onClick={applySignature}>
            盖到当前页
          </button>
        </div>
        <p className="muted hint">同一份手写可反复盖。要换写法就先清空再写，再盖到目标位置。</p>
      </section>

      <section className="card">
        <h2>3. 预览并拖动签名</h2>
        {ready && pageCount > 1 ? (
          <div className="row pager">
            <button
              type="button"
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              上一页
            </button>
            <span>
              {page} / {pageCount}
              {visibleStamps.length > 0 ? ` · 本页 ${visibleStamps.length} 处` : ''}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              下一页
            </button>
          </div>
        ) : null}
        {stamps.length > 0 ? (
          <div className="row stamp-chips">
            {stamps.map((stamp, index) => (
              <button
                key={stamp.id}
                type="button"
                className={`chip${stamp.id === activeId ? ' is-active' : ''}`}
                onClick={() => {
                  setActiveId(stamp.id)
                  setPage(stamp.page)
                }}
              >
                第{stamp.page}页 · {index + 1}
              </button>
            ))}
          </div>
        ) : null}
        <label className="size">
          签名大小
          <input
            type="range"
            min={sizeMin}
            max={sizeMax}
            disabled={!active}
            value={Math.round((active?.placement.width ?? defaultPlacement.width) * 100)}
            onChange={(event) => resizeActive(Number(event.target.value) / 100)}
          />
        </label>
        <div ref={stageRef} className={`stage${loadingDoc ? ' is-loading' : ''}`}>
          <div
            ref={pageRef}
            className="page"
            hidden={!ready}
            onPointerDown={(event) => {
              if (!activeId || visibleStamps.length === 0) return
              if ((event.target as HTMLElement).closest('.sig')) return
              moveSignature(activeId, event.clientX, event.clientY, false)
            }}
          >
            <canvas ref={pdfCanvasRef} className="pdf-canvas" />
            {visibleStamps.map((stamp) => (
              <div
                key={stamp.id}
                className={`sig${stamp.id === activeId ? ' is-active' : ''}`}
                style={{
                  left: `${stamp.placement.x * 100}%`,
                  top: `${stamp.placement.y * 100}%`,
                  width: `${signatureBoxSize(stamp.placement.width, pageAspect).width * 100}%`,
                  height: `${signatureBoxSize(stamp.placement.width, pageAspect).height * 100}%`,
                }}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setActiveId(stamp.id)
                  draggingId.current = stamp.id
                  const box = event.currentTarget.getBoundingClientRect()
                  dragOffset.current = { x: event.clientX - box.left, y: event.clientY - box.top }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  const id = draggingId.current
                  if (!id || !dragOffset.current) return
                  moveSignature(id, event.clientX, event.clientY, true)
                }}
                onPointerUp={(event) => {
                  draggingId.current = null
                  dragOffset.current = null
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }}
              >
                <img src={stamp.url} alt="签名" draggable={false} />
                {stamp.id === activeId ? (
                  <button
                    type="button"
                    className="sig__remove"
                    aria-label="删除这处签名"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => removeStamp(stamp.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {!file ? <div className="placeholder">选择 PDF 后在这里预览</div> : null}
        </div>
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  )
}
