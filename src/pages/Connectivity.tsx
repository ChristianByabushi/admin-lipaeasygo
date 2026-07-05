import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Card, Button, Progress, Tag, Typography, Space, Switch, Tooltip,
} from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'
import { usePageTitle } from '../components/layout/AppLayout'

const { Text, Title, Paragraph } = Typography

type ServiceStatus = 'checking' | 'ok' | 'slow' | 'error' | 'idle'

interface ServiceResult {
  name: string
  url: string
  description: string
  status: ServiceStatus
  latency: number | null
  error: string | null
  checkedAt: Date | null
}

const BASE = '/api/v1'
const SLOW_MS = 800

/**
 * Chaque service FastAPI expose GET /{prefix}/health via son router.
 * Via nginx : /api/v1/auth/health → auth:8000/api/v1/auth/health → 200
 * Routes publiques, sans authentification.
 */
const SERVICES: Omit<ServiceResult, 'status' | 'latency' | 'error' | 'checkedAt'>[] = [
  { name: 'Gateway (nginx)', url: `${BASE}/health`,              description: 'Point d\'entrée nginx' },
  { name: 'Auth',            url: `${BASE}/auth/health`,         description: 'Authentification & sessions' },
  { name: 'Admin',           url: `${BASE}/admin/health`,        description: 'Portail admin, utilisateurs, audit' },
  { name: 'Wallet',          url: `${BASE}/wallets/health`,      description: 'Portefeuilles & soldes' },
  { name: 'Transaction',     url: `${BASE}/transactions/health`, description: 'P2P, topup, cashout' },
  { name: 'Finance',         url: `${BASE}/finance/health`,      description: 'Caisse, dépôts agents' },
  { name: 'KYC',             url: `${BASE}/kyc/health`,          description: 'Vérification d\'identité' },
  { name: 'Agent',           url: `${BASE}/agents/health`,       description: 'Comptes agents, float' },
  { name: 'Support',         url: `${BASE}/support/health`,      description: 'Tickets support client' },
  { name: 'Exchange Rate',   url: `${BASE}/rates/health`,        description: 'Taux de change CDF/USD' },
]

async function checkService(
  svc: Omit<ServiceResult, 'status' | 'latency' | 'error' | 'checkedAt'>
): Promise<ServiceResult> {
  const t0 = performance.now()
  try {
    await axios.get(svc.url, { timeout: 5000 })
    const latency = Math.round(performance.now() - t0)
    return { ...svc, status: latency > SLOW_MS ? 'slow' : 'ok', latency, error: null, checkedAt: new Date() }
  } catch (err: any) {
    const latency = Math.round(performance.now() - t0)
    const httpCode = err?.response?.status
    const msg = httpCode
      ? `HTTP ${httpCode}`
      : err?.code === 'ECONNABORTED'
      ? 'Timeout (> 5 s) — service surchargé ou arrêté'
      : err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')
      ? 'Erreur réseau — Docker Desktop démarré ?'
      : (err?.message ?? 'Erreur inconnue')
    return { ...svc, status: 'error', latency, error: msg, checkedAt: new Date() }
  }
}

const STATUS_COLORS: Record<ServiceStatus, string> = {
  idle: 'default', checking: 'processing', ok: 'success', slow: 'warning', error: 'error',
}
const STATUS_LABELS: Record<ServiceStatus, string> = {
  idle: '—', checking: 'Test…', ok: 'OK', slow: 'Lent', error: 'Erreur',
}

export default function Connectivity() {
  usePageTitle('Connectivité', ['Admin', 'Connectivité'])

  const [results, setResults] = useState<ServiceResult[]>(
    SERVICES.map(s => ({ ...s, status: 'idle', latency: null, error: null, checkedAt: null }))
  )
  const [running,     setRunning]     = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runAll = useCallback(async () => {
    setRunning(true)
    setResults(prev => prev.map(r => ({ ...r, status: 'checking' as ServiceStatus })))
    await Promise.allSettled(
      SERVICES.map((svc, i) =>
        checkService(svc).then(res =>
          setResults(prev => { const n = [...prev]; n[i] = res; return n })
        )
      )
    )
    setRunning(false)
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      runAll()
      intervalRef.current = setInterval(runAll, 30_000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, runAll])

  const okCount    = results.filter(r => r.status === 'ok').length
  const slowCount  = results.filter(r => r.status === 'slow').length
  const errorCount = results.filter(r => r.status === 'error').length
  const checked    = results.filter(r => r.status !== 'idle' && r.status !== 'checking').length

  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Tests de connectivité</Title>
            <Text type="secondary">Vérifie l'état de chaque microservice Docker via la gateway nginx.</Text>
          </div>
          {checked > 0 && (
            <Space size="large">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{okCount}</div>
                <Text style={{ fontSize: 10, color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>OK</Text>
              </div>
              {slowCount > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>{slowCount}</div>
                  <Text style={{ fontSize: 10, color: '#F59E0B', textTransform: 'uppercase', fontWeight: 700 }}>Lents</Text>
                </div>
              )}
              {errorCount > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>{errorCount}</div>
                  <Text style={{ fontSize: 10, color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>Erreurs</Text>
                </div>
              )}
            </Space>
          )}
        </div>

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" loading={running} icon={<PlayCircleOutlined />} onClick={runAll}>
            {running ? 'Test en cours…' : 'Tester maintenant'}
          </Button>
          <Space>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren={<PauseCircleOutlined />}
              unCheckedChildren={<ReloadOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 13 }}>Suivi auto (30 s)</Text>
          </Space>
        </Space>
      </Card>

      {/* ── Results ── */}
      <Card title="Services" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        {results.map((r, i) => (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 20px',
            borderBottom: i < results.length - 1 ? '1px solid #F8FAFC' : 'none',
            background: r.status === 'error' ? '#FEF2F2' : r.status === 'slow' ? '#FFFBEB' : '#fff',
          }}>

            <Tag
              color={STATUS_COLORS[r.status]}
              style={{ minWidth: 72, textAlign: 'center', fontWeight: 600 }}
            >
              {STATUS_LABELS[r.status]}
            </Tag>

            <div style={{ minWidth: 130, flexShrink: 0 }}>
              <Text strong style={{ fontSize: 14 }}>{r.name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text>
            </div>

            <Text
              type="secondary"
              style={{ fontSize: 10, flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {r.url}
            </Text>

            <div style={{ minWidth: 220, flexShrink: 0 }}>
              {(r.status === 'ok' || r.status === 'slow') && r.latency !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Progress
                    percent={Math.min((r.latency / 1500) * 100, 100)}
                    strokeColor={r.latency < 300 ? '#10B981' : r.latency < 800 ? '#F59E0B' : '#EF4444'}
                    showInfo={false}
                    size="small"
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <Text
                    strong
                    style={{ fontSize: 12, minWidth: 56, textAlign: 'right', color: r.latency < 300 ? '#10B981' : r.latency < 800 ? '#F59E0B' : '#EF4444' }}
                  >
                    {r.latency} ms
                  </Text>
                </div>
              )}
              {r.status === 'error' && (
                <Tooltip title={r.error}>
                  <Text type="danger" style={{ fontSize: 12 }} ellipsis>{r.error}</Text>
                </Tooltip>
              )}
              {r.status === 'checking' && (
                <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>Vérification…</Text>
              )}
            </div>

            <Text type="secondary" style={{ fontSize: 10, minWidth: 56, textAlign: 'right', flexShrink: 0 }}>
              {r.checkedAt?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </div>
        ))}
      </Card>

      {/* ── Note ── */}
      <Card style={{ borderRadius: 12 }}>
        <Paragraph style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.7 }}>
          <strong>Note :</strong> Les appels passent par le proxy Vite → gateway nginx (port 3000).
          Un service en <Text type="danger" strong>Erreur</Text> peut indiquer un container arrêté —
          relancez avec <Text code>docker compose up -d</Text> depuis le dossier <Text code>backend</Text>.
          Un service <Text style={{ color: '#F59E0B' }} strong>Lent</Text> (&gt;{SLOW_MS} ms) peut
          indiquer une surcharge ou une migration en cours.
          Pour redémarrer un seul service : <Text code>docker restart backend-&lt;service&gt;-1</Text>.
        </Paragraph>
      </Card>
    </div>
  )
}
