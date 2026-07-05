import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Statistic, Table, Tag, Button, Modal, Form,
  Input, Select, Alert, Typography, AutoComplete, Divider,
  type TableColumnsType,
} from 'antd'
import {
  WalletOutlined, RiseOutlined, TeamOutlined, PlusOutlined,
  SearchOutlined, ShopOutlined,
} from '@ant-design/icons'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/ui/Badge'
import { fmtMoney, fmtDateTime } from '../lib/format'
import { ACCOUNT_TYPE } from '../lib/accountTypes'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────

type Deposit = {
  id: string
  agent_id: string | null
  agent_name?: string   // business_name de l'agent
  agent_phone?: string  // numéro de téléphone de l'agent
  amount: string
  currency: string
  reference?: string
  status: string
  created_at: string
}

type AgentOption = {
  id: string
  business_name?: string
  phone_number: string
  float_balance: string
  float_currency: string
  tier: string
  status: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Identité synthétique d'un agent dans le tableau Finance */
function AgentIdentity({ name, phone, id }: { name?: string; phone?: string; id?: string | null }) {
  // Priorité : business_name > phone_number > UUID tronqué > —
  const hasName  = name  && name  !== '—'
  const hasPhone = phone && phone !== '—'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: ACCOUNT_TYPE.agent.colorLight,
        border: `1.5px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: ACCOUNT_TYPE.agent.color,
      }}>
        {(hasName ? name![0] : hasPhone ? phone![0] : 'A').toUpperCase()}
      </div>
      <div>
        {hasName ? (
          <Text strong style={{ fontSize: 13, color: '#1E293B', display: 'block' }}>
            {name}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', display: 'block' }}>
            Agent sans enseigne
          </Text>
        )}
        {hasPhone ? (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {phone}
          </Text>
        ) : id ? (
          <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>
            {id.slice(0, 12)}…
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Finance() {
  usePageTitle('Caisse / Dépôts', ['Admin', 'Finance'])
  const qc = useQueryClient()

  const [search,         setSearch]       = useState('')
  const [currencyFilter, setCurrency]     = useState<string | undefined>()
  const [statusFilter,   setStatus]       = useState<string | undefined>()
  const [showModal,      setShowModal]    = useState(false)
  const [formError,      setFormError]    = useState('')
  const [agentSearch,    setAgentSearch]  = useState('')
  const [selectedAgent,  setSelectedAgent] = useState<AgentOption | null>(null)
  const [form]                             = Form.useForm()

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['deposits', currencyFilter, statusFilter],
    queryFn: () =>
      api.get('/finance/admin/deposits', {
        params: { currency: currencyFilter, status: statusFilter, limit: 200 },
      }).then(r => r.data.data as Deposit[]),
    throwOnError: false,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get('/finance/admin/summary').then(r => r.data.data),
    throwOnError: false,
    refetchInterval: 60_000,
  })

  // Recherche d'agents en live par numéro ou nom
  const { data: agentResults } = useQuery({
    queryKey: ['agents-search', agentSearch],
    queryFn: () =>
      api.get('/agents/admin/list', { params: { limit: 8, search: agentSearch || undefined } })
        .then(r => r.data.data as AgentOption[]),
    enabled: agentSearch.length >= 2,
    throwOnError: false,
  })

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (values: { agent_id: string; amount: string; currency: string; reference?: string }) => {
      const payload: Record<string, unknown> = {
        agent_id: values.agent_id,
        amount:   values.amount,
        currency: values.currency,
      }
      if (values.reference?.trim()) payload.reference = values.reference.trim()
      return api.post('/finance/admin/deposits', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      setShowModal(false)
      setFormError('')
      setAgentSearch('')
      setSelectedAgent(null)
      form.resetFields()
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  // ── Filter ────────────────────────────────────────────────────────────────────

  const filtered = (data ?? []).filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (d.agent_name ?? '').toLowerCase().includes(q) ||
      (d.agent_phone ?? '').includes(q) ||
      (d.agent_id ?? '').includes(q) ||
      (d.reference ?? '').toLowerCase().includes(q)
    )
  })

  // AutoComplete options pour la recherche d'agent
  const agentOptions = (agentResults ?? []).map(a => ({
    value: a.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: ACCOUNT_TYPE.agent.colorLight,
          border: `1.5px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: ACCOUNT_TYPE.agent.color,
        }}>
          {(a.business_name?.[0] ?? a.phone_number[0] ?? 'A').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
            {a.business_name ?? 'Agent particulier'}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            {a.phone_number} · Float : {fmtMoney(a.float_balance, a.float_currency)}
          </div>
        </div>
        <Tag
          color={a.status === 'active' ? 'success' : 'warning'}
          style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600 }}
        >
          {a.status}
        </Tag>
      </div>
    ),
    agent: a,
  }))

  // ── Columns ───────────────────────────────────────────────────────────────────

  const columns: TableColumnsType<Deposit> = [
    {
      title: 'Agent',
      key: 'agent',
      width: 240,
      render: (_: unknown, d: Deposit) => (
        <AgentIdentity
          name={d.agent_name}
          phone={d.agent_phone}
          id={d.agent_id}
        />
      ),
    },
    {
      title: 'Montant',
      key: 'amount',
      align: 'right',
      render: (_: unknown, d: Deposit) => (
        <Text strong style={{ fontSize: 14 }}>
          {fmtMoney(d.amount, d.currency)}
        </Text>
      ),
    },
    {
      title: 'Devise',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'USD' ? 'blue' : 'volcano'} style={{ fontWeight: 700 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      render: (v?: string) => v
        ? <Text code style={{ fontSize: 12 }}>{v}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {fmtDateTime(v)}
        </Text>
      ),
    },
  ]

  // ── Summary cards ─────────────────────────────────────────────────────────────

  const stats = [
    {
      label:  "Total dépôts CDF (aujourd'hui)",
      value:  fmtMoney(summary?.total_deposits_cdf_today ?? '0', 'CDF'),
      icon:   <WalletOutlined style={{ fontSize: 20, color: '#E01E37' }} />,
      iconBg: '#E01E3714',
    },
    {
      label:  "Total dépôts USD (aujourd'hui)",
      value:  fmtMoney(summary?.total_deposits_usd_today ?? '0', 'USD'),
      icon:   <RiseOutlined style={{ fontSize: 20, color: '#0F62FE' }} />,
      iconBg: '#0F62FE14',
    },
    {
      label:  'Agents approvisionnés',
      value:  summary?.agents_funded_today ?? '—',
      icon:   <TeamOutlined style={{ fontSize: 20, color: '#F59E0B' }} />,
      iconBg: '#F59E0B14',
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  function openModal() {
    setShowModal(true)
    setFormError('')
    setAgentSearch('')
    setSelectedAgent(null)
    form.resetFields()
  }

  function closeModal() {
    setShowModal(false)
    setFormError('')
    setAgentSearch('')
    setSelectedAgent(null)
    form.resetFields()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Summary cards ── */}
      <Row gutter={[14, 14]}>
        {stats.map(({ label, value, icon, iconBg }) => (
          <Col key={label} xs={24} sm={8}>
            <Card style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {icon}
                </div>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>{label}</Text>}
                  value={value}
                  valueStyle={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Table card ── */}
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
        title={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Agent, téléphone, référence…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
              style={{ width: 240 }}
            />
            <Select
              value={currencyFilter}
              onChange={setCurrency}
              placeholder="Devise"
              allowClear
              onClear={() => setCurrency(undefined)}
              style={{ width: 100 }}
              options={[
                { value: 'CDF', label: 'CDF' },
                { value: 'USD', label: 'USD' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatus}
              placeholder="Statut"
              allowClear
              onClear={() => setStatus(undefined)}
              style={{ width: 140 }}
              options={[
                { value: 'completed', label: 'Complétés'  },
                { value: 'pending',   label: 'En attente' },
                { value: 'failed',    label: 'Échoués'    },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{filtered.length} dépôt(s)</Text>
          </div>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            Nouveau dépôt
          </Button>
        }
      >
        <Table<Deposit>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} dépôt(s)` }}
          size="middle"
          locale={{ emptyText: 'Aucun dépôt enregistré' }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* ── Modale nouveau dépôt ── */}
      <Modal
        open={showModal}
        onCancel={closeModal}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShopOutlined style={{ color: ACCOUNT_TYPE.agent.color }} />
            <span>Enregistrer un dépôt agent</span>
          </div>
        }
        onOk={() =>
          form.validateFields().then(v => {
            if (!selectedAgent) { setFormError("Veuillez sélectionner un agent."); return }
            createMut.mutate({ ...v, agent_id: selectedAgent.id })
          }).catch(() => {})
        }
        confirmLoading={createMut.isPending}
        okText="Enregistrer le dépôt"
        cancelText="Annuler"
        destroyOnHidden
        width={500}
      >
        {formError && (
          <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />
        )}

        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ currency: 'CDF' }}>

          {/* ── Recherche agent par téléphone ou nom ── */}
          <Form.Item
            label={
              <span>
                Agent <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                  — tapez le numéro ou le nom de l'enseigne
                </span>
              </span>
            }
            required
          >
            <AutoComplete
              options={agentOptions}
              value={agentSearch}
              onChange={v => {
                setAgentSearch(v)
                if (!v) setSelectedAgent(null)
              }}
              onSelect={(id, opt) => {
                const a = (opt as typeof agentOptions[0]).agent
                setSelectedAgent(a)
                setAgentSearch(a.business_name ?? a.phone_number)
                form.setFieldValue('agent_id', a.id)
              }}
              placeholder="+243 81… ou KABILA CASH"
              style={{ width: '100%' }}
              notFoundContent={
                agentSearch.length >= 2
                  ? <Text type="secondary" style={{ fontSize: 13 }}>Aucun agent trouvé</Text>
                  : <Text type="secondary" style={{ fontSize: 13 }}>Saisissez au moins 2 caractères</Text>
              }
            >
              <Input
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                allowClear
                onClear={() => { setAgentSearch(''); setSelectedAgent(null) }}
              />
            </AutoComplete>

            {/* Carte récapitulative de l'agent sélectionné */}
            {selectedAgent && (
              <div style={{
                marginTop: 10, padding: '12px 14px', borderRadius: 10,
                background: ACCOUNT_TYPE.agent.colorLight,
                border: `1px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: ACCOUNT_TYPE.agent.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                }}>
                  {(selectedAgent.business_name?.[0] ?? selectedAgent.phone_number[0]).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: ACCOUNT_TYPE.agent.color, display: 'block', fontSize: 13 }}>
                    {selectedAgent.business_name ?? 'Agent particulier'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {selectedAgent.phone_number}
                    {' · '}Float actuel : <strong>{fmtMoney(selectedAgent.float_balance, selectedAgent.float_currency)}</strong>
                    {' · '}Tier <strong>{selectedAgent.tier}</strong>
                  </Text>
                </div>
                <Tag
                  color={selectedAgent.status === 'active' ? 'success' : 'warning'}
                  style={{ fontWeight: 600, fontSize: 11 }}
                >
                  {selectedAgent.status}
                </Tag>
              </div>
            )}

            {/* Champ hidden pour la validation */}
            <Form.Item name="agent_id" noStyle hidden>
              <Input />
            </Form.Item>
          </Form.Item>

          <Divider style={{ margin: '4px 0 16px' }} />

          {/* ── Montant + devise ── */}
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="amount"
                label="Montant"
                rules={[
                  { required: true, message: 'Requis' },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: 'Montant invalide' },
                ]}
              >
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50 000"
                  prefix={
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>
                      {form.getFieldValue('currency') ?? 'CDF'}
                    </span>
                  }
                  style={{ fontWeight: 600, fontSize: 14 }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="currency"
                label="Devise"
                rules={[{ required: true }]}
              >
                <Select
                  style={{ width: '100%' }}
                  options={[
                    { value: 'CDF', label: 'CDF — Franc Congolais' },
                    { value: 'USD', label: 'USD — Dollar US' },
                  ]}
                  optionLabelProp="value"  // ← affiche seulement "CDF" / "USD" dans le champ
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reference"
            label="Référence"
            extra="Optionnel — numéro de bordereau, virement, chèque, etc."
          >
            <Input placeholder="REF-2026-00123" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
