import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Textarea, Alert } from '../components/ui/Form'
import { fmtDateTime } from '../lib/format'
import { Spinner } from '../components/ui/Button'
import { IconKyc, IconApprove, IconReject, IconRefresh, IconCheck, IconX } from '../components/ui/Icon'

type Doc = {
  id: string; user_id: string; type: string; status: string
  submitted_at: string; smile_id_confidence?: string; document_url?: string
}

export default function KycQueue() {
  usePageTitle('KYC / Identité', ['Admin', 'KYC'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterUserId = searchParams.get('user') // vient de UserDetail → /kyc?user=ID

  const [selected, setSelected]   = useState<Doc | null>(null)
  const [rejectReason, setReason] = useState('')
  const [mode, setMode]           = useState<'approve' | 'reject' | null>(null)
  const [actionError, setError]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['kyc-queue', filterUserId],
    queryFn: () => api.get('/kyc/admin/queue', {
      params: filterUserId ? { user_id: filterUserId } : undefined,
    }).then((r) => r.data.data as Doc[]),
    refetchInterval: 30_000,
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => api.put(`/kyc/admin/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kyc-queue'] }); setSelected(null); setMode(null) },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/kyc/admin/${id}/reject`, null, { params: { rejection_reason: reason } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kyc-queue'] }); setSelected(null); setMode(null); setReason('') },
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <>
      <div className="kyc-layout">
        {/* Queue list */}
        <Card padding="0">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>File d'attente KYC</h3>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{data?.length ?? 0} document(s) en attente</p>
              {filterUserId && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: 'var(--secondary-light)', color: 'var(--secondary)',
                  }}>
                    Filtré pour 1 utilisateur
                  </span>
                  <button
                    onClick={() => navigate('/kyc')}
                    style={{ fontSize: 11, color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Voir tous
                  </button>
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['kyc-queue', filterUserId] })}>
              <IconRefresh size={14} /> Actualiser
            </Button>
          </div>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} color="var(--primary)" /></div>
          ) : !data || data.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--success-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <IconCheck size={24} color="var(--success)" />
              </div>
              <div>File d'attente vide, aucun document à examiner</div>
            </div>
          ) : (
            <div>
              {data.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px', cursor: 'pointer',
                    borderBottom: '1px solid var(--gray-50)',
                    background: selected?.id === doc.id ? 'var(--primary-light)' : '#fff',
                    transition: 'background .1s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--warning-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconKyc size={22} color="var(--warning)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>
                      {doc.type.replaceAll('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                      Utilisateur: {doc.user_id ? doc.user_id.slice(0, 8) + '…' : '—'} • {fmtDateTime(doc.submitted_at)}
                    </div>
                    {doc.smile_id_confidence && (
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>
                        Confiance SmileID: {(parseFloat(doc.smile_id_confidence) * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Reviewer panel */}
        {selected ? (
          <Card>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Revue du document</h3>
              <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>ID: {selected.id}</p>
            </div>
            <div style={{
              background: 'var(--gray-100)', borderRadius: 10,
              height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, overflow: 'hidden',
            }}>
              {selected.document_url ? (
                <img src={selected.document_url} alt="KYC document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--gray-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}>
                    <IconKyc size={24} color="var(--gray-400)" />
                  </div>
                  <div style={{ marginTop: 2, fontSize: 13 }}>Document signé AWS S3</div>
                  <a
                    href={selected.document_url ?? '#'}
                    style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, display: 'block' }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir le document →
                  </a>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              {[
                ['Type', selected.type.replaceAll('_', ' ')],
                ['Statut', selected.status],
                ['Utilisateur', selected.user_id ? selected.user_id.slice(0, 16) + '…' : '—'],
                ['Soumis le', fmtDateTime(selected.submitted_at)],
                ...(selected.smile_id_confidence ? [['Confiance SmileID', `${(parseFloat(selected.smile_id_confidence) * 100).toFixed(0)}%`]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray-50)', fontSize: 13 }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="primary"
                style={{ flex: 1, justifyContent: 'center' }}
                loading={approveMut.isPending}
                onClick={() => { setMode('approve'); approveMut.mutate(selected.id) }}
                icon={<IconApprove size={14} />}
              >
                Approuver
              </Button>
              <Button
                variant="danger"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setMode('reject')}
                icon={<IconReject size={14} />}
              >
                Rejeter
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'var(--gray-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <IconKyc size={26} color="var(--gray-400)" />
              </div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Aucun document sélectionné</div>
              <div style={{ fontSize: 13 }}>Cliquez sur un document pour l'examiner</div>
            </div>
          </Card>
        )}
      </div>

      {/* Reject modal */}
      <Modal
        open={mode === 'reject'}
        onClose={() => { setMode(null); setReason(''); setError('') }}
        title="Rejeter le document KYC"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)}>Annuler</Button>
            <Button
              variant="danger"
              loading={rejectMut.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMut.mutate({ id: selected!.id, reason: rejectReason })}
            >
              Confirmer le rejet
            </Button>
          </>
        }
      >
        {actionError && <Alert type="error" message={actionError} />}
        <p style={{ color: 'var(--gray-600)', marginBottom: 16, lineHeight: 1.6 }}>
          L'utilisateur sera notifié du rejet et pourra soumettre de nouveaux documents.
        </p>
        <Field label="Motif du rejet" required>
          <Textarea
            value={rejectReason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: photo floue, document expiré, identité non lisible…"
          />
        </Field>
      </Modal>
    </>
  )
}
