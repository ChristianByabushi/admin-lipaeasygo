import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp, Result, Button } from 'antd'
import frFR from 'antd/locale/fr_FR'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import App from './App'
import './index.css'

dayjs.locale('fr')

// ── Global ErrorBoundary ───────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40 }}>
          <Result
            status="error"
            title="Erreur JavaScript"
            subTitle={this.state.error.message}
            extra={[
              <Button key="reload" type="primary" onClick={() => window.location.reload()}>
                Recharger la page
              </Button>,
            ]}
          >
            <pre style={{ fontSize: 11, background: '#F8FAFC', padding: 16, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error.stack}
            </pre>
          </Result>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// ── LipaEasyGo design tokens ──────────────────────────────────────────────────
const THEME = {
  token: {
    // Brand
    colorPrimary:        '#0F62FE',   // secondary (blue) = main CTA
    colorError:          '#EF4444',
    colorSuccess:        '#10B981',
    colorWarning:        '#F59E0B',
    colorInfo:           '#0F62FE',

    // Typography
    fontFamily:          "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:            14,
    fontSizeLG:          16,
    fontSizeSM:          12,

    // Layout
    borderRadius:        8,
    borderRadiusLG:      12,
    borderRadiusSM:      6,

    // Colors
    colorBgContainer:    '#ffffff',
    colorBgLayout:       '#F8FAFC',
    colorBorder:         '#E2E8F0',
    colorBorderSecondary:'#F1F5F9',
    colorText:           '#334155',
    colorTextSecondary:  '#64748B',
    colorTextTertiary:   '#94A3B8',
    colorTextQuaternary: '#CBD5E1',

    // Shadows
    boxShadow:           '0 1px 3px rgba(0,0,0,.04)',
    boxShadowSecondary:  '0 4px 14px rgba(15,23,42,.06)',

    // Sizing
    controlHeight:       38,
    lineWidth:           1,
    wireframe:           false,
  },
  components: {
    Layout: {
      siderBg:           '#0F1923',
      triggerBg:         '#0F1923',
      headerBg:          'rgba(255,255,255,0.85)',
      headerPadding:     '0 24px',
      headerHeight:      64,
      bodyBg:            '#F8FAFC',
    },
    Menu: {
      darkItemBg:        '#0F1923',
      darkSubMenuItemBg: '#0F1923',
      darkItemColor:     'rgba(255,255,255,0.55)',
      darkItemHoverColor:'#ffffff',
      darkItemSelectedColor: '#ffffff',
      darkItemSelectedBg: 'rgba(255,255,255,0.08)',
      itemBorderRadius:  8,
      itemMarginInline:  6,
    },
    Table: {
      headerBg:          '#F8FAFC',
      headerColor:       '#64748B',
      headerSortActiveBg:'#F1F5F9',
      rowHoverBg:        '#F8FAFC',
      borderColor:       '#E2E8F0',
    },
    Card: {
      headerBg:          '#ffffff',
    },
    Button: {
      borderRadius:      8,
      controlHeight:     36,
      paddingContentHorizontal: 16,
    },
    Input: {
      borderRadius:      8,
      controlHeight:     38,
    },
    Select: {
      borderRadius:      8,
    },
    Modal: {
      borderRadiusLG:    14,
    },
    Tag: {
      borderRadiusSM:    999,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider theme={THEME} locale={frFR}>
        <AntApp>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
