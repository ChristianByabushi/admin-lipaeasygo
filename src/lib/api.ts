import axios from 'axios'

// Always use a relative path so requests go through the Vite proxy.
// The Vite proxy (vite.config.ts) forwards /api → http://localhost:3000.
// Using a relative URL means:
//   - No CORS (same origin from the browser's perspective)
//   - No hardcoded IP/port that breaks on different machines
//   - Works in production behind a reverse proxy too
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// Attach stored token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Guard: prevent redirect storm
// Use sessionStorage so the flag resets on each new tab/page load.
// Also schedule a reset after 5 s in case the redirect is cancelled (e.g.
// browser back button or SPA navigation that stays on the same page).
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const alreadyRedirecting = sessionStorage.getItem('_admin_redirecting') === '1'
    if (
      err.response?.status === 401 &&
      !alreadyRedirecting &&
      !window.location.pathname.startsWith('/login')
    ) {
      sessionStorage.setItem('_admin_redirecting', '1')
      setTimeout(() => sessionStorage.removeItem('_admin_redirecting'), 5000)
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export type ApiError = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data

    // Format standard de l'API : { error: { message, code, details } }
    const backendMsg = data?.error?.message
    if (backendMsg) return backendMsg

    // Fallback : format natif FastAPI 422 { detail: [{loc, msg, type}] }
    // (si le handler middleware n'est pas encore enregistré sur ce service)
    if (err.response?.status === 422 && Array.isArray(data?.detail)) {
      const parts = (data.detail as Array<{ loc: string[]; msg: string }>)
        .map((e) => {
          const field = (e.loc ?? []).filter((p) => p !== 'body' && p !== 'query').join(' → ')
          return field ? `${field} : ${e.msg}` : e.msg
        })
      return parts.join(' | ') || 'Données invalides.'
    }

    if (err.response?.status === 409) return 'Ce numéro de téléphone est déjà enregistré.'
    if (err.response?.status === 403) return 'Accès refusé. Vérifiez vos permissions.'
    if (err.response?.status === 422) return 'Données invalides. Vérifiez les champs du formulaire.'
    if (err.response?.status) return `Erreur ${err.response.status}`
    return err.message
  }
  return String(err)
}
