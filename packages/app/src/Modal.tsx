import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Modal as NativeModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

interface ModalProps {
  contentText: ReactNode
  title: ReactNode
  successFn?: () => void
  cancelFn?: () => void
  isBtn?: boolean
  width?: number
  loading?: boolean
  confirmText?: string
  cancelText?: string
  disable?: boolean
}

export default function Modal(props: ModalProps) {
  const {
    contentText,
    successFn,
    cancelFn,
    title,
    isBtn = true,
    width = 420,
    loading = false,
    cancelText = '取消',
    confirmText = '确定',
    disable = false,
  } = props
  const screen = useWindowDimensions()

  return (
    <NativeModal transparent animationType="fade" visible onRequestClose={cancelFn}>
      <View style={styles.mask}>
        <View style={[styles.card, { width: Math.min(width, screen.width - 48) }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{contentText}</Text>
          {isBtn ? (
            <View style={styles.footer}>
              <Pressable style={styles.btn} onPress={cancelFn} disabled={disable}>
                <Text>{cancelText}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.primary]}
                onPress={successFn}
                disabled={disable || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>{confirmText}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </NativeModal>
  )
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    marginTop: 12,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    borderColor: '#1677ff',
    backgroundColor: '#1677ff',
  },
  primaryText: {
    color: '#fff',
  },
})
