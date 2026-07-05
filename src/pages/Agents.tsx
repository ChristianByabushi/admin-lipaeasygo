import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card, CardHeader } from '../components/ui/Card'
import { Table, TableToolbar, FilterSelect, SearchInput, Column } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmModal, Modal } from '../components/ui/Modal'
import { Field, Input, Select, Textarea, Alert } from '../components/ui/Form'
import { fmtMoney, fmtDate, fmtDateTime } from '../lib/format'
import { IconApprove, IconSuspend, IconEdit, IconUser, IconWallet, IconMapPin, IconPhone, IconMail, IconKey } from '../components/ui/Icon'
import { getStoredUser, can } from '../lib/auth'
import { ACCOUNT_TYPE } from '../lib/accountTypes'

type Agent = {
  id: string; business_name?: string; entity_type: string; tier: string
  status: string; float_balance: string; float_currency: string
  phone_number: string; address?: string; latitude?: number; longitude?: number
  email?: string; kyc_verified?: boolean; approved_at?: string
  suspension_reason?: string; created_at?: string; float_max_limit?: string
  float_alert_threshold?: string; user_id?: string
  user?: {
    id: string; first_name: string; last_name: string
    phone_number: string; email?: string; kyc_status: string
    kyc_tier: number; avatar_url?: string; status: string
  }
}

const ENTITY_OPTIONS = [
  { value: 'individual', label: 'Particulier' },
  { value: 'business',   label: 'Entreprise'  },
]
const TIER_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'super', label: 'Super' },
]

// ── Panneau détail agent ──────────────────────────────────────────────────────
function AgentDetail({ agent, onClose, onRefresh }: {
  agent: Agent; onClose: () => void; onRefresh: () => void
}) {
  const qc = useQueryClient()
  const adminUser = getStoredUser()
  const canManage = adminUser ? can(adminUser.role, 'agents.approve') : false

  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [newPassword, setNewPassword]   = useState('')
  const [pwdError, setPwdError]         = useState('')

  // Validation force mot de passe (côté client, miroir du backend)
  function validatePassword(p: string): string {
    if (p.length < 8) return 'Minimum 8 caractères.'
    if (!/[A-Z]/.test(p)) return 'Au moins une majuscule.'
    if (!/[a-z]/.test(p)) return 'Au moins une minuscule.'
    if (!/\d/.test(p)) return 'Au moins un chiffre.'
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/\\`~"£€]/.test(p)) return 'Au moins un caractère spécial.'
    return ''
  }

  // Charger le profil complet depuis le backend
  const { data: profile, isLoading } = useQuery({
    queryKey: ['agent-profile', agent.id],
    queryFn: () => api.get(`/agents/admin/${agent.id}/profile`).then(r => r.data.data as Agent),
  })

  const a = profile ?? agent

  const [form, setForm] = useState({
    business_name: a.business_name ?? '',
    entity_type:   a.entity_type   ?? 'individual',
    tier:          a.tier          ?? 'basic',
    phone_number:  a.phone_number  ?? '',
    email:         a.email         ?? '',
    address:       a.address       ?? '',
    photo_url:     a.user?.avatar_url ?? '',
    float_max_limit:       a.float_max_limit       ?? '',
    float_alert_threshold: a.float_alert_threshold ?? '',
  })

  // Sync form quand le profil arrive — dépend de profile?.id pour éviter les boucles
  React.useEffect(() => {
    if (!profile) return
    setForm({
      business_name: profile.business_name ?? '',
      entity_type:   profile.entity_type   ?? 'individual',
      tier:          profile.tier          ?? 'basic',
      phone_number:  profile.phone_number  ?? '',
      email:         profile.email         ?? '',
      address:       profile.address       ?? '',
      photo_url:     profile.user?.avatar_url ?? '',
      float_max_limit:       profile.float_max_limit       ?? '',
      float_alert_threshold: profile.float_alert_threshold ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const saveMut = useMutation({
    mutationFn: () => api.patch(`/agents/admin/${agent.id}/profile`, {
      business_name:         form.business_name  || undefined,
      entity_type:           form.entity_type    || undefined,
      tier:                  form.tier           || undefined,
      phone_number:          form.phone_number   || undefined,
      email:                 form.email          || undefined,
      address:               form.address        || undefined,
      photo_url:             form.photo_url      || undefined,
      float_max_limit:       form.float_max_limit       ? parseFloat(form.float_max_limit)       : undefined,
      float_alert_threshold: form.float_alert_threshold ? parseFloat(form.float_alert_threshold) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-profile', agent.id] })
      qc.invalidateQueries({ queryKey: ['agents'] })
      setEditing(false); setSaveError('')
      onRefresh()
    },
    onError: (e) => setSaveError(getErrorMessage(e)),
  })

  const pwdMut = useMutation({
    mutationFn: () => api.patch(`/agents/admin/${agent.id}/profile`, { new_password: newPassword }),
    onSuccess: () => { setShowPwdModal(false); setNewPassword(''); setPwdError('') },
    onError: (e) => setPwdError(getErrorMessage(e)),
  })

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Chargement…</div>
  )

  const user          = a.user
  const resolvedUserId = a.user_id ?? a.user?.id ?? agent.user_id
  const initials      = user ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── En-tête profil — couleur ambre agent ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 20,
        padding: '20px 24px',
        background: `linear-gradient(135deg, ${ACCOUNT_TYPE.agent.color}22 0%, ${ACCOUNT_TYPE.agent.color}10 100%)`,
        border: `1px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {form.photo_url ? (
            <img
              src={form.photo_url}
              alt={a.business_name ?? initials}
              style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover',
                border: `3px solid ${ACCOUNT_TYPE.agent.colorBorder}` }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 12, flexShrink: 0,
              background: ACCOUNT_TYPE.agent.colorLight,
              border: `3px solid ${ACCOUNT_TYPE.agent.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: ACCOUNT_TYPE.agent.color, fontWeight: 800, fontSize: 24,
            }}>
              {initials}
            </div>
          )}
        </div>
        {/* Infos */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 5,
              background: ACCOUNT_TYPE.agent.color, fontSize: 11,
            }}>🏪</span>
            {a.business_name ?? (user ? `${user.first_name} ${user.last_name}` : 'Agent')}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
            {a.phone_number} {a.email ? `· ${a.email}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={a.status} />
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: ACCOUNT_TYPE.agent.color,
              color: '#fff',
            }}>
              {a.tier === 'super' ? '⭐ Super' : 'Basic'}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: ACCOUNT_TYPE.agent.colorLight,
              color: ACCOUNT_TYPE.agent.color,
              border: `1px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
            }}>
              {a.entity_type === 'business' ? 'Entreprise' : 'Particulier'}
            </span>
          </div>
        </div>
        {/* Float */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Float disponible</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: ACCOUNT_TYPE.agent.color }}>
            {fmtMoney(a.float_balance, a.float_currency)}
          </div>
        </div>
      </div>

      {/* ── Corps : infos + formulaire ── */}
      {editing ? (
        <Card>
          <CardHeader title="Modifier le profil" />
          {saveError && <Alert type="error" message={saveError} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Nom commercial">
              <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} placeholder="Ex: KABILA CASH" />
            </Field>
            <Field label="Type d'entité">
              <Select value={form.entity_type} onChange={e => setForm({...form, entity_type: e.target.value})} options={ENTITY_OPTIONS} />
            </Field>
            <Field label="Tier">
              <Select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} options={TIER_OPTIONS} />
            </Field>
            <Field label="Téléphone">
              <Input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} placeholder="+243…" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="agent@example.com" />
            </Field>
            <Field label="URL photo de profil" hint="Lien direct vers l'image (HTTPS)">
              <Input value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} placeholder="https://…/photo.jpg" />
            </Field>
          </div>
          <Field label="Adresse complète">
            <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Av. Kasai 12, Gombe, Kinshasa" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Plafond float (CDF)" hint="Montant maximum autorisé">
              <Input type="number" value={form.float_max_limit} onChange={e => setForm({...form, float_max_limit: e.target.value})} placeholder="500000" />
            </Field>
            <Field label="Seuil d'alerte float" hint="Alerte si balance tombe en-dessous">
              <Input type="number" value={form.float_alert_threshold} onChange={e => setForm({...form, float_alert_threshold: e.target.value})} placeholder="50000" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setSaveError('') }}>Annuler</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Informations"
            action={canManage ? (
              <Button size="sm" variant="outline" icon={<IconEdit size={13} />}
                onClick={() => setEditing(true)}>
                Modifier
              </Button>
            ) : undefined}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { icon: <IconUser size={14} />,    label: 'Utilisateur lié',  value: user ? `${user.first_name} ${user.last_name}` : '—' },
              { icon: <IconPhone size={14} />,   label: 'Téléphone',        value: a.phone_number },
              { icon: <IconMail size={14} />,    label: 'E-mail',           value: a.email ?? '—' },
              { icon: <IconMapPin size={14} />,  label: 'Adresse',          value: a.address ?? '—' },
              { icon: <IconWallet size={14} />,  label: 'Plafond float',    value: fmtMoney(a.float_max_limit ?? '0', a.float_currency) },
              { icon: <IconWallet size={14} />,  label: 'Seuil alerte',     value: fmtMoney(a.float_alert_threshold ?? '0', a.float_currency) },
              { icon: null, label: 'KYC vérifié',      value: a.kyc_verified ? 'Oui' : 'Non' },
              { icon: null, label: 'Approuvé le',      value: a.approved_at ? fmtDate(a.approved_at) : '—' },
              { icon: null, label: 'Inscrit le',       value: a.created_at  ? fmtDate(a.created_at)  : '—' },
              { icon: null, label: 'Motif suspension', value: a.suspension_reason ?? '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '9px 0', borderBottom: '1px solid var(--gray-50)', fontSize: 13,
              }}>
                {icon && <span style={{ color: 'var(--gray-400)', marginTop: 1, flexShrink: 0 }}>{icon}</span>}
                <span style={{ color: 'var(--gray-500)', minWidth: 140, flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Réinitialisation mot de passe ── */}
      {canManage && resolvedUserId && (
        <Card>
          <CardHeader title="Sécurité" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Mot de passe de l'agent</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                Réinitialiser le mot de passe d'accès de l'agent (portail web / app agent).
              </div>
            </div>
            <Button
              size="sm" variant="outline"
              icon={<IconKey size={13} />}
              onClick={() => { setShowPwdModal(true); setNewPassword(''); setPwdError('') }}
            >
              Réinitialiser mot de passe
            </Button>
          </div>
        </Card>
      )}

      {/* Modal mot de passe */}
      <Modal
        open={showPwdModal}
        onClose={() => { setShowPwdModal(false); setNewPassword(''); setPwdError('') }}
        title="Réinitialiser le mot de passe de l'agent"
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPwdModal(false)}>Annuler</Button>
            <Button
              loading={pwdMut.isPending}
              disabled={!!validatePassword(newPassword)}
              onClick={() => {
                const err = validatePassword(newPassword)
                if (err) { setPwdError(err); return }
                pwdMut.mutate()
              }}
            >
              Confirmer
            </Button>
          </>
        }
      >
        {pwdError && <Alert type="error" message={pwdError} />}
        <p style={{ color: 'var(--gray-600)', marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
          Le nouveau mot de passe devra être communiqué à l'agent de manière sécurisée.
          Exigences : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
        </p>
        <Field label="Nouveau mot de passe" required
          error={newPassword && validatePassword(newPassword) ? validatePassword(newPassword) : undefined}>
          <Input
            type="password"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setPwdError('') }}
            placeholder="••••••••"
            autoComplete="new-password"
            hasError={!!(newPassword && validatePassword(newPassword))}
          />
        </Field>
      </Modal>
    </div>
  )
}

// ── Page principale Agents ────────────────────────────────────────────────────
export default function Agents() {
  usePageTitle('Agents-Terrain', ['Admin', 'Agents-Terrain'])
  const qc = useQueryClient()
  const adminUser = getStoredUser()
  // admin et super_admin peuvent gérer les agents-terrain
  const canManage = adminUser ? can(adminUser.role, 'agents.approve') : false

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [tierFilter, setTier]       = useState('')
  const [selected, setSelected]     = useState<Agent | null>(null)
  const [approveTarget, setApprove] = useState<Agent | null>(null)
  const [suspendTarget, setSuspend] = useState<Agent | null>(null)
  const [suspendReason, setReason]  = useState('')
  const [actionError, setError]     = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents', statusFilter, tierFilter],
    queryFn: () => api.get('/agents/admin/list', { params: {
      status: statusFilter || undefined,
      tier: tierFilter || undefined,
      limit: 100,
    }}).then(r => r.data.data as Agent[]),
  })

  const filtered = (data ?? []).filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.business_name ?? '').toLowerCase().includes(q)
      || a.phone_number.includes(q)
      || (a.address ?? '').toLowerCase().includes(q)
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => api.put(`/agents/admin/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setApprove(null); setError('') },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/agents/admin/${id}/suspend`, null, { params: { reason } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setSuspend(null); setReason(''); setError('') },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const columns: Column<Agent>[] = [
    {
      key: 'name', header: 'Agent', width: 240,
      render: (a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar — ambre = agent de proximité */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: ACCOUNT_TYPE.agent.colorLight,
            border: `2px solid ${ACCOUNT_TYPE.agent.colorBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: ACCOUNT_TYPE.agent.color,
          }}>
            {(a.business_name?.[0] ?? a.phone_number[0] ?? 'A').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>
              {a.business_name ?? 'Agent particulier'}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: ACCOUNT_TYPE.agent.color, flexShrink: 0,
              }} />
              {a.phone_number}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'tier',   header: 'Tier',   width: 80,  render: (a) => <StatusBadge status={a.tier} /> },
    {
      key: 'float_balance', header: 'Float', align: 'right',
      render: (a) => <span style={{ fontWeight: 600 }}>{fmtMoney(a.float_balance, a.float_currency)}</span>,
    },
    { key: 'address', header: 'Adresse', render: (a) => a.address ?? '—' },
    { key: 'status', header: 'Statut', render: (a) => {
      if (a.status !== 'pending') return <StatusBadge status={a.status} />
      // Badge pending avec tooltip informatif au hover
      return (
        <div style={{ position: 'relative', display: 'inline-block' }} className="pending-tooltip-wrap">
          <StatusBadge status="pending" />
          <div className="pending-tooltip">
            <strong>En attente d'approbation</strong>
            <br />
            {canManage
              ? 'Cliquez sur "Approuver" pour activer cet agent-terrain.'
              : 'Contactez un administrateur pour approuver ce compte.'}
          </div>
        </div>
      )
    }},
    {
      key: 'actions', header: '', width: 200, align: 'right',
      render: (a) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="outline"
            onClick={(e) => { e.stopPropagation(); setSelected(a) }}>
            Voir profil
          </Button>
          {canManage && a.status === 'pending' && (
            <Button size="sm" variant="primary"
              onClick={(e) => { e.stopPropagation(); setApprove(a) }}
              icon={<IconApprove size={13} />}>
              Approuver
            </Button>
          )}
          {canManage && a.status === 'active' && (
            <Button size="sm" variant="danger"
              onClick={(e) => { e.stopPropagation(); setSuspend(a) }}
              icon={<IconSuspend size={13} />}>
              Suspendre
            </Button>
          )}
        </div>
      ),
    },
  ]

  // Vue liste ou vue détail
  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--primary)', fontSize: 13, fontWeight: 500,
            marginBottom: 20, cursor: 'pointer', background: 'none', border: 'none',
          }}
        >
          ← Retour à la liste des agents
        </button>
        <AgentDetail
          agent={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { refetch(); }}
        />
      </div>
    )
  }

  return (
    <>
      <Card padding="0">
        <div style={{ padding: '20px 20px 0' }}>
          <TableToolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, adresse…" />
            <FilterSelect value={statusFilter} onChange={setStatus} placeholder="Tous les statuts"
              options={[
                { value: 'pending',   label: '⏳ En attente d\'approbation' },
                { value: 'active',    label: '✅ Actifs'     },
                { value: 'suspended', label: '🚫 Suspendus'  },
                { value: 'rejected',  label: '❌ Rejetés'    },
              ]}
            />
            <FilterSelect value={tierFilter} onChange={setTier} placeholder="Tous les tiers"
              options={[
                { value: 'basic', label: 'Basic' },
                { value: 'super', label: 'Super'  },
              ]}
            />
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>
              {filtered.length} agent(s)
            </span>
          </TableToolbar>
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyText="Aucun agent trouvé"
          onRowClick={(a) => setSelected(a)}
        />
      </Card>

      {canManage && actionError && approveTarget && <Alert type="error" message={actionError} />}
      {canManage && (
        <ConfirmModal
          open={!!approveTarget}
          onClose={() => { setApprove(null); setError('') }}
          onConfirm={() => approveMut.mutate(approveTarget!.id)}
          loading={approveMut.isPending}
          title="Approuver l'agent-terrain"
          message={`Activer le compte de "${approveTarget?.business_name ?? approveTarget?.phone_number}" comme agent-terrain ? L'agent recevra une notification et pourra commencer à opérer.`}
        />
      )}
      {canManage && (
        <Modal
          open={!!suspendTarget}
          onClose={() => { setSuspend(null); setReason(''); setError('') }}
          title={`Suspendre l'agent ${suspendTarget?.business_name ?? suspendTarget?.phone_number}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSuspend(null)}>Annuler</Button>
              <Button variant="danger" loading={suspendMut.isPending}
                disabled={!suspendReason.trim()}
                onClick={() => suspendMut.mutate({ id: suspendTarget!.id, reason: suspendReason })}>
                Confirmer
              </Button>
            </>
          }
        >
          {actionError && <Alert type="error" message={actionError} />}
          <Field label="Motif de suspension" required>
            <Textarea value={suspendReason} onChange={e => setReason(e.target.value)} placeholder="Motif…" />
          </Field>
        </Modal>
      )}
    </>
  )
}
