import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Input, Button, Select, Badge, Typography, Space, Spin,
  Empty, Tag, Tooltip, Alert,
} from 'antd'
import {
  CustomerServiceOutlined, UserOutlined, SendOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/ui/Badge'
import { fmtDateTime } from '../lib/format'

const { Text, Title } = Typography
const { TextArea }    = Input

type Ticket = {
  id: string; ticket_number: string; user_id?: string; user_name?: string
  category: string; subject: string; status: string; priority: string; created_at: string
}
type Message = {
  id: string; sender_type: string; sender_id: string; message: string; created_at: string
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#10B981', normal: '#007FFF', high: '#F59E0B', urgent: '#EF4444',
}

export default function Support() {
  usePageTitle('Support client', ['Admin', 'Support'])
  const qc = useQueryClient()

  const [selected, setSelected]   = useState<Ticket | null>(null)
  const [reply, setReply]         = useState('')
  const [statusFilter, setStatus] = useState<string | undefined>()
  const [sendError, setSendError] = useState('')

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: () => api.get('/support/admin/tickets', { params: { status: statusFilter, limit: 200 } }).then(r => r.data.data as Ticket[]),
    refetchInterval: 20_000,
  })

  const { data: messages, isLoading: msgLoading } = useQuery({
    queryKey: ['admin-ticket-messages', selected?.id],
    queryFn: () => selected
      ? api.get(`/support/admin/tickets/${selected.id}/messages`).then(r => r.data.data as Message[])
      : Promise.resolve([]),
    enabled: !!selected,
    refetchInterval: 15_000,
  })

  const sendMut = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/support/admin/tickets/${id}/messages`, null, { params: { message } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-messages', selected?.id] })
      qc.invalidateQueries({ queryKey: ['admin-tickets'] })
      setReply(''); setSendError('')
    },
    onError: (e) => setSendError(getErrorMessage(e)),
  })

  const closeMut = useMutation({
    mutationFn: (id: string) => api.put(`/support/admin/tickets/${id}/resolve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tickets'] }); setSelected(null) },
    onError: (e) => setSendError(getErrorMessage(e)),
  })

  return (
    <div className="support-layout">
      {/* ── Ticket list ── */}
      <Card
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
        style={{ borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Title level={5} style={{ margin: 0 }}>Tickets</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>{tickets?.length ?? 0}</Text>
          </div>
          <Select
            value={statusFilter}
            onChange={setStatus}
            placeholder="Tous les statuts"
            allowClear
            onClear={() => setStatus(undefined)}
            style={{ width: '100%' }}
            options={[
              { value: 'open',        label: 'Ouverts'   },
              { value: 'in_progress', label: 'En cours'  },
              { value: 'resolved',    label: 'Résolus'   },
              { value: 'closed',      label: 'Fermés'    },
            ]}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : !tickets?.length ? (
            <Empty style={{ padding: 40 }} description="Aucun ticket" image={<CustomerServiceOutlined style={{ fontSize: 40, color: '#CBD5E1' }} />} />
          ) : tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: '1px solid #F8FAFC',
                background: selected?.id === t.id ? '#EDF5FF' : '#fff',
                transition: 'background .1s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{t.subject}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t.ticket_number} • {t.category}</Text>
                </div>
                <Space direction="vertical" size={2} align="end" style={{ flexShrink: 0 }}>
                  <StatusBadge status={t.status} />
                  <Badge color={PRIORITY_COLOR[t.priority] ?? '#94A3B8'} text={<Text style={{ fontSize: 11 }}>{t.priority}</Text>} />
                </Space>
              </div>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{fmtDateTime(t.created_at)}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Conversation panel ── */}
      {selected ? (
        <Card
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
          style={{ borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{selected.subject}</Title>
                <Space size={8} wrap>
                  <Text type="secondary" style={{ fontSize: 12 }}>{selected.ticket_number}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{selected.category}</Text>
                  <Tag color={PRIORITY_COLOR[selected.priority]} style={{ fontSize: 11 }}>{selected.priority}</Tag>
                  {selected.user_id && <Text style={{ fontSize: 12, color: '#0F62FE', fontWeight: 500 }}>{selected.user_name ?? selected.user_id.slice(0, 8) + '…'}</Text>}
                </Space>
              </div>
              <Space>
                <StatusBadge status={selected.status} />
                {selected.status !== 'closed' && (
                  <Button size="small" type="text"
                    loading={closeMut.isPending}
                    onClick={() => { if (window.confirm('Fermer ce ticket ?')) closeMut.mutate(selected.id) }}
                    icon={<CheckCircleOutlined />}
                  >
                    Fermer
                  </Button>
                )}
              </Space>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgLoading ? <div style={{ textAlign: 'center' }}><Spin /></div>
              : messages?.map((msg) => {
                const isUser = msg.sender_type === 'user'
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isUser ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: isUser ? '#EDF5FF' : '#FFEAEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isUser ? <UserOutlined style={{ color: '#0F62FE' }} /> : <CustomerServiceOutlined style={{ color: '#E01E37' }} />}
                    </div>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: isUser ? '#F1F5F9' : '#E01E37', color: isUser ? '#334155' : '#fff', fontSize: 13, lineHeight: 1.5 }}>
                        {msg.message}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block', textAlign: isUser ? 'left' : 'right' }}>
                        {isUser ? 'Utilisateur' : 'Support'} • {fmtDateTime(msg.created_at)}
                      </Text>
                    </div>
                  </div>
                )
              })
            }
          </div>

          {/* Reply box */}
          {selected.status !== 'closed' && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9' }}>
              {sendError && <Alert type="error" message={sendError} showIcon style={{ marginBottom: 10 }} />}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <TextArea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Répondre à l'utilisateur…"
                  rows={3}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  loading={sendMut.isPending}
                  disabled={!reply.trim()}
                  onClick={() => sendMut.mutate({ id: selected.id, message: reply })}
                  icon={<SendOutlined />}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card style={{ borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty style={{ padding: 60 }} image={<CustomerServiceOutlined style={{ fontSize: 48, color: '#CBD5E1' }} />} description={
            <span><Text strong style={{ fontSize: 15 }}>Aucun ticket sélectionné</Text><br /><Text type="secondary">Cliquez sur un ticket pour afficher la conversation</Text></span>
          } />
        </Card>
      )}
    </div>
  )
}
