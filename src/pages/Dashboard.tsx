import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Row, Col, Card, Statistic, Table, Tag, Space, Typography, Spin,
  Empty, Badge as AntBadge,
} from 'antd'
import {
  TeamOutlined, TransactionOutlined, SafetyOutlined, ShopOutlined,
  RiseOutlined, WalletOutlined, CheckCircleOutlined, FileProtectOutlined,
  CustomerServiceOutlined, AuditOutlined, SettingOutlined, DollarOutlined,
} from '@ant-design/icons'
import { api } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/ui/Badge'
import { fmtMoney, fmtDateTime, TX_TYPE_LABELS } from '../lib/format'
import { getStoredUser } from '../lib/auth'
import type { AdminRole } from '../lib/auth'

const { Text, Title } = Typography

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color = '#E01E37', to,
}: {
  icon: React.ReactNode; label: string; value: string | number; color?: string; to?: string
}) {
  const inner = (
    <Card
      hoverable={!!to}
      style={{ borderRadius: 12 }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color, fontSize: 20 }}>{icon}</span>
        </div>
        <Statistic
          title={<Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>{label}</Text>}
          value={value}
          valueStyle={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}
        />
      </div>
    </Card>
  )
  return to ? <Link to={to} style={{ display: 'block' }}>{inner}</Link> : inner
}

// ── KYC item ──────────────────────────────────────────────────────────────────

function KycItem({ doc }: { doc: Record<string, unknown> }) {
  return (
    <Link to={`/kyc?doc=${doc.id}`}>
      <Card
        hoverable
        size="small"
        style={{ borderRadius: 10, marginBottom: 8 }}
        styles={{ body: { padding: '12px 14px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8, flexShrink: 0,
            background: '#FEF7E6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SafetyOutlined style={{ fontSize: 18, color: '#F59E0B' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 13 }}>
              {String(doc.type ?? '').replaceAll('_', ' ').toUpperCase()}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Soumis le {String(doc.submitted_at ?? '').substring(0, 10)}
            </Text>
          </div>
          <StatusBadge status="under_review" />
        </div>
      </Card>
    </Link>
  )
}

// ── Tx table ──────────────────────────────────────────────────────────────────

function TxTable({ txns }: { txns: Record<string, unknown>[] }) {
  const cols = [
    { title: 'Type',    dataIndex: 'type',       key: 'type',       render: (v: string) => TX_TYPE_LABELS[v] ?? v },
    { title: 'Montant', dataIndex: 'amount',     key: 'amount',     render: (_: any, r: any) => <Text strong>{fmtMoney(r.amount, r.currency)}</Text>, align: 'right' as const },
    { title: 'Statut',  dataIndex: 'status',     key: 'status',     render: (v: string) => <StatusBadge status={v} /> },
    { title: 'Date',    dataIndex: 'created_at', key: 'created_at', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text> },
  ]
  return (
    <Table
      dataSource={txns}
      columns={cols}
      rowKey="id"
      size="small"
      pagination={false}
      style={{ borderRadius: 0 }}
    />
  )
}

// ── Quick links ───────────────────────────────────────────────────────────────

function QuickLinks({ links }: { links: { path: string; icon: React.ReactNode; label: string; color: string }[] }) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>
        Accès rapide
      </Text>
      <Row gutter={[10, 10]}>
        {links.map(({ path, icon, label, color }) => (
          <Col key={path} xs={12} sm={8} md={6}>
            <Link to={path}>
              <Card hoverable style={{ borderRadius: 10 }} styles={{ body: { padding: '12px 14px' } }}>
                <Space>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color }}>{icon}</span>
                  </div>
                  <Text strong style={{ fontSize: 13 }}>{label}</Text>
                </Space>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  )
}

// ── Role banners ──────────────────────────────────────────────────────────────

function RoleBanner({ gradient, title, subtitle, icon }: { gradient: string; title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <Card style={{ background: gradient, border: 'none', borderRadius: 14 }} styles={{ body: { padding: '20px 24px' } }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {subtitle && <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, display: 'block', marginBottom: 4 }}>{subtitle}</Text>}
          <Title level={4} style={{ color: '#fff', margin: 0 }}>{title}</Title>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff' }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

// ── Role dashboards ───────────────────────────────────────────────────────────

function SuperAdminDashboard({ m, recentTx, kycQueue }: any) {
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={8} md={6}><StatCard icon={<TeamOutlined />}         label="Utilisateurs actifs"      value={m.active_users ?? '—'}       color="#0F62FE" to="/users" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<TransactionOutlined />}  label="Transactions aujourd'hui" value={m.transactions_today ?? '—'} color="#E01E37" to="/transactions" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<RiseOutlined />}         label="Volume du jour (CDF)"     value={m.volume_today ? fmtMoney(m.volume_today, 'CDF') : '—'} color="#10B981" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<ShopOutlined />}         label="Agents actifs"            value={m.active_agents ?? '—'}      color="#F59E0B" to="/agents" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<SafetyOutlined />}       label="KYC en attente"           value={m.kyc_pending_review ?? '—'} color="#EF4444" to="/kyc" /></Col>
      </Row>

      <Row gutter={20} className="dash-two-col">
        <Col flex="auto">
          <Card title="Dernières transactions" extra={<Link to="/transactions" style={{ fontSize: 13, fontWeight: 600 }}>Tout voir</Link>} style={{ borderRadius: 12 }}>
            {recentTx?.length > 0 ? <TxTable txns={recentTx} /> : <Empty description="Aucune transaction récente" />}
          </Card>
        </Col>
        <Col style={{ width: 360, flexShrink: 0 }}>
          <Card title="KYC en attente" extra={<Link to="/kyc" style={{ fontSize: 13, fontWeight: 600 }}>Voir tout</Link>} style={{ borderRadius: 12 }}>
            {kycQueue?.length === 0 ? (
              <Empty image={<CheckCircleOutlined style={{ fontSize: 40, color: '#10B981' }} />} description={<Text style={{ color: '#10B981' }}>File vide — à jour</Text>} />
            ) : (
              (kycQueue ?? []).slice(0, 5).map((doc: any) => <KycItem key={doc.id} doc={doc} />)
            )}
          </Card>
        </Col>
      </Row>

      <QuickLinks links={[
        { path: '/users',        icon: <TeamOutlined />,         label: 'Utilisateurs',    color: '#0F62FE' },
        { path: '/transactions', icon: <TransactionOutlined />,  label: 'Transactions',    color: '#E01E37' },
        { path: '/finance',      icon: <WalletOutlined />,       label: 'Caisse',          color: '#E01E37' },
        { path: '/kyc',          icon: <SafetyOutlined />,       label: 'File KYC',        color: '#F59E0B' },
        { path: '/agents',       icon: <ShopOutlined />,         label: 'Agents',          color: '#F59E0B' },
        { path: '/support',      icon: <CustomerServiceOutlined />, label: 'Support',       color: '#10B981' },
        { path: '/audit',        icon: <AuditOutlined />,        label: "Audit",           color: '#64748B' },
        { path: '/settings',     icon: <SettingOutlined />,      label: 'Paramètres',      color: '#6366F1' },
        { path: '/rates',        icon: <DollarOutlined />,       label: 'Taux',            color: '#E01E37' },
      ]} />
    </Space>
  )
}

function KycDashboard({ m, kycQueue }: any) {
  const pending = kycQueue?.length ?? 0
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <RoleBanner gradient="linear-gradient(135deg, #10B981, #059669)" title={pending === 0 ? 'File vide — à jour' : `${pending} document${pending > 1 ? 's' : ''} à examiner`} subtitle="Espace KYC" icon={<SafetyOutlined />} />
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={8}><StatCard icon={<SafetyOutlined />}  label="En attente"            value={pending}                color="#F59E0B" to="/kyc" /></Col>
        <Col xs={12} sm={8}><StatCard icon={<TeamOutlined />}    label="Utilisateurs inscrits" value={m?.active_users ?? '—'} color="#0F62FE" to="/users" /></Col>
        <Col xs={12} sm={8}><StatCard icon={<CheckCircleOutlined />} label="Vérifiés aujourd'hui" value="—"                  color="#10B981" /></Col>
      </Row>
      <Card title="Documents en attente" extra={<Link to="/kyc" style={{ fontWeight: 600 }}>File complète</Link>} style={{ borderRadius: 12 }}>
        {!kycQueue ? <Spin /> : pending === 0
          ? <Empty image={<CheckCircleOutlined style={{ fontSize: 40, color: '#10B981' }} />} description={<Text style={{ color: '#10B981' }}>Tout est à jour</Text>} />
          : kycQueue.map((doc: any) => <KycItem key={doc.id} doc={doc} />)
        }
      </Card>
    </Space>
  )
}

function SupportDashboard({ m }: any) {
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <RoleBanner gradient="linear-gradient(135deg, #F59E0B, #D97706)" title="Assistance aux utilisateurs" subtitle="Espace Support" icon={<CustomerServiceOutlined />} />
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={8}><StatCard icon={<CustomerServiceOutlined />} label="Tickets ouverts"       value="—"                      color="#F59E0B" to="/support" /></Col>
        <Col xs={12} sm={8}><StatCard icon={<TeamOutlined />}            label="Utilisateurs inscrits" value={m?.active_users ?? '—'} color="#0F62FE" to="/users" /></Col>
        <Col xs={12} sm={8}><StatCard icon={<TransactionOutlined />}     label="Transactions (lecture)" value={m?.transactions_today ?? '—'} color="#64748B" to="/transactions" /></Col>
      </Row>
      <QuickLinks links={[
        { path: '/support',      icon: <CustomerServiceOutlined />, label: 'Tickets',       color: '#F59E0B' },
        { path: '/users',        icon: <TeamOutlined />,            label: 'Utilisateurs',  color: '#0F62FE' },
        { path: '/transactions', icon: <TransactionOutlined />,     label: 'Transactions',  color: '#64748B' },
      ]} />
    </Space>
  )
}

function FinanceDashboard({ m, recentTx }: any) {
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <RoleBanner gradient="linear-gradient(135deg, #7C3AED, #5B21B6)" title={m?.volume_today ? fmtMoney(m.volume_today, 'CDF') : '—'} subtitle="Volume traité aujourd'hui" icon={<RiseOutlined />} />
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={8} md={6}><StatCard icon={<TransactionOutlined />} label="Transactions aujourd'hui" value={m?.transactions_today ?? '—'} color="#7C3AED" to="/transactions" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<RiseOutlined />}        label="Volume CDF"               value={m?.volume_today ? fmtMoney(m.volume_today, 'CDF') : '—'} color="#10B981" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<WalletOutlined />}      label="Caisse / Dépôts"          value="Voir" color="#E01E37" to="/finance" /></Col>
        <Col xs={12} sm={8} md={6}><StatCard icon={<DollarOutlined />}      label="Taux de change"           value="CDF/USD" color="#F59E0B" to="/rates" /></Col>
      </Row>
      <Card title="Transactions récentes" extra={<Link to="/transactions" style={{ color: '#7C3AED', fontWeight: 600 }}>Tout voir</Link>} style={{ borderRadius: 12 }}>
        {recentTx?.length > 0 ? <TxTable txns={recentTx} /> : <Empty description="Aucune transaction récente" />}
      </Card>
    </Space>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  usePageTitle('Tableau de bord', ['Admin', 'Tableau de bord'])
  const user = getStoredUser()
  const role: AdminRole = user?.role ?? 'support_agent'

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    refetchInterval: 30_000,
    throwOnError: false,
    retry: 1,
  })
  const { data: recentTx } = useQuery({
    queryKey: ['recent-tx'],
    queryFn: () => api.get('/admin/transactions', { params: { limit: 8 } }).then((r) => r.data.data),
    refetchInterval: 30_000,
    throwOnError: false,
    retry: 1,
    enabled: ['super_admin', 'admin', 'finance_officer'].includes(role),
  })
  const { data: kycQueue } = useQuery({
    queryKey: ['kyc-pending'],
    queryFn: () => api.get('/kyc/admin/queue').then((r) => r.data.data),
    throwOnError: false,
    retry: 1,
    enabled: ['super_admin', 'admin', 'kyc_reviewer'].includes(role),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>

  const m = metrics ?? {}
  if (role === 'kyc_reviewer')    return <KycDashboard     m={m} kycQueue={kycQueue} />
  if (role === 'support_agent')   return <SupportDashboard m={m} />
  if (role === 'finance_officer') return <FinanceDashboard m={m} recentTx={recentTx ?? []} />
  return <SuperAdminDashboard m={m} recentTx={recentTx ?? []} kycQueue={kycQueue ?? []} />
}
