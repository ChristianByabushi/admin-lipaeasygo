import React from 'react'
import { Modal as AntModal, Button } from 'antd'

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  width?: number
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 520, footer }: ModalProps) {
  return (
    <AntModal
      open={open}
      onCancel={onClose}
      title={<span style={{ fontWeight: 700 }}>{title}</span>}
      width={width}
      footer={
        footer
          ? <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>
          : null
      }
      destroyOnHidden
      centered
    >
      {children}
    </AntModal>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
  danger = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading?: boolean
  danger?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>Annuler</Button>
          <Button
            type="primary"
            danger={danger}
            loading={loading}
            onClick={onConfirm}
          >
            Confirmer
          </Button>
        </>
      }
    >
      <p style={{ color: '#475569', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
