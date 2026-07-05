/** Formatting utilities */

export function fmtMoney(value: string | number, currency = 'CDF'): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-CD', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ` ${currency}`
}

export function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function fmtPhone(p: string): string {
  if (!p) return '—'
  return p.startsWith('+243') ? p : `+${p.replace(/\D/g, '')}`
}

export function truncate(s: string, n = 32): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export function initials(first: string, last: string): string {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`
}

export const TX_TYPE_LABELS: Record<string, string> = {
  p2p_send:           'Envoi P2P',
  topup_agent:        'Dépôt agent',
  topup_mobile_money: 'Mobile Money',
  cashout_agent:      'Retrait agent',
  topup_stripe:       'Carte bancaire',
  swap_debit:         'Conversion (débit)',
  swap_credit:        'Conversion (crédit)',
  commission:         'Commission',
  fee:                'Frais',
  float_transfer:     'Transfert float',
  float_topup:        'Recharge float',
}

export const TX_STATUS_COLORS: Record<string, string> = {
  completed:  'var(--success)',
  pending:    'var(--warning)',
  processing: 'var(--info)',
  failed:     'var(--error)',
  frozen:     'var(--gray-500)',
  cancelled:  'var(--gray-400)',
}

export const KYC_STATUS_COLORS: Record<string, string> = {
  pending:      'var(--gray-400)',
  under_review: 'var(--warning)',
  verified:     'var(--success)',
  rejected:     'var(--error)',
}
