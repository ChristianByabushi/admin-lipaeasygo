import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Input, Select, Space, Typography, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { fmtDateTime } from '../lib/format'

const { Text } = Typography

type Log = {
  id: string; actor_id: string; actor_type: string
  action: string; resource_type?: string; resource_id?: string
  ip_address?: string; created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  'user.suspend':            'red',
  'user.reactivate':         'green',
  'transaction.freeze':      'orange',
  'fee_config.create':       'blue',
  'exchange_rate.create':    'green',
  'commission_config.create':'blue',
  'admin.create':            'purple',
  'admin.deactivate':        'red',
}

export default function AuditLog() {
  usePageTitle("Journal d'audit", ['Admin', 'Audit'])

  const [search,   setSearch]   = useState('')
  const [resource, setResource] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', resource],
    queryFn: () => api.get('/admin/audit-logs', { params: { resource_type: resource, limit: 200 } }).then(r => r.data.data as Log[]),
  })

  const filtered = (data ?? []).filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.action.includes(q) || (l.resource_type ?? '').includes(q) || (l.ip_address ?? '').includes(q)
  })

  const columns = [
    {
      title: 'Action', dataIndex: 'action', key: 'action', width: 240,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] ?? 'default'} style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Ressource', key: 'resource', width: 200,
      render: (_: any, l: Log) => l.resource_type ? (
        <div>
          <Text strong style={{ fontSize: 13 }}>{l.resource_type}</Text>
          {l.resource_id && <><br /><Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{l.resource_id.slice(0, 12)}…</Text></>}
        </div>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Acteur', key: 'actor', width: 180,
      render: (_: any, l: Log) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{l.actor_type.toUpperCase()}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{l.actor_id.slice(0, 12)}…</Text>
        </div>
      ),
    },
    {
      title: 'IP', dataIndex: 'ip_address', key: 'ip_address',
      render: (v?: string) => <Text code style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Date / Heure', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text>,
    },
  ]

  return (
    <Card
      style={{ borderRadius: 12 }}
      styles={{ body: { padding: 0 } }}
      title={
        <div>
          <div style={{ fontWeight: 700 }}>Journal d'audit complet</div>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            Toutes les actions administratives sont enregistrées et immuables.
          </Text>
        </div>
      }
      extra={
        <Space>
          <Input
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Action, ressource, IP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            value={resource}
            onChange={setResource}
            placeholder="Tous les types"
            allowClear
            onClear={() => setResource(undefined)}
            style={{ width: 160 }}
            options={[
              { value: 'user',              label: 'Utilisateurs'  },
              { value: 'transaction',       label: 'Transactions'  },
              { value: 'fee_config',        label: 'Frais'         },
              { value: 'transfer_limit',    label: 'Limites'       },
              { value: 'exchange_rate',     label: 'Taux'          },
              { value: 'commission_config', label: 'Commissions'   },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{filtered.length} entrée(s)</Text>
        </Space>
      }
    >
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true }}
        size="middle"
        scroll={{ x: 'max-content' }}
      />
    </Card>
  )
}
