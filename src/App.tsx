import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { isAuthenticated, getStoredUser, can } from './lib/auth'
import { IconAdmins, IconSuspend } from './components/ui/Icon'

// Pages
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Users      from './pages/Users'
import UserDetail from './pages/UserDetail'
import Transactions from './pages/Transactions'
import KycQueue   from './pages/KycQueue'
import Agents     from './pages/Agents'
import Support    from './pages/Support'
import Rates      from './pages/Rates'
import Settings   from './pages/Settings'
import AuditLog   from './pages/AuditLog'
import Admins     from './pages/Admins'
import Finance    from './pages/Finance'
import Profile    from './pages/Profile'
import Connectivity from './pages/Connectivity'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ children, perm }: { children: React.ReactNode; perm: string }) {
  const user = getStoredUser()
  if (!user) return <Navigate to="/login" replace />
  if (perm === 'super_admin' && user.role !== 'super_admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--error-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <IconAdmins size={30} color="var(--error)" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>Accès refusé</h3>
        <p>Cette section requiert le rôle <strong>Super Admin</strong>.</p>
      </div>
    )
  }
  if (!can(user.role, perm)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--error-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <IconSuspend size={30} color="var(--error)" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>Permission insuffisante</h3>
        <p>Votre rôle <strong>{user.role}</strong> ne vous autorise pas à accéder à cette section.</p>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index                element={<Dashboard />} />
        <Route path="users"         element={<RequireRole perm="users.read"><Users /></RequireRole>} />
        <Route path="users/:id"     element={<RequireRole perm="users.read"><UserDetail /></RequireRole>} />
        <Route path="transactions"  element={<RequireRole perm="transactions.read"><Transactions /></RequireRole>} />
        <Route path="finance"       element={<RequireRole perm="finance.read"><Finance /></RequireRole>} />
        <Route path="kyc"           element={<RequireRole perm="kyc.read"><KycQueue /></RequireRole>} />
        <Route path="agents"        element={<RequireRole perm="agents.read"><Agents /></RequireRole>} />
        <Route path="support"       element={<RequireRole perm="support.read"><Support /></RequireRole>} />
        <Route path="rates"         element={<RequireRole perm="rates.read"><Rates /></RequireRole>} />
        <Route path="settings"      element={<RequireRole perm="settings.read"><Settings /></RequireRole>} />
        <Route path="audit"         element={<RequireRole perm="audit.read"><AuditLog /></RequireRole>} />
        <Route path="admins"        element={<RequireRole perm="admins.read"><Admins /></RequireRole>} />
        <Route path="profile"       element={<Profile />} />
        <Route path="connectivity"  element={<RequireRole perm="super_admin"><Connectivity /></RequireRole>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
