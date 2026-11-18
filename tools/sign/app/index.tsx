import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import { signHtml } from './html'

type Message =
  | { type: 'ready' }
  | { type: 'pick' }
  | { type: 'save'; name: string; data: string }
  | { type: 'error'; message: string }

export default function SignScreen() {
  const webRef = useRef<WebView<Record<string, unknown>>>(null)
  const ready = useRef(false)
  const queue = useRef<Array<() => void>>([])
  const [error, setError] = useState('')

  function whenReady() {
    if (ready.current) return Promise.resolve()
    return new Promise<void>((resolve) => queue.current.push(resolve))
  }

  async function pickPdf() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })
    const asset = picked.assets?.[0]
    if (picked.canceled || !asset) return
    const data = await new File(asset.uri).base64()
    await whenReady()
    webRef.current?.postMessage(JSON.stringify({ type: 'open', name: asset.name, data }))
  }

  async function savePdf(name: string, data: string) {
    const file = new File(Paths.cache, name)
    file.create({ overwrite: true })
    await file.write(data, { encoding: 'base64' })
    const canShare = await Sharing.isAvailableAsync()
    if (!canShare) {
      setError('已写入本机缓存，当前环境不能分享')
      return
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: name,
    })
  }

  async function onMessage(event: WebViewMessageEvent) {
    const payload = JSON.parse(event.nativeEvent.data) as Message
    if (payload.type === 'ready') {
      ready.current = true
      const waiters = queue.current.splice(0)
      for (const waiter of waiters) waiter()
      return
    }
    try {
      if (payload.type === 'pick') await pickPdf()
      if (payload.type === 'save') await savePdf(payload.name, payload.data)
      if (payload.type === 'error') setError(payload.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败')
    }
  }

  return (
    <View style={styles.page}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <WebView<Record<string, unknown>>
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: signHtml, baseUrl: 'https://cdn.jsdelivr.net/' }}
        onMessage={(event) => void onMessage(event)}
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f1f5f9' },
  web: { flex: 1, backgroundColor: '#f1f5f9' },
  error: { color: '#b45309', paddingHorizontal: 16, paddingTop: 8 },
})
