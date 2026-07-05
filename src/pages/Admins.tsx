import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card, CardHeader } from '../components/ui/Card'
import { Table, Column } from '../components/ui/Table'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Field, Input, Select, Alert } from '../components/ui/Form'
import { ROLE_LABELS, ROLE_COLORS, AdminRole, getStoredUser } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import { IconCheck, IconPlus, IconEdit, IconSuspend, IconApprove } from '../components/ui/Icon'

type Admin = {
  id: string; email: string; first_name: string; last_name: string
  role: AdminRole; is_active: boolean; last_login_at?: string
}

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin'              },
  { value: 'finance_officer', label: 'Responsable Financier' },
  { value: 'kyc_reviewer',    label: 'Réviseur KYC'       },
  { value: 'support_agent',   label: 'Agent Support'      },
]

export default function Admins() {
  usePageTitle('Agents spéciaux', ['Admin', 'Agents spéciaux'])
  const qc = useQueryClient()
  const me = getStoredUser()
  const isSuperAdmin = me?.role === 'super_admin'
  const isAdmin      = me?.role === 'admin'
  const canManage    = isSuperAdmin || isAdmin

  // Rôles créables selon qui est connecté
  const ROLE_OPTIONS_SUPER = [
    { value: 'admin',           label: 'Admin'               },
    { value: 'finance_officer', label: 'Responsable Financier' },
    { value: 'kyc_reviewer',    label: 'Réviseur KYC'        },
    { value: 'support_agent',   label: 'Agent Support'       },
  ]
  const ROLE_OPTIONS_ADMIN = [
    { value: 'finance_officer', label: 'Responsable Financier' },
    { value: 'kyc_reviewer',    label: 'Réviseur KYC'        },
    { value: 'support_agent',   label: 'Agent Support'       },
  ]
  const ROLE_OPTIONS = isSuperAdmin ? ROLE_OPTIONS_SUPER : ROLE_OPTIONS_ADMIN

  // ── État modaux ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate]   = useState(false)
  const [editTarget, setEditTarget]   = useState<Admin | null>(null)
  const [deactTarget, setDeact]       = useState<Admin | null>(null)
  const [reactivateTarget, setReact]  = useState<Admin | null>(null)
  const [formError, setFormError]     = useState('')

  const emptyForm = { email: '', first_name: '', last_name: '', role: 'admin' as AdminRole, password: '', password2: '' }
  const [form, setForm]   = useState(emptyForm)
  const [editForm, setEF] = useState({ first_name: '', last_name: '', role: 'admin' as AdminRole, password: '' })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/admin/admins').then((r) => r.data.data as Admin[]),
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => api.post('/admin/admins', {
      email:      form.email.trim(),
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      role:       form.role,
      password:   form.password,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
      setShowCreate(false); setForm(emptyForm); setFormError('')
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        first_name: editForm.first_name || undefined,
        last_name:  editForm.last_name  || undefined,
        role:       editForm.role,
      }
      if (editForm.password) body.password = editForm.password
      return api.patch(`/admin/admins/${editTarget!.id}`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
      setEditTarget(null); setFormError('')
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); setDeact(null) },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/admins/${id}`, { is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); setReact(null) },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: Column<Admin>[] = [
    {
      key: 'name', header: 'Administrateur', width: 240,
      render: (a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: ROLE_COLORS[a.role] + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: ROLE_COLORS[a.role],
          }}>
            {(a.first_name?.[0] ?? '').toUpperCase()}{(a.last_name?.[0] ?? '').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{a.first_name} {a.last_name}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{a.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Rôle',
      render: (a) => <Badge label={ROLE_LABELS[a.role]} color={ROLE_COLORS[a.role]} bg={ROLE_COLORS[a.role] + '18'} />,
    },
    {
      key: 'is_active', header: 'Statut',
      render: (a) => <StatusBadge status={a.is_active ? 'active' : 'suspended'} />,
    },
    {
      key: 'last_login_at', header: 'Dernière connexion',
      render: (a) => a.last_login_at
        ? fmtDateTime(a.last_login_at)
        : <span style={{ color: 'var(--gray-400)' }}>Jamais</span>,
    },
    {
      key: 'actions', header: '', width: 180, align: 'right',
      render: (a) => {
        if (!canManage) return null
        // Un admin ne peut pas toucher super_admin ni un autre admin
        const canAct = isSuperAdmin
          ? a.id !== me?.id
          : ['kyc_reviewer', 'support_agent', 'finance_officer'].includes(a.role)
        if (!canAct) return null
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" icon={<IconEdit size={12} />}
              onClick={(e) => {
                e.stopPropagation()
                setEditTarget(a)
                setEF({ first_name: a.first_name, last_name: a.last_name, role: a.role, password: '' })
                setFormError('')
              }}>
              Modifier
            </Button>
            {a.is_active ? (
              <Button size="sm" variant="danger" icon={<IconSuspend size={12} />}
                onClick={(e) => { e.stopPropagation(); setDeact(a); setFormError('') }}>
                Désactiver
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<IconApprove size={12} />}
                onClick={(e) => { e.stopPropagation(); setReact(a) }}>
                Réactiver
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Matrice des permissions ── */}
      <Card>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Matrice des permissions — Agents spéciaux</h3>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 14 }}>
          Les <strong>agents spéciaux</strong> sont les membres de l'équipe interne (admin, financier, support, KYC).
          Les <strong>agents-terrain</strong> sont les revendeurs physiques gérés dans la section "Agents-Terrain".
          Les <strong>clients</strong> sont les utilisateurs finaux de l'application mobile.
        </p>
        <div style={{ overflowX: 'auto' } as React.CSSProperties}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-100)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', width: 220 }}>Permission</th>
                {(['super_admin','admin','finance_officer','kyc_reviewer','support_agent'] as AdminRole[]).map((r) => (
                  <th key={r} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: ROLE_COLORS[r] }}>
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Lire les clients',             true,  true,  true,  true,  true  ],
                ['Suspendre un client',          true,  true,  false, false, false ],
                ['Lire les transactions',        true,  true,  true,  false, true  ],
                ['Geler une transaction',        true,  true,  true,  false, false ],
                ['Révision KYC',                 true,  true,  false, true,  false ],
                ['Approuver un agent-terrain',   true,  true,  false, false, false ],
                ['Lire les agents-terrain',      true,  true,  true,  false, false ],
                ['Configurer frais et limites',  true,  false, true,  false, false ],
                ['Taux de change',               true,  false, true,  false, false ],
                ['Répondre aux tickets',         true,  true,  false, false, true  ],
                ["Journal d'audit",              true,  true,  false, false, false ],
                ['Gérer les agents spéciaux',    true,  true,  false, false, false ],
              ].map(([label, ...vals]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--gray-700)', fontWeight: 500 }}>{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ padding: '9px 12px', textAlign: 'center' }}>
                      {v
                        ? <IconCheck size={15} color="var(--success)" />
                        : <span style={{ color: 'var(--gray-300)', fontSize: 14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Liste des administrateurs ── */}
      <Card padding="0">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Équipe — Agents spéciaux</h3>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
              {canManage
                ? isSuperAdmin
                  ? 'Gérez tous les comptes d\'agents spéciaux (admin, financier, KYC, support).'
                  : 'Gérez les comptes réviseur KYC, agent support et responsable financier.'
                : 'Accès en lecture seule pour votre rôle.'}
            </p>
          </div>
          {canManage && (
            <Button size="sm" icon={<IconPlus size={13} />}
              onClick={() => { setShowCreate(true); setForm({...emptyForm, role: ROLE_OPTIONS[0].value as AdminRole}); setFormError('') }}>
              Nouvel agent spécial
            </Button>
          )}
        </div>
        <Table
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          emptyText="Aucun administrateur"
        />
      </Card>

      {/* ── Modal : Créer un admin ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setFormError('') }}
        title="Créer un compte agent spécial"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button
              loading={createMut.isPending}
              disabled={
                !form.email.trim() || !form.first_name.trim() || !form.last_name.trim() ||
                form.password.length < 8 || form.password !== form.password2
              }
              onClick={() => createMut.mutate()}
            >
              Créer le compte
            </Button>
          </>
        }
      >
        {formError && <Alert type="error" message={formError} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom" required>
            <Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="Jean" />
          </Field>
          <Field label="Nom" required>
            <Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Kabila" />
          </Field>
        </div>
        <Field label="Adresse e-mail" required>
          <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@lipaeasygo.com" />
        </Field>
        <Field label="Rôle" required>
          <Select value={form.role} onChange={e => setForm({...form, role: e.target.value as AdminRole})} options={ROLE_OPTIONS} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Mot de passe" required hint="Minimum 8 caractères">
            <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
          </Field>
          <Field label="Confirmer" required error={form.password2 && form.password !== form.password2 ? 'Ne correspond pas' : undefined}>
            <Input type="password" value={form.password2} onChange={e => setForm({...form, password2: e.target.value})} placeholder="••••••••"
              hasError={!!(form.password2 && form.password !== form.password2)} />
          </Field>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--secondary-light)', fontSize: 12, color: 'var(--secondary-dark)', marginTop: 4 }}>
          Un email avec les identifiants sera envoyé automatiquement à l'adresse indiquée.
        </div>
      </Modal>

      {/* ── Modal : Modifier un admin ── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); setFormError('') }}
        title={`Modifier — ${editTarget?.first_name} ${editTarget?.last_name}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
              Enregistrer
            </Button>
          </>
        }
      >
        {formError && <Alert type="error" message={formError} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom">
            <Input value={editForm.first_name} onChange={e => setEF({...editForm, first_name: e.target.value})} />
          </Field>
          <Field label="Nom">
            <Input value={editForm.last_name} onChange={e => setEF({...editForm, last_name: e.target.value})} />
          </Field>
        </div>
        <Field label="Rôle">
          <Select value={editForm.role} onChange={e => setEF({...editForm, role: e.target.value as AdminRole})} options={ROLE_OPTIONS} />
        </Field>
        <Field label="Nouveau mot de passe" hint="Laisser vide pour ne pas changer">
          <Input type="password" value={editForm.password} onChange={e => setEF({...editForm, password: e.target.value})} placeholder="••••••••" />
        </Field>
      </Modal>

      {/* ── Confirmation désactivation ── */}
      <ConfirmModal
        open={!!deactTarget}
        onClose={() => setDeact(null)}
        onConfirm={() => deactivateMut.mutate(deactTarget!.id)}
        loading={deactivateMut.isPending}
        title="Désactiver l'administrateur"
        message={`Désactiver le compte de ${deactTarget?.first_name} ${deactTarget?.last_name} (${deactTarget?.email}) ? La personne ne pourra plus se connecter.`}
        danger
      />

      {/* ── Confirmation réactivation ── */}
      <ConfirmModal
        open={!!reactivateTarget}
        onClose={() => setReact(null)}
        onConfirm={() => reactivateMut.mutate(reactivateTarget!.id)}
        loading={reactivateMut.isPending}
        title="Réactiver l'administrateur"
        message={`Réactiver le compte de ${reactivateTarget?.first_name} ${reactivateTarget?.last_name} ?`}
      />
    </div>
  )
}
