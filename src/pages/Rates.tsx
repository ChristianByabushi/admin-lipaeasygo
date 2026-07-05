import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../lib/api'
import { usePageTitle } from '../components/layout/AppLayout'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select, Alert } from '../components/ui/Form'
import { fmtDateTime } from '../lib/format'
import { IconCurrency, IconRates, IconWarning } from '../components/ui/Icon'

type Rate = {
  id: string; base_currency: string; quote_currency: string
  market_rate: string; platform_rate: string; spread_percent?: string
  source?: string; valid_from: string; valid_until?: string
}

/** Formate un taux de change de façon lisible.
 *  USD→CDF : 2 décimales (ex : 2 850,00)
 *  CDF→USD : 6 décimales (ex : 0,000351)
 *  Autres  : 4 décimales
 */
function fmtRate(value: string, base: string, quote: string): string {
  const n = parseFloat(value)
  if (isNaN(n)) return value
  let decimals = 4
  if (base === 'USD' && quote === 'CDF') decimals = 2
  if (base === 'EUR' && quote === 'CDF') decimals = 2
  if (base === 'CDF' && quote === 'USD') decimals = 6
  if (base === 'CDF' && quote === 'EUR') decimals = 6
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export default function Rates() {
  usePageTitle('Taux de change', ['Admin', 'Taux de change'])
  const qc = useQueryClient()
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ base_currency: 'USD', quote_currency: 'CDF', market_rate: '', platform_rate: '', spread_percent: '', source: 'manual' })
  const [formError, setFormError] = useState('')

  // Auto-calculate spread when both rates are filled
  function updateRate(patch: Partial<typeof form>) {
    const updated = { ...form, ...patch }
    const market   = parseFloat(updated.market_rate)
    const platform = parseFloat(updated.platform_rate)
    if (market > 0 && platform > 0 && !updated.spread_percent) {
      // spread = (market - platform) / market * 100
      const spread = ((market - platform) / market * 100).toFixed(2)
      updated.spread_percent = spread
    }
    setForm(updated)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rates'],
    queryFn: () => api.get('/admin/rates').then((r) => r.data.data as Rate[]),
  })

  const createMut = useMutation({
    mutationFn: (body: typeof form) => {
      // Strip empty strings from optional numeric fields so Pydantic doesn't
      // receive '' where it expects a Decimal — that causes a 422 and axios
      // reports it as "Network Error" because the response has no body.
      const payload: Record<string, unknown> = {
        base_currency:  body.base_currency,
        quote_currency: body.quote_currency,
        market_rate:    body.market_rate,
        platform_rate:  body.platform_rate,
        source:         body.source || 'manual',
      }
      // Only include spread if the user entered a value
      if (body.spread_percent && body.spread_percent.trim() !== '') {
        payload.spread_percent = body.spread_percent
      }
      return api.post('/admin/rates', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rates'] })
      setShowNew(false)
      setFormError('')
      setForm({ base_currency: 'USD', quote_currency: 'CDF', market_rate: '', platform_rate: '', spread_percent: '', source: 'manual' })
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  })

  const CURRENCIES = [{ value: 'USD', label: 'USD (Dollar US)' }, { value: 'CDF', label: 'CDF (Franc Congolais)' }, { value: 'EUR', label: 'EUR (Euro)' }]

  return (
    <>
      <Card>
        <CardHeader
          title="Taux de change actifs"
          subtitle="Gérez les taux CDF/USD affichés dans l'application"
          action={
            <Button onClick={() => setShowNew(true)} icon={<span style={{fontSize:16,lineHeight:1}}>+</span>}>
              Nouveau taux
            </Button>
          }
        />
        {isLoading ? (
          <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>Chargement…</p>
        ) : !data || data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--secondary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <IconCurrency size={26} color="var(--secondary)" />
            </div>
            <div>Aucun taux configuré</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {data.map((r) => (
              <div key={r.id} style={{
                padding: 16, borderRadius: 12,
                border: `1.5px solid ${r.valid_until ? 'var(--gray-200)' : 'var(--success)'}`,
                background: r.valid_until ? 'var(--gray-50)' : '#fff',
                opacity: r.valid_until ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--secondary-light)', color: 'var(--secondary)',
                    fontWeight: 700, fontSize: 12,
                  }}>{r.base_currency}</span>
                  <span style={{ fontSize: 14, color: 'var(--gray-400)' }}>→</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    fontWeight: 700, fontSize: 12,
                  }}>{r.quote_currency}</span>
                  {!r.valid_until && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, color: 'var(--success)',
                      background: 'var(--success-light)', padding: '2px 8px', borderRadius: 999,
                      fontWeight: 600,
                    }}>Actif</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'var(--gray-400)', fontSize: 11, marginBottom: 2 }}>Taux marché</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
                      {fmtRate(r.market_rate, r.base_currency, r.quote_currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--gray-400)', fontSize: 11, marginBottom: 2 }}>Taux plateforme</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                      {fmtRate(r.platform_rate, r.base_currency, r.quote_currency)}
                    </div>
                  </div>
                </div>
                {r.spread_percent && parseFloat(r.spread_percent) > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--warning)', background: 'var(--warning-light)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                    Spread {parseFloat(r.spread_percent).toFixed(2)} %
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray-400)' }}>
                  Valide depuis : {fmtDateTime(r.valid_from)}
                  {r.valid_until && <span> → expiré {fmtDateTime(r.valid_until)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New rate modal */}
      <Modal
        open={showNew}
        onClose={() => { setShowNew(false); setFormError('') }}
        title="Créer un nouveau taux"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button
              loading={createMut.isPending}
              disabled={!form.market_rate || !form.platform_rate}
              onClick={() => createMut.mutate(form)}
            >
              Publier le taux
            </Button>
          </>
        }
      >
        {formError && <Alert type="error" message={formError} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Devise de base" required>
            <Select value={form.base_currency} onChange={(e) => updateRate({ base_currency: e.target.value, spread_percent: '' })} options={CURRENCIES} />
          </Field>
          <Field label="Devise cible" required>
            <Select value={form.quote_currency} onChange={(e) => updateRate({ quote_currency: e.target.value, spread_percent: '' })} options={CURRENCIES} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Taux marché" required hint="Taux de référence (BCC)">
            <Input
              type="number" step="0.0001"
              value={form.market_rate}
              onChange={(e) => updateRate({ market_rate: e.target.value, spread_percent: '' })}
              placeholder={form.base_currency === 'USD' ? '2850.00' : '0.000351'}
            />
          </Field>
          <Field label="Taux plateforme" required hint="Taux appliqué aux utilisateurs">
            <Input
              type="number" step="0.0001"
              value={form.platform_rate}
              onChange={(e) => updateRate({ platform_rate: e.target.value })}
              placeholder={form.base_currency === 'USD' ? '2820.00' : '0.000348'}
            />
          </Field>
        </div>
        <Field
          label="Spread %"
          hint={
            form.market_rate && form.platform_rate
              ? 'Calculé automatiquement — modifiable'
              : 'Auto-calculé dès que les deux taux sont remplis'
          }
        >
          <Input
            type="number" step="0.01"
            value={form.spread_percent}
            onChange={(e) => setForm({ ...form, spread_percent: e.target.value })}
            placeholder="1.05"
          />
        </Field>
        <Field label="Source">
          <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[
              { value: 'manual',    label: 'Saisie manuelle'              },
              { value: 'bcc',       label: 'BCC (Banque Centrale du Congo)' },
              { value: 'bloomberg', label: 'Bloomberg'                    },
            ]}
          />
        </Field>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--warning-light)', fontSize: 12, color: 'var(--warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconWarning size={14} color="var(--warning)" />
          La publication expire le taux précédent immédiatement et met à jour le cache Redis.
        </div>
      </Modal>
    </>
  )
}
