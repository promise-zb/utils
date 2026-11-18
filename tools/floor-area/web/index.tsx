import { useState } from 'react'
import Modal from '@local/ui-web'
import { areaStatus, calcAreas, formatResult, type AreaResult } from '../src/index'
import { recognize, useFilePicker, usePreview } from './ocr'
import './page.css'

export default function FloorAreaPage() {
  const { inputRef, open } = useFilePicker()
  const [file, setFile] = useState<File | null>(null)
  const preview = usePreview(file)
  const [result, setResult] = useState<AreaResult | null>(null)
  const [notice, setNotice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onFile(next: File) {
    setFile(next)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const boxes = await recognize(next)
      const areas = calcAreas(boxes)
      setResult(areas)
      setNotice(areas.status !== areaStatus.ok)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '识别失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="floor-area">
      <h1>图纸面积计算</h1>
      <p>选择图纸后自动识别。只计算标了长度或面积的区域。</p>
      <button type="button" onClick={open} disabled={loading}>
        {loading ? '识别中…' : '选择图纸'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const next = event.target.files?.[0]
          if (next) void onFile(next)
          event.target.value = ''
        }}
      />
      {error ? <p className="floor-error">{error}</p> : null}
      {preview || result ? (
        <section className="floor-layout">
          {preview ? <img src={preview} alt="图纸预览" /> : <span />}
          {result ? <pre className="report">{formatResult(result)}</pre> : null}
        </section>
      ) : null}
      {notice && result ? (
        <Modal
          title="计算结果"
          contentText={result.message}
          cancelFn={() => setNotice(false)}
          successFn={() => setNotice(false)}
          confirmText="知道了"
        />
      ) : null}
    </main>
  )
}
