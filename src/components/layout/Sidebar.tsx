import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Drawer, Typography, Divider, Tooltip } from 'antd'
import {
  DashboardOutlined, TeamOutlined, TransactionOutlined, SafetyOutlined,
  ShopOutlined, CustomerServiceOutlined, DollarOutlined, SettingOutlined,
  AuditOutlined, LockOutlined, LogoutOutlined, WifiOutlined, WalletOutlined,
} from '@ant-design/icons'
import { can, clearAuth, getStoredUser, ROLE_COLORS, ROLE_LABELS } from '../../lib/auth'
import { Logo } from '../ui/Logo'

const { Sider } = Layout
const { Text } = Typography

// ── Nav items config ──────────────────────────────────────────────────────────

const NAV = [
  { path: '/',             icon: <DashboardOutlined />,       label: 'Tableau de bord',   perm: null               },
  { path: '/users',        icon: <TeamOutlined />,            label: 'Clients',            perm: 'users.read'        },
  { path: '/transactions', icon: <TransactionOutlined />,     label: 'Transactions',       perm: 'transactions.read' },
  { path: '/finance',      icon: <WalletOutlined />,          label: 'Caisse / Dépôts',    perm: 'finance.read'      },
  { path: '/kyc',          icon: <SafetyOutlined />,          label: 'KYC / Identité',     perm: 'kyc.read'          },
  { path: '/agents',       icon: <ShopOutlined />,            label: 'Agents-Terrain',     perm: 'agents.read'       },
  { path: '/support',      icon: <CustomerServiceOutlined />, label: 'Support',            perm: 'support.read'      },
  { path: '/rates',        icon: <DollarOutlined />,          label: 'Taux de change',     perm: 'rates.read'        },
  { path: '/settings',     icon: <SettingOutlined />,         label: 'Paramètres',         perm: 'settings.read'     },
  { path: '/audit',        icon: <AuditOutlined />,           label: "Journal d'audit",    perm: 'audit.read'        },
  { path: '/admins',       icon: <LockOutlined />,            label: 'Agents spéciaux',    perm: 'admins.read'       },
  { path: '/connectivity', icon: <WifiOutlined />,            label: 'Connectivité',       perm: 'super_admin'       },
]

// ── User card (bottom of sidebar) ────────────────────────────────────────────

function UserCard({ collapsed, onProfile }: { collapsed: boolean; onProfile: () => void }) {
  const user = getStoredUser()
  if (!user) return null
  const roleColor = ROLE_COLORS[user.role] ?? '#6B7280'
  const initials  = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  const avatar = (
    <Avatar
      size={32}
      style={{ background: roleColor, fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
      onClick={onProfile}
    >
      {initials}
    </Avatar>
  )

  if (collapsed) {
    return (
      <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={`${user.first_name} ${user.last_name}`} placement="right">
          {avatar}
        </Tooltip>
      </div>
    )
  }

  return (
    <div
      onClick={onProfile}
      style={{
        padding: '10px 12px',
        margin: '0 8px',
        borderRadius: 10,
        cursor: 'pointer',
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.05)',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {avatar}
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <Text ellipsis style={{ color: '#fff', fontWeight: 600, fontSize: 13, display: 'block' }}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={{
            display: 'inline-block', marginTop: 2,
            padding: '1px 7px', borderRadius: 999,
            background: roleColor + '22', color: roleColor,
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          }}>
            {ROLE_LABELS[user.role]}
          </Text>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar content (shared between Sider and Drawer) ────────────────────────

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = getStoredUser()

  const visibleNav = NAV.filter(({ perm }) => {
    if (!user) return false
    if (perm === null)          return true
    if (perm === 'super_admin') return user.role === 'super_admin'
    return can(user.role, perm)
  })

  // Determine active key — exact match for '/', prefix match for others
  const activeKey = visibleNav.find(({ path }) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.path ?? '/'

  const menuItems = visibleNav.map(({ path, icon, label }) => ({
    key:   path,
    icon,
    label: label,   // toujours inclus — antd gère l'affichage via inlineCollapsed
    onClick: () => navigate(path),
  }))

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0F1923' }}>

      {/* Logo */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: collapsed ? '0 10px' : '0 16px',
        borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0,
      }}>
        {collapsed
          ? <Logo variant="icon" height={32} style={{ borderRadius: 8 }} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Logo variant="white" height={28} alt="LipaEasyGo" />
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 4 }}>
                Admin Portal
              </Text>
            </div>
          )
        }
      </div>

      {/* Navigation */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[activeKey]}
        inlineCollapsed={collapsed}
        items={menuItems}
        style={{
          flex: 1, background: '#0F1923', border: 'none',
          overflowY: 'auto', overflowX: 'hidden',
          paddingTop: 8,
        }}
      />

      {/* User card + logout */}
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        <Divider style={{ borderColor: 'rgba(255,255,255,.06)', margin: '8px 0' }} />
        <UserCard collapsed={collapsed} onProfile={() => navigate('/profile')} />
        <div
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px 0' : '10px 16px',
            margin: '4px 8px 0', borderRadius: 8, cursor: 'pointer',
            color: 'rgba(255,255,255,.4)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(239,68,68,.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,.4)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogoutOutlined style={{ fontSize: 16 }} />
          {!collapsed && <Text style={{ color: 'inherit', fontSize: 13 }}>Se déconnecter</Text>}
        </div>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCollapse: (v: boolean) => void
  onMobileClose: () => void
}

// ── Sidebar component ─────────────────────────────────────────────────────────

export function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop — Ant Design Sider */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        width={240}
        collapsedWidth={64}
        style={{
          overflow: 'hidden',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          background: '#0F1923',
        }}
        className="desktop-sidebar"
        trigger={null}
      >
        <SidebarContent collapsed={collapsed} />
      </Sider>

      {/* Mobile — Drawer */}
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        placement="left"
        width={240}
        styles={{ body: { padding: 0, background: '#0F1923' }, header: { display: 'none' } }}
        className="mobile-sidebar-drawer"
      >
        <SidebarContent collapsed={false} />
      </Drawer>
    </>
  )
}
