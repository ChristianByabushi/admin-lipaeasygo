import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card, CardHeader } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { fmtDate, fmtDateTime, fmtMoney, fmtPhone } from '../lib/format'
import { Spinner } from '../components/ui/Button'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select, Alert } from '../components/ui/Form'
import { IconChevronLeft } from '../components/ui/Icon'
import { getStoredUser, can } from '../lib/auth'
import { ACCOUNT_TYPE } from '../lib/accountTypes'

// ── Helpers ────────────────────────────────────────────────────────────────

const DRC_PROVINCES = [
  'Kinshasa','Kongo Central','Kwango','Kwilu','Maï-Ndombe',
  'Kasaï','Kasaï Central','Kasaï Oriental','Lomami','Sankuru',
  'Maniema','Sud-Kivu','Nord-Kivu','Ituri','Haut-Uélé',
  'Tshopo','Bas-Uélé','Nord-Ubangi','Mongala','Sud-Ubangi',
  'Équateur','Tshuapa','Tanganyika','Haut-Lomami','Lualaba','Haut-Katanga',
]

// ── Component ──────────────────────────────────────────────────────────────

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  usePageTitle('Détail utilisateur', ['Admin', 'Utilisateurs', 'Détail'])

  const qc = useQueryClient()
  const adminUser = getStoredUser()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // ── Modal state ───────────────────────────────────────────────────────────
  type ModalType = 'edit_info' | 'reset_pin' | 'set_kyc' | null
  const [modal, setModal]   = useState<ModalType>(null)
  const [modalErr, setModalErr] = useState('')

  // Edit info form
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', email: '', address: '', preferred_language: 'fr',
  })

  // Reset PIN
  const [newPin, setNewPin]         = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')

  // KYC tier
  const [kycTier, setKycTier] = useState('0')

  function openModal(type: ModalType) {
    setModal(type)
    setModalErr('')
    if (type === 'edit_info' && data) {
      setEditForm({
        first_name:          data.first_name  ?? '',
        last_name:           data.last_name   ?? '',
        email:               data.email       ?? '',
        address:             data.address     ?? '',
        preferred_language:  data.preferred_language ?? 'fr',
      })
    }
    if (type === 'set_kyc' && data) {
      setKycTier(String(data.kyc_tier ?? 0))
    }
    if (type === 'reset_pin') {
      setNewPin('')
      setNewPinConfirm('')
    }
  }

  function closeModal() {
    setModal(null)
    setModalErr('')
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['user', id] })
    closeModal()
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const editInfoMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        first_name: editForm.first_name.trim(),
        last_name:  editForm.last_name.trim(),
        preferred_language: editForm.preferred_language,
      }
      if (editForm.email.trim())   payload.email   = editForm.email.trim()
      if (editForm.address.trim()) payload.address = editForm.address.trim()
      return api.patch(`/admin/users/${id}`, payload)
    },
    onSuccess: refresh,
    onError: (e) => setModalErr(getErrorMessage(e)),
  })

  const resetPinMut = useMutation({
    mutationFn: () =>
      api.put(`/admin/users/${id}/reset-pin`, null, { params: { new_pin: newPin } }),
    onSuccess: refresh,
    onError: (e) => setModalErr(getErrorMessage(e)),
  })

  const kycTierMut = useMutation({
    mutationFn: () =>
      api.put(`/admin/users/${id}/kyc-tier`, null, { params: { tier: parseInt(kycTier) } }),
    onSuccess: refresh,
    onError: (e) => setModalErr(getErrorMessage(e)),
  })

  // ── Loading / error states ─────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spinner size={36} color="var(--primary)" />
    </div>
  )
  if (!data) return (
    <p style={{ color: 'var(--gray-500)', padding: 24 }}>Utilisateur introuvable.</p>
  )

  const canEdit = adminUser && can(adminUser.role, 'users.*')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Back */}
      <Link to="/users" style={{ color: 'var(--primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconChevronLeft size={14} /> Retour aux utilisateurs
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }} className="dash-two-col">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile card */}
          <Card>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {/* Déterminer si c'est un agent (via agent_info fourni par l'API) */}
              {(() => {
                const isAgent = !!(data.agent_id || data.agent)
                const t = isAgent ? ACCOUNT_TYPE.agent : ACCOUNT_TYPE.user
                return (
                  <>
                    <div style={{
                      width: 72, height: 72,
                      borderRadius: isAgent ? 16 : '50%',
                      background: t.colorLight,
                      border: `3px solid ${t.color}33`,
                      margin: '0 auto 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 800, color: t.color,
                    }}>
                      {(data.first_name?.[0] ?? '').toUpperCase()}{(data.last_name?.[0] ?? '').toUpperCase()}
                    </div>
                    {/* Badge type de compte */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999,
                        background: t.colorLight,
                        border: `1px solid ${t.colorBorder}`,
                        fontSize: 11, fontWeight: 700, color: t.color,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {t.icon} {t.label}
                      </span>
                    </div>
                  </>
                )
              })()}
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-900)' }}>
                {data.first_name} {data.last_name}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                {fmtPhone(data.phone_number)}
              </p>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center' }}>
                <StatusBadge status={data.status} />
                <StatusBadge status={data.kyc_status} />
              </div>
            </div>   {/* end textAlign:center */}

            <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14 }}>
              {[
                ['E-mail',          data.email ?? '—'],
                ['Adresse',         data.address ?? '—'],
                ['Langue',          data.preferred_language ?? '—'],
                ['Code parrainage', data.referral_code ?? '—'],
                ['Tier KYC',        `Tier ${data.kyc_tier}`],
                ['Inscrit le',      fmtDate(data.created_at)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--gray-800)', maxWidth: 160, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Edit info button */}
            {canEdit && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openModal('edit_info')}>
                  ✏️ Modifier les informations
                </Button>
              </div>
            )}
          </Card>

          {/* Actions support */}
          <Card>
            <CardHeader title="Actions support" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Cash deposit */}
              <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={async () => {
                  const amountStr = window.prompt('Montant à déposer (en CDF) :')
                  if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) return
                  const ref = window.prompt('Référence / bordereau (facultatif) :') ?? ''
                  if (window.confirm(`Créditer ${Number(amountStr).toLocaleString()} CDF sur le compte de ${data.first_name} ${data.last_name} ?`)) {
                    try {
                      const res = await api.post(`/finance/admin/deposit`, null, {
                        params: {
                          user_phone: data.phone_number,
                          amount: amountStr,
                          currency: 'CDF',
                          reference: ref || undefined,
                        },
                      })
                      const d2 = res.data.data
                      const msg = d2.tier_upgraded
                        ? `Dépôt effectué. Solde : ${d2.balance_after} CDF. Compte mis à niveau au Tier ${d2.kyc_tier_after}.`
                        : `Dépôt effectué. Nouveau solde : ${d2.balance_after} CDF.`
                      window.alert(msg)
                      qc.invalidateQueries({ queryKey: ['user', id] })
                    } catch (e: any) {
                      window.alert('Erreur : ' + (e?.response?.data?.error?.message ?? e.message))
                    }
                  }
                }}>
                Dépôt en espèces
              </Button>

              <Link to={`/kyc?user=${id}`}>
                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}>
                  Voir documents KYC
                </Button>
              </Link>
              <Link to={`/transactions?user=${id}`}>
                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}>
                  Voir transactions
                </Button>
              </Link>

              {/* Reset PIN */}
              {canEdit && (
                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openModal('reset_pin')}>
                  🔑 Réinitialiser le PIN
                </Button>
              )}

              {/* Set KYC tier */}
              {canEdit && (
                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openModal('set_kyc')}>
                  🏅 Modifier le tier KYC
                </Button>
              )}

              {/* Unlock */}
              <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}
                onClick={async () => {
                  if (window.confirm('Débloquer le compte (réinitialiser les tentatives PIN) ?')) {
                    try {
                      await api.put(`/admin/users/${id}/unlock`)
                      qc.invalidateQueries({ queryKey: ['user', id] })
                    } catch { alert('Erreur lors du déblocage.') }
                  }
                }}>
                Débloquer le compte
              </Button>

              {/* Suspend / Reactivate */}
              {data.status === 'active' ? (
                <Button variant="danger" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    const reason = window.prompt('Motif de suspension :')
                    if (reason && reason.trim()) {
                      try {
                        await api.put(`/admin/users/${id}/suspend`, null, { params: { reason } })
                        qc.invalidateQueries({ queryKey: ['user', id] })
                      } catch { alert('Erreur lors de la suspension.') }
                    }
                  }}>
                  Suspendre le compte
                </Button>
              ) : data.status === 'suspended' ? (
                <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    try {
                      await api.put(`/admin/users/${id}/reactivate`)
                      qc.invalidateQueries({ queryKey: ['user', id] })
                    } catch { alert('Erreur lors de la réactivation.') }
                  }}>
                  Réactiver le compte
                </Button>
              ) : null}
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Wallets */}
          <Card>
            <CardHeader title="Portefeuilles" />
            {data.wallets?.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Aucun portefeuille</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {data.wallets?.map((w: Record<string, unknown>) => (
                  <div key={String(w.id)} style={{
                    padding: '16px', borderRadius: 12,
                    background: w.currency === 'CDF'
                      ? 'linear-gradient(135deg, #9B000D, #005BBB)'
                      : 'linear-gradient(135deg, #1E3A5F, #2E5A88)',
                    color: '#fff',
                  }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                      {String(w.currency)} • {String(w.account_number)}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {fmtMoney(String(w.balance), String(w.currency))}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                      {w.is_active ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* KYC documents */}
          <Card>
            <CardHeader title="Documents KYC" />
            {data.kyc_documents?.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Aucun document soumis</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    {['Type', 'Statut', 'Soumis le'].map((h) => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.kyc_documents?.map((d: Record<string, unknown>) => (
                    <tr key={String(d.id)} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                      <td style={{ padding: '9px 10px' }}>{String(d.type).replaceAll('_', ' ')}</td>
                      <td style={{ padding: '9px 10px' }}><StatusBadge status={String(d.status)} /></td>
                      <td style={{ padding: '9px 10px', color: 'var(--gray-400)', fontSize: 12 }}>{fmtDate(String(d.submitted_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {/* ── Modal : Modifier les informations ─────────────────────────────── */}
      <Modal
        open={modal === 'edit_info'}
        onClose={closeModal}
        title="Modifier les informations"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            <Button
              loading={editInfoMut.isPending}
              disabled={!editForm.first_name.trim() || !editForm.last_name.trim()}
              onClick={() => editInfoMut.mutate()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        {modalErr && <Alert type="error" message={modalErr} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom" required>
            <Input value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              placeholder="Jean" />
          </Field>
          <Field label="Nom de famille" required>
            <Input value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              placeholder="Kabila" />
          </Field>
        </div>
        <Field label="E-mail" hint="Optionnel">
          <Input type="email" value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            placeholder="jean@example.com" />
        </Field>
        <Field label="Adresse" hint="Format : Territoire, Province, Rue">
          <Input value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            placeholder="Gombe, Kinshasa, Av. Kasavubu N°1" />
        </Field>
        <Field label="Langue préférée">
          <Select value={editForm.preferred_language}
            onChange={(e) => setEditForm({ ...editForm, preferred_language: e.target.value })}
            options={[
              { value: 'fr', label: 'Français'  },
              { value: 'sw', label: 'Swahili'   },
              { value: 'ln', label: 'Lingala'   },
              { value: 'en', label: 'Anglais'   },
            ]} />
        </Field>
      </Modal>

      {/* ── Modal : Réinitialiser le PIN ───────────────────────────────────── */}
      <Modal
        open={modal === 'reset_pin'}
        onClose={closeModal}
        title="Réinitialiser le PIN"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            <Button
              variant="secondary"
              loading={resetPinMut.isPending}
              disabled={
                !newPin || newPin.length < 4 || !/^\d+$/.test(newPin) ||
                newPin !== newPinConfirm
              }
              onClick={() => resetPinMut.mutate()}
            >
              Réinitialiser
            </Button>
          </>
        }
      >
        {modalErr && <Alert type="error" message={modalErr} />}
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Définissez un nouveau code PIN pour <strong>{data.first_name} {data.last_name}</strong>.
          Le nouvel PIN doit être communiqué à l'utilisateur de manière sécurisée.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nouveau PIN" required hint="4 à 6 chiffres"
            error={newPin && newPin.length < 4 ? 'Trop court' : undefined}>
            <Input type="password" value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              hasError={!!(newPin && newPin.length < 4)} />
          </Field>
          <Field label="Confirmer le PIN" required
            error={newPinConfirm && newPin !== newPinConfirm ? 'Ne correspond pas' : undefined}>
            <Input type="password" value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              hasError={!!(newPinConfirm && newPin !== newPinConfirm)} />
          </Field>
        </div>
      </Modal>

      {/* ── Modal : Modifier le tier KYC ──────────────────────────────────── */}
      <Modal
        open={modal === 'set_kyc'}
        onClose={closeModal}
        title="Modifier le tier KYC"
        width={380}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            <Button
              loading={kycTierMut.isPending}
              onClick={() => kycTierMut.mutate()}
            >
              Appliquer
            </Button>
          </>
        }
      >
        {modalErr && <Alert type="error" message={modalErr} />}
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Niveau actuel : <strong>Tier {data.kyc_tier}</strong>. Cette action est tracée dans le journal d'audit.
        </p>
        <Field label="Nouveau tier KYC">
          <Select value={kycTier} onChange={(e) => setKycTier(e.target.value)}
            options={[
              { value: '0', label: 'Tier 0 — Non vérifié' },
              { value: '1', label: 'Tier 1 — Identité vérifiée' },
              { value: '2', label: 'Tier 2 — Vérification complète' },
            ]} />
        </Field>
      </Modal>

    </div>
  )
}
