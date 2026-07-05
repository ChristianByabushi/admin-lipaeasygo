/**
 * Table — wrapper autour d'antd Table.
 * Conserve l'interface Column<T> + TableToolbar + SearchInput + FilterSelect.
 */
import React from 'react'
import {
  Table as AntTable, Input, Select, Space,
  type TableColumnsType,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'

// ── Column interface (rétro-compatible) ───────────────────────────────────────

export interface Column<T> {
  key: string
  header: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render?: (row: T, idx: number) => React.ReactNode
}

// ── Table ─────────────────────────────────────────────────────────────────────

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (row: T) => void
  keyField?: keyof T
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyText = 'Aucune donnée',
  onRowClick,
  keyField = 'id' as keyof T,
}: TableProps<T>) {
  // Convert Column<T> → antd ColumnsType
  const antColumns: TableColumnsType<T> = columns.map((col) => ({
    key:       col.key,
    title:     col.header,
    dataIndex: col.key,
    width:     col.width,
    align:     col.align,
    render:    col.render
      ? (_, record: T, idx: number) => col.render!(record, idx)
      : (val: unknown) => val != null ? String(val) : '—',
  }))

  return (
    <AntTable<T>
      columns={antColumns}
      dataSource={data}
      loading={loading}
      rowKey={(row) => String(row[keyField] ?? Math.random())}
      pagination={false}
      locale={{ emptyText }}
      size="middle"
      scroll={{ x: 'max-content' }}
      onRow={onRowClick ? (record) => ({ onClick: () => onRowClick(record), style: { cursor: 'pointer' } }) : undefined}
      style={{ borderRadius: 0 }}
    />
  )
}

// ── TableToolbar ──────────────────────────────────────────────────────────────

export function TableToolbar({ children }: { children: React.ReactNode }) {
  return (
    <Space wrap style={{ marginBottom: 16, width: '100%' }}>
      {children}
    </Space>
  )
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Input
      prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      allowClear
      style={{ minWidth: 240, maxWidth: 320 }}
    />
  )
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Filtrer',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <Select
      value={value || undefined}
      onChange={(val) => onChange(val ?? '')}
      placeholder={placeholder}
      allowClear
      onClear={() => onChange('')}
      style={{ minWidth: 160 }}
      options={options}
    />
  )
}
