import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Table, TableToolbar, SearchInput, FilterSelect, Column } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select, Textarea, Alert } from '../components/ui/Form'
import { fmtDate, fmtPhone } from '../lib/format'
import { IconPlus } from '../components/ui/Icon'
import { ACCOUNT_TYPE } from '../lib/accountTypes'

// ── DRC provinces & territories (matches Flutter app register_screen.dart) ────
const DRC_PROVINCES = [
  'Kinshasa','Kongo Central','Kwango','Kwilu','Maï-Ndombe',
  'Kasaï','Kasaï Central','Kasaï Oriental','Lomami','Sankuru',
  'Maniema','Sud-Kivu','Nord-Kivu','Ituri','Haut-Uélé',
  'Tshopo','Bas-Uélé','Nord-Ubangi','Mongala','Sud-Ubangi',
  'Équateur','Tshuapa','Tanganyika','Haut-Lomami','Lualaba','Haut-Katanga',
]

const DRC_TERRITORIES: Record<string, string[]> = {
  'Kinshasa':       ['Barumbu','Bumbu','Gombe','Kalamu','Kasa-Vubu','Kimbanseke','Kinshasa','Kisenso','Lemba','Limete','Lingwala','Makala','Maluku','Masina','Matete','Mont-Ngafula','Ndjili','Ngaba','Ngaliema','Ngiri-Ngiri','Nsele','Selembao'],
  'Kongo Central':  ['Matadi','Boma','Mbanza-Ngungu','Lukula','Luozi','Madimba','Kimvula','Songololo','Seke-Banza','Tshela','Moanda','Muanda'],
  'Kwango':         ['Kenge','Feshi','Kahemba','Kasongo-Lunda','Popokabaka'],
  'Kwilu':          ['Bandundu','Bagata','Bulungu','Gungu','Idiofa','Kikwit','Masi-Manimba'],
  'Maï-Ndombe':     ['Inongo','Bolobo','Kiri','Kutu','Oshwe','Yumbi'],
  'Kasaï':          ['Tshikapa','Dekese','Ilebo','Kamonia','Luebo','Mweka'],
  'Kasaï Central':  ['Kananga','Demba','Dibaya','Dimbelenge','Kazumba','Luiza'],
  'Kasaï Oriental': ['Mbuji-Mayi','Kabinda','Kabeya-Kamwanga','Katanda','Lupatapata','Miabi','Tshilenge'],
  'Lomami':         ['Kabinda','Kamiji','Kole','Lubao','Malemba-Nkulu','Ngandajika'],
  'Sankuru':        ['Lodja','Katako-Kombe','Kole','Lubefu','Lusambo','Tshofa'],
  'Maniema':        ['Kindu','Kabambare','Kailo','Kasongo','Kibombo','Lubutu','Pangi','Punia'],
  'Sud-Kivu':       ['Bukavu','Fizi','Idjwi','Kabare','Kalehe','Mwenga','Shabunda','Uvira','Walungu'],
  'Nord-Kivu':      ['Goma','Beni','Butembo','Lubero','Masisi','Nyiragongo','Rutshuru','Walikale'],
  'Ituri':          ['Bunia','Aru','Djugu','Irumu','Mahagi','Mambasa'],
  'Haut-Uélé':      ['Isiro','Dungu','Faradje','Niangara','Rungu','Wamba'],
  'Tshopo':         ['Kisangani','Bafwasende','Banalia','Basoko','Isangi','Opala','Ubundu','Yahuma'],
  'Bas-Uélé':       ['Buta','Ango','Bambesa','Bondo','Aketi'],
  'Nord-Ubangi':    ['Gbadolite','Bosobolo','Businga','Mobayi-Mbongo','Yakoma'],
  'Mongala':        ['Lisala','Bongandanga','Bumba','Lolo'],
  'Sud-Ubangi':     ['Gemena','Budjala','Kungu','Libenge','Zongo'],
  'Équateur':       ['Mbandaka','Basankusu','Bikoro','Bomongo','Ingende','Lukolela','Makanza'],
  'Tshuapa':        ['Boende','Befale','Bokungu','Djolu','Ikela','Monkoto'],
  'Tanganyika':     ['Kalemie','Kabalo','Kongolo','Manono','Moba','Nyunzu'],
  'Haut-Lomami':    ['Kamina','Bukama','Kabongo','Kaniama','Malemba-Nkulu'],
  'Lualaba':        ['Kolwezi','Dilolo','Kapanga','Lubudi','Mutshatsha','Sandoa'],
  'Haut-Katanga':   ['Lubumbashi','Kambove','Kasenga','Kipushi','Likasi','Mitwaba','Pweto','Sakania'],
}

type User = {
  id: string; phone_number: string; email?: string
  first_name: string; last_name: string
  kyc_status: string; kyc_tier: number; status: string; created_at: string
  // Champs agent — présents si l'utilisateur est aussi un agent revendeur
  is_agent?: boolean
  agent_id?: string | null
  agent_name?: string | null
  agent_status?: string | null
  agent_tier?: string | null
}

type Modal_ = 'create' | 'suspend' | null

export default function Users() {
  usePageTitle('Clients', ['Admin', 'Clients'])
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [kycFilter, setKyc]         = useState('')
  const [typeFilter, setTypeFilter] = useState('user')  // par défaut : clients seulement, pas les agents-terrain

  const [modalType, setModalType]   = useState<Modal_>(null)
  const [targetUser, setTarget]     = useState<User | null>(null)
  const [actionError, setActionError] = useState('')

  // ── Onglet type de compte : utilisateur | agent ───────────────────────────
  const [accountType, setAccountType] = useState<'user' | 'agent'>('user')

  // Create user form — matches ALL fields in the User model
  const [form, setForm] = useState({
    // Identity
    first_name: '',
    last_name: '',
    date_of_birth: '',           // User.date_of_birth (DateTime, optional)
    // Contact
    phone_number: '+243',        // pre-fill DRC prefix
    email: '',                   // User.email (optional, unique)
    // Location — stored as "Territory, Province, Street" to match Flutter app
    province: '',
    territory: '',
    street_address: '',
    // Security
    pin: '',
    pin_confirm: '',             // confirmation — not sent to API
    // App settings
    preferred_language: 'fr',   // User.preferred_language
    // KYC override
    kyc_tier: '0',              // User.kyc_tier
    // Referral
    referral_code_used: '',      // User.referred_by (resolved from code on backend)
    // Notification preferences
    notif_push: true,
    notif_sms: true,
    notif_email: false,
    // Admin option
    send_welcome_sms: true,
  })

  // Suspend
  const [suspendReason, setSuspendReason] = useState('')

  // Formulaire agent — tous les champs du schéma AdminAgentCreateRequest
  const emptyAgent = {
    phone_number:   '+243',
    email:          '',
    business_name:  '',
    entity_type:    'individual',
    tier:           'basic',
    // Adresse décomposée (concaténée avant envoi)
    province:       '',
    territory:      '',
    street_address: '',
    // Géolocalisation (optionnel)
    latitude:       '',
    longitude:      '',
    // Sécurité
    password:         '',
    password_confirm: '',
    // Paramètres
    preferred_language: 'fr',
    kyc_tier:           '1',
    status:             'pending',
  }
  const [agentForm, setAgentForm] = useState(emptyAgent)
  const [agentError, setAgentError] = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, statusFilter, kycFilter],
    queryFn: () => api.get('/admin/users', { params: {
      search: search || undefined,
      status: statusFilter || undefined,
      kyc_status: kycFilter || undefined,
      limit: 100,
    }}).then((r) => r.data.data as User[]),
  })

  // Filtre côté client sur le type de compte (agent vs utilisateur)
  const filteredData = (data ?? []).filter(u => {
    if (typeFilter === 'agent') return !!u.is_agent
    if (typeFilter === 'user')  return !u.is_agent
    return true
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────

  function onSuccess(msg?: string) {
    qc.invalidateQueries({ queryKey: ['users'] })
    qc.invalidateQueries({ queryKey: ['agents'] })
    closeModal()
    if (msg) console.info(msg)
  }

  function onError(e: unknown) { setActionError(getErrorMessage(e)) }

  const createMut = useMutation({
    mutationFn: () => {
      // Build address string matching Flutter app format: "Territory, Province, Street"
      const addressParts = [form.territory, form.province, form.street_address].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined

      // Strip all empty-string optional fields — Pydantic will reject '' for
      // DateTime / email / UUID fields and return 422 which axios shows as "Network Error"
      const payload: Record<string, unknown> = {
        phone_number:       form.phone_number.trim(),
        first_name:         form.first_name.trim(),
        last_name:          form.last_name.trim(),
        pin:                form.pin,
        preferred_language: form.preferred_language,
        kyc_tier:           parseInt(form.kyc_tier),
        notification_prefs: {
          push:  form.notif_push,
          sms:   form.notif_sms,
          email: form.notif_email,
        },
        send_welcome_sms: form.send_welcome_sms,
      }

      // Only add optional fields when they have a real value
      if (form.date_of_birth)           payload.date_of_birth       = form.date_of_birth
      if (form.email.trim())            payload.email               = form.email.trim()
      if (address)                      payload.address             = address
      if (form.referral_code_used.trim()) payload.referral_code_used = form.referral_code_used.trim().toUpperCase()

      return api.post('/admin/users', payload)
    },
    onSuccess: () => onSuccess(),
    onError,
  })

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/admin/users/${id}/suspend`, null, { params: { reason } }),
    onSuccess: () => onSuccess(),
    onError,
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/reactivate`),
    onSuccess: () => onSuccess(),
    onError,
  })

  // Mutation : créer un compte agent (User + Agent en deux appels)
  const createAgentMut = useMutation({
    mutationFn: async () => {
      // Build address string: "Territory, Province, Street"
      const addressParts = [agentForm.territory, agentForm.province, agentForm.street_address].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined

      // 1. Créer le compte utilisateur lié à l'agent
      const userRes = await api.post('/admin/users', {
        phone_number:       agentForm.phone_number.trim(),
        first_name:         agentForm.business_name.trim() || 'Agent',
        last_name:          '',
        pin:                agentForm.password,
        email:              agentForm.email.trim() || undefined,
        address,
        preferred_language: agentForm.preferred_language,
        kyc_tier:           parseInt(agentForm.kyc_tier),
        send_welcome_sms:   false,
      })
      const userId = userRes.data.data.user_id

      // 2. Créer le compte agent avec TOUS les champs du schéma AdminAgentCreateRequest
      const agentPayload: Record<string, unknown> = {
        user_id:      userId,
        phone_number: agentForm.phone_number.trim(),
        entity_type:  agentForm.entity_type,
        tier:         agentForm.tier,
        kyc_verified: true,
        status:       agentForm.status,
        password:     agentForm.password,
      }
      if (agentForm.business_name.trim()) agentPayload.business_name = agentForm.business_name.trim()
      if (agentForm.email.trim())         agentPayload.email         = agentForm.email.trim()
      if (address)                        agentPayload.address       = address
      if (agentForm.latitude.trim())      agentPayload.latitude      = parseFloat(agentForm.latitude)
      if (agentForm.longitude.trim())     agentPayload.longitude     = parseFloat(agentForm.longitude)

      await api.post('/agents/admin/create', agentPayload)
    },
    onSuccess: () => {
      setAgentForm(emptyAgent); setAgentError('')
      onSuccess()
    },
    onError: (e) => setAgentError(getErrorMessage(e)),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function openModal(type: Modal_, user?: User) {
    setModalType(type)
    setTarget(user ?? null)
    setActionError('')
    setSuspendReason('')
  }

  function closeModal() {
    setModalType(null)
    setTarget(null)
    setActionError('')
    setAccountType('user')
    setAgentForm(emptyAgent)
    setAgentError('')
    setForm({
      first_name: '', last_name: '', date_of_birth: '',
      phone_number: '+243', email: '',
      province: '', territory: '', street_address: '',
      pin: '', pin_confirm: '', preferred_language: 'fr',
      kyc_tier: '0', referral_code_used: '',
      notif_push: true, notif_sms: true, notif_email: false,
      send_welcome_sms: true,
    })
  }

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'Compte', width: 230,
      render: (u) => {
        const t = u.is_agent ? ACCOUNT_TYPE.agent : ACCOUNT_TYPE.user
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar coloré selon le type */}
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              borderRadius: u.is_agent ? 10 : '50%',   // carré = agent, rond = user
              background: t.colorLight,
              border: `2px solid ${t.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: t.color,
            }}>
              {(u.first_name[0] ?? '').toUpperCase()}{(u.last_name[0] ?? '').toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                  {u.first_name} {u.last_name}
                </span>
              </div>
              {/* Ligne identité : type + info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '1px 6px', borderRadius: 999,
                  background: t.colorLight,
                  border: `1px solid ${t.colorBorder}`,
                  fontSize: 10, fontWeight: 700, color: t.color,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {t.icon} {u.is_agent ? (u.agent_name ?? t.label) : t.label}
                </span>
                {/* Badge pending agent = en attente d'approbation */}
                {u.is_agent && u.agent_status === 'pending' && (
                  <span style={{
                    padding: '1px 5px', borderRadius: 999,
                    background: '#FEF7E6', border: '1px solid #F59E0B44',
                    fontSize: 9, fontWeight: 700, color: '#B45309',
                    textTransform: 'uppercase',
                  }}>
                    À approuver
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'email', header: 'Email', width: 180,
      render: (u) => (
        <span style={{ fontSize: 13, color: u.email ? 'var(--gray-700)' : 'var(--gray-300)' }}>
          {u.email ?? '—'}
        </span>
      ),
    },
    {
      key: 'kyc_status', header: 'KYC', width: 120,
      render: (u) => (
        <div>
          <StatusBadge status={u.kyc_status} />
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
            Tier {u.kyc_tier}
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Compte', width: 100,
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'created_at', header: 'Inscrit le', width: 100,
      render: (u) => (
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          {fmtDate(u.created_at)}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions', width: 200, align: 'right',
      render: (u) => (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          {/* Primary action: open the full detail page */}
          <Button
            size="sm" variant="outline"
            onClick={(e) => { e.stopPropagation(); navigate(`/users/${u.id}`) }}
          >
            Voir le profil
          </Button>

          {/* Account status toggle — most common inline action */}
          {u.status === 'active' && (
            <Button
              size="sm" variant="danger"
              onClick={(e) => { e.stopPropagation(); openModal('suspend', u) }}
            >
              Suspendre
            </Button>
          )}
          {u.status === 'suspended' && (
            <Button
              size="sm" variant="secondary"
              onClick={(e) => { e.stopPropagation(); reactivateMut.mutate(u.id) }}
            >
              Réactiver
            </Button>
          )}
          {/* PIN reset and KYC tier change are in the detail page — less frequent */}
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card padding="0">
        <div style={{ padding: '20px 20px 0' }}>
          <TableToolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, email…" />
            <FilterSelect value={statusFilter} onChange={setStatus} placeholder="Tous les statuts"
              options={[{ value: 'active', label: 'Actifs' }, { value: 'suspended', label: 'Suspendus' }]}
            />
            <FilterSelect value={kycFilter} onChange={setKyc} placeholder="Tous KYC"
              options={[
                { value: 'pending',      label: 'En attente' },
                { value: 'under_review', label: 'En revue'   },
                { value: 'verified',     label: 'Vérifiés'   },
                { value: 'rejected',     label: 'Rejetés'    },
              ]}
            />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Clients uniquement"
              options={[
                { value: 'user',  label: '👤 Clients uniquement'         },
                { value: 'agent', label: '🏪 Agents-terrain uniquement'  },
                { value: '',      label: 'Tous (clients + agents-terrain)'},
              ]}
            />
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-400)' }}>
              {filteredData?.length ?? 0} résultat(s)
            </span>
            <Button icon={<IconPlus size={14} />} size="sm" onClick={() => openModal('create')}>
              Créer (client / agent-terrain)
            </Button>
          </TableToolbar>
        </div>
        <Table
          columns={columns}
          data={filteredData}
          loading={isLoading}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
          emptyText="Aucun utilisateur trouvé"
        />
      </Card>

      {/* ── Create user/agent modal ── */}
      <Modal
        open={modalType === 'create'}
        onClose={closeModal}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              background: ACCOUNT_TYPE[accountType].colorLight,
              fontSize: 14,
            }}>
              {ACCOUNT_TYPE[accountType].icon}
            </span>
            <span style={{ color: ACCOUNT_TYPE[accountType].color }}>
              Créer — {ACCOUNT_TYPE[accountType].labelFull}
            </span>
          </span>
        }
        width={600}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            {accountType === 'user' ? (
              <Button
                loading={createMut.isPending}
                disabled={
                  !form.phone_number || form.phone_number.length < 12 ||
                  !form.first_name || !form.last_name ||
                  !form.pin || form.pin.length < 4 || !/^\d+$/.test(form.pin) ||
                  form.pin !== form.pin_confirm
                }
                onClick={() => createMut.mutate()}
              >
                Créer le compte
              </Button>
            ) : (
              <Button
                loading={createAgentMut.isPending}
                disabled={
                  !agentForm.phone_number || agentForm.phone_number.length < 12 ||
                  !agentForm.password || agentForm.password.length < 8 ||
                  agentForm.password !== agentForm.password_confirm ||
                  (!!agentForm.latitude  && isNaN(parseFloat(agentForm.latitude)))  ||
                  (!!agentForm.longitude && isNaN(parseFloat(agentForm.longitude)))
                }
                onClick={() => createAgentMut.mutate()}
              >
                Créer l'agent
              </Button>
            )}
          </>
        }
      >
        {/* ── Sélecteur de type de compte avec code couleur ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {([
            { key: 'user'  as const },
            { key: 'agent' as const },
          ]).map(({ key }) => {
            const t = ACCOUNT_TYPE[key]
            const active = accountType === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAccountType(key)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `2px solid ${active ? t.color : t.colorBorder}`,
                  background: active ? t.colorLight : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: active ? t.color : t.colorLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                    transition: 'background .15s',
                  }}>
                    {t.icon}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: active ? t.color : '#334155',
                    }}>
                      {t.labelFull}
                    </div>
                    {active && (
                      <div style={{
                        display: 'inline-block', marginTop: 2,
                        width: 8, height: 8, borderRadius: '50%',
                        background: t.color,
                      }} />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                  {t.description}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Formulaire AGENT ── */}
        {accountType === 'agent' && (
          <>
            {agentError && <Alert type="error" message={agentError} />}

            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Identité commerciale
            </p>
            <Field label="Nom commercial / Enseigne" hint="Optionnel pour les particuliers">
              <Input value={agentForm.business_name} onChange={e => setAgentForm({...agentForm, business_name: e.target.value})} placeholder="KABILA CASH" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Type d'entité">
                <Select value={agentForm.entity_type} onChange={e => setAgentForm({...agentForm, entity_type: e.target.value})}
                  options={[{ value: 'individual', label: 'Particulier' }, { value: 'business', label: 'Entreprise' }]} />
              </Field>
              <Field label="Tier initial">
                <Select value={agentForm.tier} onChange={e => setAgentForm({...agentForm, tier: e.target.value})}
                  options={[{ value: 'basic', label: 'Basic' }, { value: 'super', label: 'Super' }]} />
              </Field>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Contact
            </p>
            <Field label="Numéro de téléphone" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', flexShrink: 0 }}>+243</div>
                <Input
                  value={agentForm.phone_number.replace('+243', '')}
                  onChange={e => { const d = e.target.value.replace(/\D/g,'').slice(0,9); setAgentForm({...agentForm, phone_number: `+243${d}`}) }}
                  placeholder="812345678" style={{ flex: 1 }}
                  hasError={agentForm.phone_number.length > 4 && agentForm.phone_number.length < 12}
                />
              </div>
            </Field>
            <Field label="E-mail" hint="Optionnel — pour les notifications">
              <Input type="email" value={agentForm.email} onChange={e => setAgentForm({...agentForm, email: e.target.value})} placeholder="agent@example.com" />
            </Field>

            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Adresse
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Province">
                <Select value={agentForm.province}
                  onChange={e => setAgentForm({...agentForm, province: e.target.value, territory: ''})}
                  placeholder="Sélectionner…"
                  options={DRC_PROVINCES.map(p => ({ value: p, label: p }))} />
              </Field>
              <Field label="Territoire / Ville">
                <Select value={agentForm.territory}
                  onChange={e => setAgentForm({...agentForm, territory: e.target.value})}
                  placeholder={agentForm.province ? 'Sélectionner…' : 'Choisir une province'}
                  options={agentForm.province ? (DRC_TERRITORIES[agentForm.province] ?? []).map(t => ({ value: t, label: t })) : []} />
              </Field>
            </div>
            <Field label="Rue / Quartier / Avenue">
              <Input value={agentForm.street_address} onChange={e => setAgentForm({...agentForm, street_address: e.target.value})} placeholder="Av. Kasa-Vubu N° 12" />
            </Field>

            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Sécurité — Mot de passe
            </p>

            {/* Géolocalisation — optionnel mais utile pour l'app "agents proches" */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Géolocalisation <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optionnel)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Latitude" hint="Ex: -2.4951">
                <Input
                  type="number"
                  step="0.0001"
                  value={agentForm.latitude}
                  onChange={e => setAgentForm({...agentForm, latitude: e.target.value})}
                  placeholder="-2.4951"
                />
              </Field>
              <Field label="Longitude" hint="Ex: 28.8601">
                <Input
                  type="number"
                  step="0.0001"
                  value={agentForm.longitude}
                  onChange={e => setAgentForm({...agentForm, longitude: e.target.value})}
                  placeholder="28.8601"
                />
              </Field>
            </div>

            {/* Statut initial */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Paramètres du compte
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Statut initial" hint="pending = en attente d'approbation">
                <Select
                  value={agentForm.status}
                  onChange={e => setAgentForm({...agentForm, status: e.target.value})}
                  options={[
                    { value: 'pending', label: 'Pending — à approuver' },
                    { value: 'active',  label: 'Actif immédiatement'   },
                  ]}
                />
              </Field>
              <Field label="Langue préférée">
                <Select
                  value={agentForm.preferred_language}
                  onChange={e => setAgentForm({...agentForm, preferred_language: e.target.value})}
                  options={[
                    { value: 'fr', label: 'Français'  },
                    { value: 'sw', label: 'Swahili'   },
                    { value: 'ln', label: 'Lingala'   },
                    { value: 'en', label: 'Anglais'   },
                  ]}
                />
              </Field>
            </div>

            {/* Mot de passe section */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
              Sécurité — Mot de passe
            </p>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12, lineHeight: 1.6 }}>
              L'agent se connectera avec ce mot de passe (pas de PIN). Exigences : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Mot de passe" required
                error={agentForm.password && agentForm.password.length < 8 ? 'Trop court (min. 8 car.)' : undefined}>
                <Input type="password" value={agentForm.password}
                  onChange={e => setAgentForm({...agentForm, password: e.target.value})}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  hasError={!!(agentForm.password && agentForm.password.length < 8)} />
              </Field>
              <Field label="Confirmer le mot de passe" required
                error={agentForm.password_confirm && agentForm.password !== agentForm.password_confirm ? 'Ne correspond pas' : undefined}>
                <Input type="password" value={agentForm.password_confirm}
                  onChange={e => setAgentForm({...agentForm, password_confirm: e.target.value})}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  hasError={!!(agentForm.password_confirm && agentForm.password !== agentForm.password_confirm)} />
              </Field>
            </div>
          </>
        )}

        {/* ── Formulaire UTILISATEUR (inchangé) ── */}
        {accountType === 'user' && (
          <>
            {actionError && <Alert type="error" message={actionError} />}

        {/* Section: Identité */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Identité
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom" required>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Jean"
            />
          </Field>
          <Field label="Nom de famille" required>
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Kabila"
            />
          </Field>
        </div>
        <Field label="Date de naissance" hint="Optionnel — format AAAA-MM-JJ">
          <Input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
          />
        </Field>

        {/* Section: Contact */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
          Contact
        </p>
        <Field label="Numéro de téléphone (RDC)" required hint="Format: +243XXXXXXXXX (9 chiffres après +243)">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)',
              background: 'var(--gray-50)', fontSize: 13, fontWeight: 600,
              color: 'var(--gray-600)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              +243
            </div>
            <Input
              value={form.phone_number.replace('+243', '')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                setForm({ ...form, phone_number: `+243${digits}` })
              }}
              placeholder="812345678"
              hasError={form.phone_number.length > 4 && form.phone_number.length < 12}
              style={{ flex: 1 }}
            />
          </div>
          {form.phone_number.length > 4 && form.phone_number.length < 12 && (
            <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
              Saisissez exactement 9 chiffres après +243
            </p>
          )}
        </Field>
        <Field label="Adresse courriel" hint="Optionnel">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jean.kabila@domaine.com"
          />
        </Field>

        {/* Section: Adresse */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
          Adresse
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Province">
            <Select
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value, territory: '' })}
              placeholder="Sélectionner…"
              options={DRC_PROVINCES.map((p) => ({ value: p, label: p }))}
            />
          </Field>
          <Field label="Territoire / Ville">
            <Select
              value={form.territory}
              onChange={(e) => setForm({ ...form, territory: e.target.value })}
              placeholder={form.province ? 'Sélectionner…' : 'Choisir une province'}
              options={form.province ? (DRC_TERRITORIES[form.province] ?? []).map((t) => ({ value: t, label: t })) : []}
            />
          </Field>
        </div>
        <Field label="Rue / Quartier / Avenue" hint="Optionnel">
          <Input
            value={form.street_address}
            onChange={(e) => setForm({ ...form, street_address: e.target.value })}
            placeholder="Av. Kasa-Vubu, Q. Matonge, N° 12"
          />
        </Field>

        {/* Section: Sécurité */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
          Sécurité
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Code PIN" required hint="4 à 6 chiffres">
            <Input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="••••••"
              hasError={!!form.pin && (form.pin.length < 4 || !/^\d+$/.test(form.pin))}
            />
          </Field>
          <Field
            label="Confirmer le PIN" required
            error={form.pin_confirm && form.pin !== form.pin_confirm ? 'Les codes ne correspondent pas' : undefined}
          >
            <Input
              type="password"
              value={form.pin_confirm}
              onChange={(e) => setForm({ ...form, pin_confirm: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="••••••"
              hasError={!!form.pin_confirm && form.pin !== form.pin_confirm}
            />
          </Field>
        </div>

        {/* Section: Paramètres */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
          Paramètres du compte
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Langue préférée">
            <Select
              value={form.preferred_language}
              onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'ln', label: 'Lingala'  },
                { value: 'sw', label: 'Kiswahili' },
                { value: 'en', label: 'English'  },
              ]}
            />
          </Field>
          <Field label="Tier KYC initial" hint="0 = non vérifié, 1 = vérifié manuellement">
            <Select
              value={form.kyc_tier}
              onChange={(e) => setForm({ ...form, kyc_tier: e.target.value })}
              options={[
                { value: '0', label: 'Tier 0 — Non vérifié' },
                { value: '1', label: 'Tier 1 — Vérifié'    },
                { value: '2', label: 'Tier 2 — Premium'     },
              ]}
            />
          </Field>
        </div>
        <Field label="Code de parrainage utilisé" hint="Optionnel — si l'utilisateur a été parrainé">
          <Input
            value={form.referral_code_used}
            onChange={(e) => setForm({ ...form, referral_code_used: e.target.value.toUpperCase() })}
            placeholder="XXXXXXXX"
            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
        </Field>

        {/* Notification preferences */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8, marginTop: 8 }}>
          Préférences de notifications
        </p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'push',  label: 'Notifications push', key: 'notif_push'  as const },
            { id: 'sms',   label: 'SMS',                key: 'notif_sms'   as const },
            { id: 'email', label: 'Courriel',           key: 'notif_email' as const },
          ].map(({ id, label, key }) => (
            <label key={id} htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-600)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id={id}
                checked={form[key] as boolean}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        {/* Welcome SMS */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 16, padding: '10px 12px', borderRadius: 8,
          background: 'var(--secondary-light)', border: '1px solid var(--secondary)',
        }}>
          <input
            type="checkbox"
            id="welcome_sms"
            checked={form.send_welcome_sms}
            onChange={(e) => setForm({ ...form, send_welcome_sms: e.target.checked })}
          />
          <label htmlFor="welcome_sms" style={{ fontSize: 13, color: 'var(--secondary-dark)', cursor: 'pointer' }}>
            Envoyer un SMS de bienvenue avec les instructions de connexion
          </label>
        </div>
          </>
        )}
      </Modal>

      {/* ── Suspend modal ── */}
      <Modal
        open={modalType === 'suspend'}
        onClose={closeModal}
        title={`Suspendre ${targetUser?.first_name} ${targetUser?.last_name}`}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            <Button variant="danger" loading={suspendMut.isPending} disabled={!suspendReason.trim()}
              onClick={() => suspendMut.mutate({ id: targetUser!.id, reason: suspendReason })}>
              Confirmer la suspension
            </Button>
          </>
        }
      >
        {actionError && <Alert type="error" message={actionError} />}
        <p style={{ color: 'var(--gray-600)', marginBottom: 16, lineHeight: 1.6 }}>
          Cette action bloquera immédiatement l'accès de l'utilisateur. Toutes les sessions actives seront révoquées.
        </p>
        <Field label="Motif de suspension" required>
          <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Activité suspecte, violation des CGU…" />
        </Field>
      </Modal>
    </>
  )
}
