import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Table, TableToolbar, FilterSelect, Column } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Textarea, Alert } from '../components/ui/Form'
import { fmtDateTime, fmtMoney, TX_TYPE_LABELS } from '../lib/format'
import { IconFreeze, IconApprove, IconWarning } from '../components/ui/Icon'
import { getStoredUser, can } from '../lib/auth'

// ── Constante : fenêtre de gel par défaut (jours). Peut être surchargée
// par le paramètre système "freeze_window_days" chargé depuis /admin/settings/general.
const DEFAULT_FREEZE_WINDOW_DAYS = 2

type Tx = {
  id: string; type: string; status: string; amount: string
  fee_amount: string; currency: string; provider?: string; created_at: string
}

export default function Transactions() {
  usePageTitle('Transactions', ['Admin', 'Transactions'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterUserId = searchParams.get('user') // vient de UserDetail → /transactions?user=ID
  const user = getStoredUser()
  const canFreeze = user ? can(user.role, 'transactions.freeze') : false

  const [typeFilter, setType]         = useState('')
  const [statusFilter, setStatus]     = useState('')

  // Freeze modal state
  const [freezeTarget, setFreeze]     = useState<Tx | null>(null)
  const [freezeReason, setReason]     = useState('')
  const [freezeError,  setFreezeErr]  = useState('')

  // Unfreeze modal state
  const [unfreezeTarget, setUnfreeze] = useState<Tx | null>(null)

  const [actionError, setActionError] = useState('')

  // Charger le paramètre système "freeze_window_days"
  const { data: generalSettings } = useQuery({
    queryKey: ['settings-general'],
    queryFn: () => api.get('/admin/settings/general').then(r => r.data.data).catch(() => null),
    staleTime: 5 * 60_000,
  })
  const freezeWindowDays: number = generalSettings?.freeze_window_days ?? DEFAULT_FREEZE_WINDOW_DAYS

  /** Retourne un message d'erreur si la transaction est hors de la fenêtre de gel, null sinon */
  function checkFreezeWindow(tx: Tx): string | null {
    const diffDays = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > freezeWindowDays) {
      return `Cette transaction a plus de ${freezeWindowDays} jour(s). Le gel n'est plus autorisé au-delà de cette fenêtre (configurable dans Paramètres → Général).`
    }
    return null
  }

  function openFreezeModal(tx: Tx) {
    setReason('')
    setActionError('')
    setFreezeErr(checkFreezeWindow(tx) ?? '')
    setFreeze(tx)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', typeFilter, statusFilter, filterUserId],
    queryFn: () => api.get('/admin/transactions', { params: {
      type:    typeFilter   || undefined,
      status:  statusFilter || undefined,
      user_id: filterUserId || undefined,
      limit: 100,
    }}).then((r) => r.data.data as Tx[]),
    throwOnError: false,
  })

  const freezeMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/admin/transactions/${id}/freeze`, null, { params: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setFreeze(null); setReason(''); setActionError('')
    },
    onError: (e) => setActionError(getErrorMessage(e)),
  })

  const unfreezeMut = useMutation({
    mutationFn: (id: string) =>
      api.put(`/admin/transactions/${id}/unfreeze`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setUnfreeze(null); setActionError('')
    },
    onError: (e) => setActionError(getErrorMessage(e)),
  })

  const columns: Column<Tx>[] = [
    {
      key: 'id', header: 'ID', width: 120,
      render: (t) => (
        <code style={{ fontSize: 11, color: '#64748B' }}>
          {t.id ? t.id.slice(0, 8) + '…' : '—'}
        </code>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (t) => TX_TYPE_LABELS[t.type] ?? t.type,
    },
    {
      key: 'amount', header: 'Montant', align: 'right',
      render: (t) => (
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
          {fmtMoney(t.amount, t.currency)}
        </span>
      ),
    },
    {
      key: 'fee_amount', header: 'Frais', align: 'right',
      render: (t) => (
        <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>
          {fmtMoney(t.fee_amount, t.currency)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Statut',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'provider', header: 'Fournisseur',
      render: (t) => t.provider ?? '—',
    },
    {
      key: 'created_at', header: 'Date', width: 150,
      render: (t) => (
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
          {fmtDateTime(t.created_at)}
        </span>
      ),
    },
    {
      key: 'actions', header: '', width: 130, align: 'right',
      render: (t) => {
        if (!canFreeze) return null
        if (t.status === 'completed' || t.status === 'pending') {
          return (
            <Button
              size="sm" variant="ghost"
              onClick={(e) => { e.stopPropagation(); openFreezeModal(t); }}
              icon={<IconFreeze size={13} />}
            >
              Geler
            </Button>
          )
        }
        if (t.status === 'frozen') {
          return (
            <Button
              size="sm" variant="secondary"
              onClick={(e) => { e.stopPropagation(); setUnfreeze(t); setActionError('') }}
              icon={<IconApprove size={13} />}
            >
              Dégeler
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <>
      <Card padding="0">
        <div style={{ padding: '20px 20px 0' }}>
          <TableToolbar>
            {filterUserId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: 'var(--secondary-light)', color: 'var(--secondary)',
                }}>
                  1 utilisateur
                </span>
                <button
                  onClick={() => navigate('/transactions')}
                  style={{ fontSize: 11, color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Voir toutes
                </button>
              </div>
            )}
            <FilterSelect
              value={typeFilter} onChange={setType}
              placeholder="Tous les types"
              options={Object.entries(TX_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <FilterSelect
              value={statusFilter} onChange={setStatus}
              placeholder="Tous les statuts"
              options={[
                { value: 'pending',   label: 'En attente' },
                { value: 'completed', label: 'Complétées' },
                { value: 'failed',    label: 'Échouées'   },
                { value: 'frozen',    label: 'Gelées'     },
                { value: 'cancelled', label: 'Annulées'   },
              ]}
            />
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>
              {data?.length ?? 0} transaction(s)
            </span>
          </TableToolbar>
        </div>
        <Table
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          emptyText="Aucune transaction trouvée"
        />
      </Card>

      {canFreeze && (
        <Modal
          open={!!freezeTarget}
          onClose={() => { setFreeze(null); setReason(''); setActionError(''); setFreezeErr('') }}
          title="Geler la transaction"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setFreeze(null); setReason('') }}>
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={freezeMut.isPending}
                disabled={!freezeReason.trim() || !!freezeError}
                onClick={() => freezeMut.mutate({ id: freezeTarget!.id, reason: freezeReason })}
              >
                Confirmer le gel
              </Button>
            </>
          }
        >
          {/* Avertissement hors délai — bloque l'action */}
          {freezeError ? (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#FEF2F2', border: '1.5px solid #EF444466',
              marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <IconWarning size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontWeight: 700, color: '#EF4444', fontSize: 13, marginBottom: 4 }}>
                  Gel impossible — fenêtre expirée
                </p>
                <p style={{ color: '#7F1D1D', fontSize: 13, lineHeight: 1.6 }}>
                  {freezeError}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Rappel transaction */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#FEF7E6', border: '1px solid #F59E0B44',
                marginBottom: 16,
              }}>
                <p style={{ fontWeight: 600, color: '#92400E', fontSize: 13, marginBottom: 4 }}>
                  ⚠️ Action irréversible à court terme
                </p>
                <p style={{ color: '#78350F', fontSize: 13, lineHeight: 1.6 }}>
                  Transaction{' '}
                  <strong style={{ fontFamily: 'monospace' }}>{freezeTarget?.id.slice(0, 8)}…</strong>
                  {' '}pour{' '}
                  <strong>{fmtMoney(freezeTarget?.amount ?? '0', freezeTarget?.currency ?? 'CDF')}</strong>
                  {' '}— créée le <strong>{fmtDateTime(freezeTarget?.created_at ?? '')}</strong>.
                </p>
                <p style={{ color: '#92400E', fontSize: 12, marginTop: 6 }}>
                  Le gel bloque immédiatement cette transaction. Elle pourra être dégelée ultérieurement.
                  Fenêtre autorisée : <strong>{freezeWindowDays} jour(s)</strong> après la création.
                </p>
              </div>

              {actionError && <Alert type="error" message={actionError} />}

              <Field label="Motif du gel" required>
                <Textarea
                  value={freezeReason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: suspicion de fraude, investigation AML, demande client…"
                />
              </Field>
            </>
          )}
        </Modal>
      )}

      {/* ── Unfreeze modal ── */}
      {canFreeze && (
        <Modal
          open={!!unfreezeTarget}
          onClose={() => { setUnfreeze(null); setActionError('') }}
          title="Dégeler la transaction"
          width={440}
          footer={
            <>
              <Button variant="ghost" onClick={() => setUnfreeze(null)}>
                Annuler
              </Button>
              <Button
                loading={unfreezeMut.isPending}
                onClick={() => unfreezeMut.mutate(unfreezeTarget!.id)}
              >
                Confirmer le dégel
              </Button>
            </>
          }
        >
          {actionError && <Alert type="error" message={actionError} />}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--warning-light)',
            border: '1px solid var(--warning)',
            marginBottom: 16,
          }}>
            <p style={{ fontWeight: 600, color: 'var(--warning)', fontSize: 13, marginBottom: 4 }}>
              Dégel de transaction
            </p>
            <p style={{ color: 'var(--gray-700)', fontSize: 13, lineHeight: 1.6 }}>
              Transaction{' '}
              <strong style={{ fontFamily: 'monospace' }}>{unfreezeTarget?.id.slice(0, 8)}…</strong>
              {' '}—{' '}
              <strong>{fmtMoney(unfreezeTarget?.amount ?? '0', unfreezeTarget?.currency ?? 'CDF')}</strong>
            </p>
          </div>
          <p style={{ color: 'var(--gray-600)', fontSize: 13, lineHeight: 1.6 }}>
            Cette action restaure la transaction à son statut précédent
            (<strong>completed</strong> ou <strong>pending</strong>)
            et supprime le marquage de gel. L'action est enregistrée dans le journal d'audit.
          </p>
        </Modal>
      )}
    </>
  )
}
