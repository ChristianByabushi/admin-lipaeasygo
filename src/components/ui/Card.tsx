import React from 'react'
import { Card as AntCard, Statistic } from 'antd'

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  padding?: string | number
  className?: string
}

export function Card({ children, style, padding, className }: CardProps) {
  return (
    <AntCard
      className={className}
      styles={{ body: padding !== undefined ? { padding } : undefined }}
      style={{ borderRadius: 12, ...style }}
    >
      {children}
    </AntCard>
  )
}

// ── CardHeader ────────────────────────────────────────────────────────────────

export function CardHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', marginBottom: 16,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: subtitle ? 2 : 0 }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 13, color: '#64748B' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({
  icon, label, value, delta, color = '#E01E37',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  delta?: string
  color?: string
}) {
  return (
    <AntCard style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color, fontSize: 22 }}>{icon}</span>
        </div>
        <Statistic
          title={<span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>}
          value={value}
          valueStyle={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}
          suffix={delta
            ? <span style={{ fontSize: 11, color: '#10B981', marginLeft: 8 }}>{delta}</span>
            : undefined
          }
        />
      </div>
    </AntCard>
  )
}
