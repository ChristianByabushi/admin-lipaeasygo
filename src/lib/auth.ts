/**
 * Admin auth helpers.
 *
 * ─── Nomenclature du système ────────────────────────────────────────────────
 *
 * UTILISATEURS : tous les comptes du système (terme générique)
 *
 * Agents spéciaux (gérés dans /admins) :
 *   super_admin     — accès total
 *   admin           — gestion opérationnelle complète
 *   finance_officer — opérations financières, taux, frais, dépôts
 *   kyc_reviewer    — révision des documents d'identité
 *   support_agent   — tickets et assistance clients
 *
 * Agents-terrain (gérés dans /agents) :
 *   Revendeurs physiques qui facilitent dépôts/retraits pour les clients.
 *   S'authentifient par mot de passe fort (pas de PIN).
 *
 * Clients (gérés dans /users) :
 *   Consommateurs finaux de l'application mobile.
 *   Utilisent un PIN 4-6 chiffres pour s'authentifier.
 *
 * ─── Flux auth ───────────────────────────────────────────────────────────────
 *   1. Admin logs in via AWS Cognito (Hosted UI or SDK).
 *   2. Cognito redirects back with an access_token in the URL hash.
 *   3. We store the token in localStorage and use it in all API calls.
 *
 * In LOCAL / DEVELOPMENT mode (VITE_AUTH_MODE=dev):
 *   - A mock token is issued after entering email + password.
 *   - The token is a plain base64 payload with role info.
 *   - The backend (cognito_auth.py) decodes it without signature
 *     verification when COGNITO_USER_POOL_ID is empty.
 */

export interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: AdminRole
  is_active: boolean
}

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'kyc_reviewer'
  | 'support_agent'
  | 'finance_officer'

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:      'Super Admin',
  admin:            'Admin',
  kyc_reviewer:     'Réviseur KYC',
  support_agent:    'Agent Support',
  finance_officer:  'Responsable Financier',
}

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin:     '#CE1126',
  admin:           '#007FFF',
  kyc_reviewer:    '#10B981',
  support_agent:   '#F59E0B',
  finance_officer: '#8B5CF6',
}

/**
 * Matrice des permissions par rôle.
 *
 * Format : resource.action ou resource.*
 * Spécial : '*' = tout autoriser (super_admin uniquement)
 *
 * admins.read  = voir la liste des agents spéciaux
 * admins.write = créer / modifier les comptes d'agents spéciaux de niveau inférieur
 *
 * Règle : un admin peut gérer les rôles finance_officer, kyc_reviewer, support_agent
 *         mais PAS les autres admin ni super_admin (appliqué côté backend).
 */
export const CAN: Record<AdminRole, string[]> = {
  super_admin:     ['*'],

  admin: [
    'users.*',
    'transactions.*',
    'kyc.*',
    'agents.*',           // agents-terrain : lecture + approbation + suspension
    'support.*',
    'rates.read',
    'finance.read',
    'audit.read',
    'admins.read',        // voir la liste des agents spéciaux
    'admins.write',       // créer / modifier les agents spéciaux de niveau inférieur
  ],

  kyc_reviewer:    ['kyc.*', 'users.read'],

  support_agent:   ['support.*', 'users.read', 'transactions.read'],

  finance_officer: ['transactions.*', 'settings.*', 'rates.*', 'finance.*', 'agents.read'],
}

export function can(role: AdminRole, permission: string): boolean {
  const perms = CAN[role] ?? []
  if (perms.includes('*')) return true
  if (perms.includes(permission)) return true
  const [resource, action] = permission.split('.')
  if (perms.includes(`${resource}.*`)) return true
  if (action === 'read' && perms.some((p) => p.startsWith(`${resource}.`))) return true
  return false
}

// ── Storage helpers ──────────────────────────────────────────────────────────

export function getStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuth(token: string, user: AdminUser): void {
  localStorage.setItem('admin_token', token)
  localStorage.setItem('admin_user', JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('admin_token')
}

// ── Dev-mode mock token (decoded by backend in dev) ──────────────────────────

export function createDevToken(sub: string, role: AdminRole): string {
  const header  = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    sub,
    email: `dev-${role}@lipaeasygo.com`,
    role,
    token_use: 'access',
    exp: Math.floor(Date.now() / 1000) + 86400,
  }))
  return `${header}.${payload}.`
}
