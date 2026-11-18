export async function savePdf(blob: Blob, filename: string) {
  const type = blob.type || 'application/pdf'
  const file = new File([blob], filename, { type })
  const picker = (
    window as Window & {
      showSaveFilePicker?: (opts: unknown) => Promise<{
        createWritable: () => Promise<FileSystemWritableFileStream>
      }>
    }
  ).showSaveFilePicker
  const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent)

  if (typeof picker === 'function' && !isPhone) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'picker' as const
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
    share?: (data: ShareData) => Promise<void>
  }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'share' as const
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2500)
  return 'download' as const
}
