import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Breadcrumb, Avatar, Badge, Button, Tooltip, Typography, Divider } from 'antd'
import { BellOutlined, MenuOutlined } from '@ant-design/icons'
import { getStoredUser, ROLE_COLORS, ROLE_LABELS } from '../../lib/auth'

const { Header: AntHeader } = Layout
const { Text } = Typography

interface HeaderProps {
  title: string
  breadcrumb?: string[]
  onMenuClick?: () => void
}

export function Header({ title, breadcrumb, onMenuClick }: HeaderProps) {
  const user     = useStoredUser()
  const navigate = useNavigate()

  return (
    <AntHeader style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(15,23,42,0.06)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>

        {/* Mobile hamburger */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
          className="mobile-menu-btn"
          style={{ display: 'none' }}
        />

        {/* Breadcrumb + title */}
        <div style={{ minWidth: 0 }}>
          {breadcrumb && breadcrumb.length > 1 && (
            <Breadcrumb
              style={{ fontSize: 11, lineHeight: 1, marginBottom: 2 }}
              items={breadcrumb.map((b) => ({ title: b }))}
            />
          )}
          <Text strong style={{ fontSize: 17, color: '#0F172A', lineHeight: 1.2, display: 'block' }}>
            {title}
          </Text>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>

        {/* Notification bell */}
        <Tooltip title="Notifications">
          <Badge count={0} showZero={false}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              style={{ width: 38, height: 38 }}
            />
          </Badge>
        </Tooltip>

        <Divider type="vertical" style={{ height: 24, margin: '0 4px' }} className="hide-mobile" />

        {/* Admin avatar → profile */}
        {user && (
          <Tooltip title="Mon profil">
            <div
              onClick={() => navigate('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <Avatar
                size={36}
                style={{
                  background: ROLE_COLORS[user.role] ?? '#6B7280',
                  fontWeight: 700, fontSize: 13,
                }}
              >
                {(user.first_name?.[0] ?? '').toUpperCase()}{(user.last_name?.[0] ?? '').toUpperCase()}
              </Avatar>
              <div className="header-user-name" style={{ lineHeight: 1.3 }}>
                <Text strong style={{ fontSize: 13, color: '#1E293B', whiteSpace: 'nowrap', display: 'block' }}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                  {ROLE_LABELS[user.role]}
                </Text>
              </div>
            </div>
          </Tooltip>
        )}
      </div>
    </AntHeader>
  )
}

function useStoredUser() {
  return getStoredUser()
}
