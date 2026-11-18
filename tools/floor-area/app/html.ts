export const ocrHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js"></script>
    <script>
      var workerPromise = null
      function reply(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload))
      }
      function getWorker() {
        if (!workerPromise) {
          workerPromise = window.Tesseract.createWorker('chi_sim+eng').then(function (worker) {
            return worker.setParameters({ tessedit_pageseg_mode: '12' }).then(function () {
              return worker
            })
          })
        }
        return workerPromise
      }
      async function recognize(image) {
        var worker = await getWorker()
        var result = await worker.recognize(image, {}, { blocks: true })
        var words = []
        var blocks = (result.data && result.data.blocks) || []
        blocks.forEach(function (block) {
          ;(block.paragraphs || []).forEach(function (paragraph) {
            ;(paragraph.lines || []).forEach(function (line) {
              ;(line.words || []).forEach(function (word) { words.push(word) })
            })
          })
        })
        if (!words.length && result.data && result.data.words) words = result.data.words
        return words.filter(function (word) {
          return word.text && word.text.trim()
        }).map(function (word) {
          return {
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            w: word.bbox.x1 - word.bbox.x0,
            h: word.bbox.y1 - word.bbox.y0
          }
        })
      }
      async function onMessage(event) {
        try {
          var data = JSON.parse(event.data)
          if (!data || data.type !== 'recognize') return
          reply({ type: 'result', boxes: await recognize(data.image) })
        } catch (error) {
          workerPromise = null
          reply({ type: 'error', message: error && error.message ? error.message : '识别失败' })
        }
      }
      document.addEventListener('message', onMessage)
      window.addEventListener('message', onMessage)
      reply({ type: 'ready' })
    </script>
  </body>
</html>`
