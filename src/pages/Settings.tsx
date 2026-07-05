import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Tabs, Table, Button, Modal, Form, Input, Select,
  Alert, Row, Col, Typography, InputNumber, Divider,
} from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { getStoredUser, can } from '../lib/auth'

const { Text } = Typography

const TX_TYPES = ['p2p_send','topup_agent','cashout_agent','topup_mobile_money','float_transfer'].map(v => ({ value: v, label: v.replaceAll('_',' ') }))
const CURRENCIES = [{ value: 'CDF', label: 'CDF' }, { value: 'USD', label: 'USD' }]

type FeeConfig   = { id: string; transaction_type: string; currency: string; kyc_tier?: number; fee_type: string; fee_value: string; min_fee?: string; max_fee?: string }
type Limit       = { id: string; kyc_tier: number; transaction_type: string; currency: string; per_transaction_max: string; daily_max: string; monthly_max: string }
type CommConfig  = { id: string; agent_tier: string; transaction_type: string; currency: string; rate_type: string; rate_value: string }

export default function Settings() {
  usePageTitle('Paramètres', ['Admin', 'Paramètres'])
  const qc       = useQueryClient()
  const user     = getStoredUser()
  const canWrite = user ? can(user.role, 'settings.write') : false

  const [activeTab, setActiveTab] = useState('general')
  const [open,      setOpen]      = useState(false)
  const [formError, setFormError] = useState('')
  const [form]                    = Form.useForm()
  const [generalForm]             = Form.useForm()
  const [generalSaved, setGeneralSaved] = useState(false)

  // Paramètres généraux
  const { data: generalSettings, refetch: refetchGeneral } = useQuery({
    queryKey: ['settings-general'],
    queryFn: () => api.get('/admin/settings/general').then(r => r.data.data).catch(() => ({ freeze_window_days: 2 })),
  })

  const generalMut = useMutation({
    mutationFn: (values: { freeze_window_days: number; play_store_url?: string; app_store_url?: string }) =>
      api.put('/admin/settings/general', values),
    onSuccess: () => { refetchGeneral(); setGeneralSaved(true); setTimeout(() => setGeneralSaved(false), 3000) },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  // Queries
  const { data: fees,   isLoading: feesLoading }   = useQuery({ queryKey: ['fees'],   queryFn: () => api.get('/admin/settings/fees').then(r => r.data.data as FeeConfig[]) })
  const { data: limits, isLoading: limitsLoading } = useQuery({ queryKey: ['limits'], queryFn: () => api.get('/admin/settings/limits').then(r => r.data.data as Limit[]) })
  const { data: comms,  isLoading: commsLoading }  = useQuery({ queryKey: ['comms'],  queryFn: () => api.get('/admin/settings/commissions').then(r => r.data.data as CommConfig[]) })

  const createMut = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const url = activeTab === 'fees' ? '/admin/settings/fees' : activeTab === 'limits' ? '/admin/settings/limits' : '/admin/settings/commissions'
      return api.post(url, values)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [activeTab === 'fees' ? 'fees' : activeTab === 'limits' ? 'limits' : 'comms'] })
      setOpen(false); setFormError(''); form.resetFields()
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  const FEE_COLS = [
    { title: 'Type',     dataIndex: 'transaction_type', key: 'transaction_type', render: (v: string) => v.replaceAll('_',' ') },
    { title: 'Devise',   dataIndex: 'currency',         key: 'currency' },
    { title: 'Tier KYC', dataIndex: 'kyc_tier',         key: 'kyc_tier',         render: (v: number | undefined) => v != null ? `Tier ${v}` : 'Tous' },
    { title: 'Type frais', dataIndex: 'fee_type',       key: 'fee_type' },
    { title: 'Valeur',   dataIndex: 'fee_value',        key: 'fee_value',        align: 'right' as const, render: (v: string, r: FeeConfig) => <Text strong>{v}{r.fee_type === 'percentage' ? '%' : ''}</Text> },
    { title: 'Min',      dataIndex: 'min_fee',          key: 'min_fee',          align: 'right' as const, render: (v?: string) => v ?? '—' },
    { title: 'Max',      dataIndex: 'max_fee',          key: 'max_fee',          align: 'right' as const, render: (v?: string) => v ?? '—' },
  ]

  const LIMIT_COLS = [
    { title: 'Tier KYC',      dataIndex: 'kyc_tier',           key: 'kyc_tier',           render: (v: number) => `Tier ${v}` },
    { title: 'Type',          dataIndex: 'transaction_type',   key: 'transaction_type',   render: (v: string) => v.replaceAll('_',' ') },
    { title: 'Devise',        dataIndex: 'currency',           key: 'currency' },
    { title: 'Par tx',        dataIndex: 'per_transaction_max',key: 'per_transaction_max',align: 'right' as const, render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Par jour',      dataIndex: 'daily_max',          key: 'daily_max',          align: 'right' as const },
    { title: 'Par mois',      dataIndex: 'monthly_max',        key: 'monthly_max',        align: 'right' as const },
  ]

  const COMM_COLS = [
    { title: 'Tier agent',    dataIndex: 'agent_tier',         key: 'agent_tier' },
    { title: 'Type',          dataIndex: 'transaction_type',   key: 'transaction_type',   render: (v: string) => v.replaceAll('_',' ') },
    { title: 'Devise',        dataIndex: 'currency',           key: 'currency' },
    { title: 'Type taux',     dataIndex: 'rate_type',          key: 'rate_type' },
    { title: 'Taux',          dataIndex: 'rate_value',         key: 'rate_value',         align: 'right' as const, render: (v: string, r: CommConfig) => <Text strong>{v}{r.rate_type === 'percentage' ? '%' : ''}</Text> },
  ]

  const tabItems = [
    {
      key: 'general', label: <span><SettingOutlined /> Général</span>,
      children: (
        <div style={{ maxWidth: 480, padding: '8px 0 16px' }}>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
            Paramètres globaux du système applicables à toutes les opérations.
          </Text>
          {generalSaved && (
            <Alert type="success" message="Paramètre sauvegardé." showIcon style={{ marginBottom: 16 }} />
          )}
          <Form
            form={generalForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              freeze_window_days: generalSettings?.freeze_window_days ?? 2,
              play_store_url:     generalSettings?.play_store_url ?? '',
              app_store_url:      generalSettings?.app_store_url  ?? '',
            }}
            key={JSON.stringify(generalSettings)}
            onFinish={(v) => generalMut.mutate(v)}
          >
            {/* Gel des transactions */}
            <Form.Item
              name="freeze_window_days"
              label={<Text strong>Fenêtre de gel des transactions (jours)</Text>}
              rules={[{ required: true }, { type: 'number', min: 1, max: 30 }]}
              extra={
                <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                  Nombre de jours après la création d'une transaction pendant lesquels
                  le gel est autorisé. Valeur par défaut : <strong>2 jours</strong>.
                </span>
              }
            >
              <InputNumber min={1} max={30} addonAfter="jour(s)" style={{ width: 180 }} />
            </Form.Item>

            <Divider style={{ margin: '16px 0' }} />

            {/* Liens de téléchargement de l'application */}
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Liens de téléchargement de l'application
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
              Ces liens sont affichés aux utilisateurs sur le portail web pour les inviter à télécharger l'application mobile.
            </Text>

            <Form.Item
              name="play_store_url"
              label="Google Play Store"
              rules={[{ type: 'url', message: 'URL invalide', warningOnly: true }]}
              extra={<span style={{ fontSize: 11, color: '#94A3B8' }}>Ex: https://play.google.com/store/apps/details?id=com.lipaeasygo</span>}
            >
              <Input
                prefix={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#3DDC84">
                    <path d="M3 20.5v-17c0-.83 1-1.3 1.63-.8l15 8.5a1 1 0 010 1.6l-15 8.5C3.99 21.8 3 21.33 3 20.5z"/>
                  </svg>
                }
                placeholder="https://play.google.com/store/apps/…"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="app_store_url"
              label="Apple App Store"
              rules={[{ type: 'url', message: 'URL invalide', warningOnly: true }]}
              extra={<span style={{ fontSize: 11, color: '#94A3B8' }}>Ex: https://apps.apple.com/app/lipaeasygo/id123456789</span>}
            >
              <Input
                prefix={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#555">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                }
                placeholder="https://apps.apple.com/app/…"
                allowClear
              />
            </Form.Item>

            {canWrite && (
              <Button type="primary" htmlType="submit" loading={generalMut.isPending}>
                Enregistrer les paramètres
              </Button>
            )}
          </Form>
        </div>
      ),
    },
    {
      key: 'fees', label: 'Frais de transaction',
      children: <Table dataSource={fees ?? []} columns={FEE_COLS} rowKey="id" loading={feesLoading} pagination={false} size="middle" />,
    },
    {
      key: 'limits', label: 'Limites de transfert',
      children: <Table dataSource={limits ?? []} columns={LIMIT_COLS} rowKey="id" loading={limitsLoading} pagination={false} size="middle" />,
    },
    {
      key: 'commissions', label: 'Commissions agents-terrain',
      children: <Table dataSource={comms ?? []} columns={COMM_COLS} rowKey="id" loading={commsLoading} pagination={false} size="middle" />,
    },
  ]

  const MODAL_TITLE: Record<string, string> = {
    fees: 'Ajouter des frais', limits: 'Ajouter une limite', commissions: 'Ajouter une commission',
  }

  return (
    <>
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
        extra={canWrite && activeTab !== 'general' && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setOpen(true); setFormError(''); form.resetFields() }}>
            Ajouter
          </Button>
        )}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ padding: '0 16px' }}
        />
      </Card>

      <Modal
        open={open}
        onCancel={() => { setOpen(false); setFormError('') }}
        title={MODAL_TITLE[activeTab]}
        onOk={() => form.validateFields().then(values => createMut.mutate(values)).catch(() => {})}
        confirmLoading={createMut.isPending}
        destroyOnHidden
        width={520}
      >
        {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" requiredMark={false}>

          {activeTab === 'fees' && (
            <>
              <Form.Item name="transaction_type" label="Type de transaction" rules={[{ required: true }]}>
                <Select options={TX_TYPES} style={{ width: '100%' }} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="currency" label="Devise" rules={[{ required: true }]}>
                    <Select options={CURRENCIES} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fee_type" label="Type de frais" rules={[{ required: true }]}>
                    <Select style={{ width: '100%' }} options={[
                      { value: 'percentage', label: 'Pourcentage (%)' },
                      { value: 'fixed',      label: 'Montant fixe'    },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="fee_value" label="Valeur" rules={[{ required: true }]}>
                    <Input type="number" step="0.0001" placeholder="0.5" suffix={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {form.getFieldValue('fee_type') === 'percentage' ? '%' : 'CDF'}
                      </Text>
                    } />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="min_fee" label="Frais min (opt.)">
                    <Input type="number" placeholder="—" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="max_fee" label="Frais max (opt.)">
                    <Input type="number" placeholder="—" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {activeTab === 'limits' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="kyc_tier" label="Tier KYC" rules={[{ required: true }]}>
                    <Select style={{ width: '100%' }} options={[
                      { value: '0', label: 'Tier 0 — Non vérifié' },
                      { value: '1', label: 'Tier 1 — Identité'    },
                      { value: '2', label: 'Tier 2 — Complet'     },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="transaction_type" label="Type transaction" rules={[{ required: true }]}>
                    <Select options={TX_TYPES} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="currency" label="Devise" rules={[{ required: true }]}>
                    <Select options={CURRENCIES} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="per_transaction_max" label="Max par transaction" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="daily_max" label="Max par jour" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="monthly_max" label="Max par mois" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {activeTab === 'commissions' && (
            <>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="agent_tier" label="Tier agent" rules={[{ required: true }]}>
                    <Select style={{ width: '100%' }} options={[
                      { value: 'basic', label: 'Basic' },
                      { value: 'super', label: 'Super' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="transaction_type" label="Type transaction" rules={[{ required: true }]}>
                    <Select options={TX_TYPES} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="currency" label="Devise" rules={[{ required: true }]}>
                    <Select options={CURRENCIES} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="rate_type" label="Type taux" rules={[{ required: true }]}>
                    <Select style={{ width: '100%' }} options={[
                      { value: 'percentage', label: 'Pourcentage (%)' },
                      { value: 'fixed',      label: 'Montant fixe'    },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="rate_value" label="Valeur" rules={[{ required: true }]}>
                    <Input type="number" step="0.0001" suffix={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {form.getFieldValue('rate_type') === 'percentage' ? '%' : 'CDF'}
                      </Text>
                    } />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </>
  )
}
