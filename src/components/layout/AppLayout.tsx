import React, { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Layout } from 'antd'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const { Content } = Layout

export const PageTitleContext = React.createContext<(title: string, breadcrumb?: string[]) => void>(() => {})

export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pageTitle, setPageTitle]   = useState('Tableau de bord')
  const [breadcrumb, setBreadcrumb] = useState<string[] | undefined>()

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const setTitle = useCallback((title: string, bc?: string[]) => {
    setPageTitle(title)
    setBreadcrumb(bc)
  }, [])

  return (
    <PageTitleContext.Provider value={setTitle}>
      <Layout style={{ minHeight: '100vh' }}>

        {/* ── Sidebar / Sider ── */}
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCollapse={setCollapsed}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* ── Main column ── */}
        <Layout style={{ background: '#F8FAFC' }}>
          <Header
            title={pageTitle}
            breadcrumb={breadcrumb}
            onMenuClick={() => setMobileOpen((o) => !o)}
          />
          <Content style={{
            padding: 24,
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </PageTitleContext.Provider>
  )
}

export function usePageTitle(title: string, breadcrumb?: string[]) {
  const setTitle = React.useContext(PageTitleContext)
  React.useEffect(() => {
    setTitle(title, breadcrumb)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])
}
