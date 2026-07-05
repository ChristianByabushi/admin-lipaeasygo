import React from 'react'
import { Tag } from 'antd'

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string
  color?: string
  bg?: string
  size?: 'sm' | 'md'
}

export function Badge({ label, color, bg, size = 'md' }: BadgeProps) {
  return (
    <Tag
      style={{
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 600,
        borderRadius: 999,
        padding: size === 'sm' ? '1px 7px' : '2px 9px',
        border: 'none',
        background: bg,
        color,
        lineHeight: 1.6,
      }}
    >
      {label}
    </Tag>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

// Maps every backend status to an antd Tag color or hex pair [fg, bg]
const STATUS_PRESETS: Record<string, [string, string]> = {
  active:       ['#059669', '#E6FBF2'],
  verified:     ['#059669', '#E6FBF2'],
  completed:    ['#059669', '#E6FBF2'],
  credited:     ['#059669', '#E6FBF2'],
  approved:     ['#059669', '#E6FBF2'],
  open:         ['#0F62FE', '#EDF5FF'],
  in_progress:  ['#D97706', '#FEF7E6'],
  pending:      ['#D97706', '#FEF7E6'],
  processing:   ['#D97706', '#FEF7E6'],
  under_review: ['#D97706', '#FEF7E6'],
  rejected:     ['#EF4444', '#FEEAEA'],
  failed:       ['#EF4444', '#FEEAEA'],
  suspended:    ['#EF4444', '#FEEAEA'],
  deleted:      ['#EF4444', '#FEEAEA'],
  frozen:       ['#64748B', '#F1F5F9'],
  cancelled:    ['#94A3B8', '#F1F5F9'],
  resolved:     ['#64748B', '#F1F5F9'],
  closed:       ['#94A3B8', '#F1F5F9'],
  basic:        ['#475569', '#F1F5F9'],
  super:        ['#E01E37', '#FFEAEB'],
}

export function StatusBadge({ status }: { status: string }) {
  const [color, bg] = STATUS_PRESETS[status] ?? ['#64748B', '#F1F5F9']
  const label = status.replace(/_/g, ' ')
  return <Badge label={label} color={color} bg={bg} />
}
