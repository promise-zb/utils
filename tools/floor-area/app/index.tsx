import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import Modal from '@local/ui-app'
import { areaStatus, calcAreas, formatResult, type AreaResult } from '../src/index'
import { useOcr } from './ocr'

export default function FloorAreaScreen() {
  const { node, recognize } = useOcr()
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState<AreaResult | null>(null)
  const [notice, setNotice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onPick() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    const asset = picked.assets?.[0]
    if (picked.canceled || !asset) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const long = Math.max(asset.width, asset.height)
      const target = long < 1400 ? Math.min(2200, long * 2) : Math.min(1800, long)
      const image = await ImageManipulator.manipulateAsync(
        asset.uri,
        Math.abs(target - long) < long * 0.05
          ? []
          : [{ resize: { width: Math.round((asset.width * target) / long) } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      setPreview(image.uri)
      const boxes = await recognize(`data:image/jpeg;base64,${image.base64 ?? ''}`)
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
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.desc}>选择图纸后自动识别。只计算标了长度或面积的区域。</Text>
      <Pressable style={styles.btn} onPress={() => void onPick()} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>选择图纸</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {preview ? (
        <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
      ) : null}
      {result ? <Text style={styles.report}>{formatResult(result)}</Text> : null}
      {node}
      {notice && result ? (
        <Modal
          title="计算结果"
          contentText={result.message}
          cancelFn={() => setNotice(false)}
          successFn={() => setNotice(false)}
          confirmText="知道了"
        />
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  desc: { color: '#666', lineHeight: 20 },
  btn: {
    alignSelf: 'flex-start',
    minWidth: 96,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#1677ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff' },
  error: { color: '#cf1322' },
  preview: { width: '100%', height: 280, backgroundColor: '#fff', borderRadius: 8 },
  report: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    lineHeight: 24,
    fontSize: 16,
  },
})
