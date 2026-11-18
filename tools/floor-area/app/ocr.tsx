import { useRef } from 'react'
import { StyleSheet } from 'react-native'
import WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import type { TextBox } from '../src/types'
import { ocrHtml } from './html'

type Pending = {
  resolve: (boxes: TextBox[]) => void
  reject: (error: Error) => void
}

export function useOcr() {
  const webRef = useRef<WebView<Record<string, unknown>>>(null)
  const ready = useRef(false)
  const pending = useRef<Pending | null>(null)
  const queue = useRef<Array<() => void>>([])

  function flush() {
    ready.current = true
    const waiters = queue.current.splice(0)
    for (const waiter of waiters) waiter()
  }

  function onMessage(event: WebViewMessageEvent) {
    const payload = JSON.parse(event.nativeEvent.data) as
      | { type: 'ready' }
      | { type: 'result'; boxes: TextBox[] }
      | { type: 'error'; message: string }
    if (payload.type === 'ready') {
      flush()
      return
    }
    const current = pending.current
    pending.current = null
    if (!current) return
    if (payload.type === 'result') current.resolve(payload.boxes)
    else current.reject(new Error(payload.message))
  }

  function whenReady() {
    if (ready.current) return Promise.resolve()
    return new Promise<void>((resolve) => queue.current.push(resolve))
  }

  async function recognize(dataUrl: string) {
    await whenReady()
    return new Promise<TextBox[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current = null
        reject(new Error('识别超时'))
      }, 90000)
      pending.current = {
        resolve: (boxes) => {
          clearTimeout(timer)
          resolve(boxes)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      }
      webRef.current?.postMessage(JSON.stringify({ type: 'recognize', image: dataUrl }))
    })
  }

  const node = (
    <WebView<Record<string, unknown>>
      ref={webRef}
      originWhitelist={['*']}
      source={{ html: ocrHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
      onMessage={onMessage}
      onError={() => flush()}
      javaScriptEnabled
      domStorageEnabled
      style={styles.hidden}
    />
  )

  return { node, recognize }
}

const styles = StyleSheet.create({
  hidden: { width: 1, height: 1, opacity: 0 },
})
