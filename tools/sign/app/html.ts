export const signHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: system-ui, sans-serif; }
      main { padding: 16px 16px 48px; }
      h1 { margin: 0 0 6px; font-size: 1.4rem; }
      .lead, .muted, .hint { color: #64748b; font-size: 13px; }
      .card { margin-top: 14px; padding: 14px; background: #fff; border-radius: 14px; }
      h2 { margin: 0 0 10px; font-size: 1rem; }
      .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      button { border: 1px solid #cbd5e1; background: #fff; border-radius: 10px; padding: 8px 14px; font-size: 14px; }
      button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
      button:disabled { opacity: 0.45; }
      .pad-wrap { margin-bottom: 10px; border: 1px dashed #94a3b8; border-radius: 12px; touch-action: none; }
      canvas.pad, canvas.pdf { display: block; width: 100%; touch-action: none; background: #fff; }
      .stage { overflow: auto; max-height: 70vh; min-height: 160px; border: 1px solid #e2e8f0; border-radius: 12px; background: #e2e8f0; }
      .page { position: relative; }
      .sig { position: absolute; touch-action: none; }
      .sig img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
      .sig.active { outline: 2px solid #2563eb; }
      .sig button { position: absolute; top: -10px; right: -10px; width: 22px; height: 22px; padding: 0; border: none; border-radius: 50%; background: #0f172a; color: #fff; }
      .warn { color: #b45309; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: #0f172a; color: #fff; border-radius: 999px; padding: 10px 14px; font-size: 13px; }
      .size { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; margin: 8px 0; color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <h1>签名助手</h1>
      <p class="lead">给 PDF 手写签名，文件只在本机，不上传。</p>
      <section class="card">
        <h2>1. 选择 PDF</h2>
        <div class="row">
          <button id="pick" class="primary" type="button">打开 PDF</button>
          <button id="export" type="button" disabled>导出 PDF</button>
        </div>
        <p id="file" class="muted"></p>
        <p id="error" class="warn"></p>
      </section>
      <section class="card">
        <h2>2. 手写签名</h2>
        <div class="pad-wrap"><canvas id="pad" class="pad"></canvas></div>
        <div class="row">
          <button id="clear" type="button">清空</button>
          <button id="apply" class="primary" type="button">盖到当前页</button>
        </div>
        <p class="hint">同一份手写可反复盖。要换写法就先清空再写，再盖到目标位置。</p>
      </section>
      <section class="card">
        <h2>3. 预览并拖动签名</h2>
        <div id="pager" class="row" hidden></div>
        <label class="size">签名大小 <input id="size" type="range" min="4" max="55" value="16" disabled /></label>
        <div class="stage"><div id="page" class="page" hidden><canvas id="pdf" class="pdf"></canvas></div></div>
      </section>
    </main>
    <script type="module">
      const boxAspect = 0.38
      const defaultPlacement = { x: 0.58, y: 0.78, width: 0.16 }
      const mapProto = Map.prototype
      if (typeof mapProto.getOrInsertComputed !== 'function') {
        mapProto.getOrInsertComputed = function (key, callback) {
          if (this.has(key)) return this.get(key)
          const value = callback(key)
          this.set(key, value)
          return value
        }
      }
      if (typeof Promise.withResolvers !== 'function') {
        Promise.withResolvers = function () {
          let resolve, reject
          const promise = new Promise(function (res, rej) { resolve = res; reject = rej })
          return { promise, resolve, reject }
        }
      }
      const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/legacy/build/pdf.min.mjs')
      const pdfLib = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js')
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/legacy/build/pdf.worker.min.mjs'

      const pad = document.getElementById('pad')
      const pdfCanvas = document.getElementById('pdf')
      const pageEl = document.getElementById('page')
      const fileEl = document.getElementById('file')
      const errorEl = document.getElementById('error')
      const exportBtn = document.getElementById('export')
      const sizeInput = document.getElementById('size')
      const pager = document.getElementById('pager')
      let pdf = null
      let raw = null
      let fileName = ''
      let page = 1
      let pageCount = 1
      let pageAspect = 1.414
      let stamps = []
      let activeId = null
      let lastBytes = null
      let empty = true
      let drawing = false
      const drag = { id: null, x: 0, y: 0 }

      function reply(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload))
      }
      function toast(text) {
        const node = document.createElement('div')
        node.className = 'toast'
        node.textContent = text
        document.body.appendChild(node)
        setTimeout(function () { node.remove() }, 2800)
      }
      function b64ToBytes(data) {
        const bin = atob(data)
        const out = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
        return out
      }
      function bytesToB64(bytes) {
        let binary = ''
        const chunk = 0x4000
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
        }
        return btoa(binary)
      }
      function boxSize(widthRatio) {
        return {
          width: widthRatio,
          height: (widthRatio * boxAspect) / Math.max(pageAspect, 0.2),
        }
      }
      function contain(imgW, imgH, boxW, boxH) {
        const imgAspect = imgH / imgW || boxAspect
        const boxRatio = boxH / boxW
        if (imgAspect > boxRatio) {
          const height = boxH
          const width = height / imgAspect
          return { width, height, dx: (boxW - width) / 2, dy: 0 }
        }
        const width = boxW
        const height = width * imgAspect
        return { width, height, dx: 0, dy: (boxH - height) / 2 }
      }
      function resizePad() {
        if (!empty) return
        const width = pad.parentElement.clientWidth || 320
        const height = Math.max(140, Math.round(width * 0.38))
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        pad.width = Math.floor(width * dpr)
        pad.height = Math.floor(height * dpr)
        pad.style.width = width + 'px'
        pad.style.height = height + 'px'
        const ctx = pad.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 2.4
        ctx.strokeStyle = '#111827'
      }
      function point(event, canvas) {
        const rect = canvas.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }
      async function paint() {
        if (!pdf) return
        const pageView = await pdf.getPage(page)
        const base = pageView.getViewport({ scale: 1 })
        const scale = Math.min(2.2, (pageEl.parentElement.clientWidth || 640) / base.width)
        const viewport = pageView.getViewport({ scale })
        const outputScale = Math.min(window.devicePixelRatio || 1, 2)
        pdfCanvas.width = Math.floor(viewport.width * outputScale)
        pdfCanvas.height = Math.floor(viewport.height * outputScale)
        pdfCanvas.style.width = Math.floor(viewport.width) + 'px'
        pdfCanvas.style.height = Math.floor(viewport.height) + 'px'
        const ctx = pdfCanvas.getContext('2d')
        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0)
        await pageView.render({ canvasContext: ctx, viewport, canvas: pdfCanvas }).promise
        if (pdfCanvas.offsetWidth > 0) pageAspect = pdfCanvas.offsetHeight / pdfCanvas.offsetWidth
        drawStamps()
        drawPager()
      }
      function drawPager() {
        pager.hidden = pageCount < 2
        pager.innerHTML = ''
        if (pageCount < 2) return
        const prev = document.createElement('button')
        prev.textContent = '上一页'
        prev.disabled = page <= 1
        prev.onclick = function () { page = Math.max(1, page - 1); void paint() }
        const label = document.createElement('span')
        const here = stamps.filter(function (stamp) { return stamp.page === page }).length
        label.textContent = page + ' / ' + pageCount + (here ? ' · 本页 ' + here + ' 处' : '')
        const next = document.createElement('button')
        next.textContent = '下一页'
        next.disabled = page >= pageCount
        next.onclick = function () { page = Math.min(pageCount, page + 1); void paint() }
        pager.append(prev, label, next)
      }
      function drawStamps() {
        pageEl.querySelectorAll('.sig').forEach(function (node) { node.remove() })
        const active = stamps.find(function (stamp) { return stamp.id === activeId })
        sizeInput.disabled = !active
        sizeInput.value = String(Math.round((active ? active.placement.width : defaultPlacement.width) * 100))
        stamps.filter(function (stamp) { return stamp.page === page }).forEach(function (stamp) {
          const size = boxSize(stamp.placement.width)
          const node = document.createElement('div')
          node.className = 'sig' + (stamp.id === activeId ? ' active' : '')
          node.style.left = stamp.placement.x * 100 + '%'
          node.style.top = stamp.placement.y * 100 + '%'
          node.style.width = size.width * 100 + '%'
          node.style.height = size.height * 100 + '%'
          const img = document.createElement('img')
          img.src = stamp.url
          img.alt = '签名'
          node.append(img)
          if (stamp.id === activeId) {
            const remove = document.createElement('button')
            remove.type = 'button'
            remove.textContent = '×'
            remove.onpointerdown = function (event) { event.stopPropagation() }
            remove.onclick = function () {
              URL.revokeObjectURL(stamp.url)
              stamps = stamps.filter(function (item) { return item.id !== stamp.id })
              if (activeId === stamp.id) activeId = null
              exportBtn.disabled = stamps.length === 0
              fileEl.textContent = fileName + ' · ' + pageCount + ' 页' + (stamps.length ? ' · 已盖 ' + stamps.length + ' 处' : '')
              drawStamps()
            }
            node.append(remove)
          }
          node.onpointerdown = function (event) {
            event.preventDefault()
            event.stopPropagation()
            activeId = stamp.id
            drag.id = stamp.id
            const box = node.getBoundingClientRect()
            drag.x = event.clientX - box.left
            drag.y = event.clientY - box.top
            node.setPointerCapture(event.pointerId)
            pageEl.querySelectorAll('.sig').forEach(function (item) { item.classList.remove('active') })
            node.classList.add('active')
            sizeInput.disabled = false
            sizeInput.value = String(Math.round(stamp.placement.width * 100))
          }
          node.onpointermove = function (event) {
            if (drag.id !== stamp.id) return
            const box = pageEl.getBoundingClientRect()
            const heightRatio = node.offsetHeight / box.height || 0.08
            stamp.placement.x = Math.min(1 - stamp.placement.width, Math.max(0, (event.clientX - box.left - drag.x) / box.width))
            stamp.placement.y = Math.min(1 - heightRatio, Math.max(0, (event.clientY - box.top - drag.y) / box.height))
            node.style.left = stamp.placement.x * 100 + '%'
            node.style.top = stamp.placement.y * 100 + '%'
          }
          node.onpointerup = function (event) {
            drag.id = null
            node.releasePointerCapture(event.pointerId)
            drawStamps()
          }
          pageEl.append(node)
        })
      }
      function pngBytes() {
        const ctx = pad.getContext('2d')
        const { width, height } = pad
        const pixels = ctx.getImageData(0, 0, width, height).data
        let minX = width, minY = height, maxX = 0, maxY = 0
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if ((pixels[(y * width + x) * 4 + 3] || 0) <= 8) continue
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
        }
        const source = maxX < minX ? pad : document.createElement('canvas')
        if (source !== pad) {
          const padPx = 8
          const sx = Math.max(0, minX - padPx)
          const sy = Math.max(0, minY - padPx)
          source.width = Math.min(width - sx, maxX - minX + padPx * 2)
          source.height = Math.min(height - sy, maxY - minY + padPx * 2)
          source.getContext('2d').drawImage(pad, sx, sy, source.width, source.height, 0, 0, source.width, source.height)
        }
        return new Promise(function (resolve, reject) {
          source.toBlob(function (blob) {
            if (!blob) { reject(new Error('无法导出签名')); return }
            blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)) }, reject)
          }, 'image/png')
        })
      }
      async function openPdf(name, data) {
        errorEl.textContent = ''
        const bytes = b64ToBytes(data)
        if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
          if (!name.toLowerCase().endsWith('.pdf')) {
            errorEl.textContent = '只支持 PDF。Word 请先另存为 PDF 再签名。'
            return
          }
        }
        fileName = name
        raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        stamps.forEach(function (stamp) { URL.revokeObjectURL(stamp.url) })
        stamps = []
        activeId = null
        lastBytes = null
        page = 1
        pdf = await pdfjs.getDocument({ data: bytes.slice(0), verbosity: 0 }).promise
        pageCount = pdf.numPages
        pageEl.hidden = false
        exportBtn.disabled = true
        fileEl.textContent = name + ' · ' + pageCount + ' 页'
        await paint()
      }
      document.getElementById('pick').onclick = function () { reply({ type: 'pick' }) }
      document.getElementById('clear').onclick = function () {
        pad.getContext('2d').clearRect(0, 0, pad.width, pad.height)
        empty = true
        resizePad()
      }
      document.getElementById('apply').onclick = async function () {
        if (!pdf) { toast('请先选择 PDF'); return }
        if (empty && !lastBytes) { toast('请先在签名板里手写签名'); return }
        const bytes = empty ? lastBytes : await pngBytes()
        lastBytes = bytes
        const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
        const offset = stamps.filter(function (stamp) { return stamp.page === page }).length
        stamps.push({
          id: crypto.randomUUID(),
          page,
          url,
          bytes,
          placement: { ...defaultPlacement, y: Math.max(0.06, defaultPlacement.y - offset * 0.1) },
        })
        activeId = stamps[stamps.length - 1].id
        exportBtn.disabled = false
        fileEl.textContent = fileName + ' · ' + pageCount + ' 页 · 已盖 ' + stamps.length + ' 处'
        toast('已盖到第 ' + page + ' 页，可拖动。翻页后再点一次可继续盖')
        drawStamps()
      }
      sizeInput.oninput = function () {
        const stamp = stamps.find(function (item) { return item.id === activeId })
        if (!stamp) return
        const width = Number(sizeInput.value) / 100
        stamp.placement.width = width
        stamp.placement.x = Math.min(1 - width, stamp.placement.x)
        drawStamps()
      }
      exportBtn.onclick = async function () {
        if (!raw || !stamps.length) return
        exportBtn.disabled = true
        exportBtn.textContent = '导出中…'
        try {
          const doc = await pdfLib.PDFDocument.load(raw)
          for (const stamp of stamps) {
            if (stamp.page - 1 < 0 || stamp.page - 1 >= doc.getPageCount()) continue
            const image = await doc.embedPng(stamp.bytes)
            const sheet = doc.getPage(stamp.page - 1)
            const pageWidth = sheet.getWidth()
            const pageHeight = sheet.getHeight()
            const boxW = Math.max(8, pageWidth * stamp.placement.width)
            const boxH = boxW * boxAspect
            const fitted = contain(image.width, image.height, boxW, boxH)
            sheet.drawImage(image, {
              x: pageWidth * stamp.placement.x + fitted.dx,
              y: pageHeight - pageHeight * stamp.placement.y - fitted.dy - fitted.height,
              width: fitted.width,
              height: fitted.height,
            })
          }
          const out = await doc.save()
          const base = fileName.replace(/\\.[^.]+$/, '') || 'document'
          reply({ type: 'save', name: base + '-已签名.pdf', data: bytesToB64(out) })
        } catch (err) {
          toast(err && err.message ? err.message : '导出失败')
        } finally {
          exportBtn.disabled = stamps.length === 0
          exportBtn.textContent = '导出 PDF'
        }
      }
      function onMessage(event) {
        const data = JSON.parse(event.data)
        if (!data || data.type !== 'open') return
        openPdf(data.name, data.data).catch(function (err) {
          errorEl.textContent = err && err.message ? err.message : '打开文件失败'
        })
      }
      document.addEventListener('message', onMessage)
      window.addEventListener('message', onMessage)
      resizePad()
      pad.onpointerdown = function (event) {
        drawing = true
        empty = false
        pad.setPointerCapture(event.pointerId)
        const ctx = pad.getContext('2d')
        const p = point(event, pad)
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
      }
      pad.onpointermove = function (event) {
        if (!drawing) return
        const p = point(event, pad)
        const ctx = pad.getContext('2d')
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      pad.onpointerup = function (event) {
        drawing = false
        pad.releasePointerCapture(event.pointerId)
      }
      reply({ type: 'ready' })
    </script>
  </body>
</html>`
