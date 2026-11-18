import type { ReactNode } from 'react'
import './modal.css'

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

  return (
    <div className="ui-modal-mask" onClick={cancelFn}>
      <div className="ui-modal" style={{ width }} onClick={(event) => event.stopPropagation()}>
        <div className="ui-modal-title">{title}</div>
        <div className="ui-modal-body">{contentText}</div>
        {isBtn ? (
          <div className="ui-modal-footer">
            <button type="button" onClick={cancelFn} disabled={disable}>
              {cancelText}
            </button>
            <button type="button" onClick={successFn} disabled={disable || loading}>
              {loading ? '处理中' : confirmText}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
