import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Alert, Typography, Space } from 'antd'
import { MailOutlined, LockOutlined, SafetyOutlined, FileProtectOutlined, DollarOutlined } from '@ant-design/icons'
import { Logo } from '../components/ui/Logo'
import { api, getErrorMessage } from '../lib/api'
import { setStoredAuth } from '../lib/auth'

const { Title, Text, Link } = Typography

// ── Watermark items shown in the background ────────────────────────────────

const FEATURES = [
  { icon: <SafetyOutlined />,     label: 'KYC intégré'    },
  { icon: <FileProtectOutlined />, label: 'Conformité AML' },
  { icon: <DollarOutlined />,     label: 'Multi-devises'  },
]

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form]                = Form.useForm()

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/admin/auth/login', {
        email:    values.email.trim().toLowerCase(),
        password: values.password,
      })
      const { access_token, admin } = res.data.data
      setStoredAuth(access_token, {
        id:         admin.id,
        email:      admin.email,
        first_name: admin.first_name,
        last_name:  admin.last_name,
        role:       admin.role,
        is_active:  admin.is_active,
      })
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 60% 40%, #1e3a5f 0%, #0f172a 60%, #1a0a0f 100%)',
    }}>

      {/* ── Background watermark layer ─────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        pointerEvents: 'none',
        zIndex: 0,
        userSelect: 'none',
      }}>
        {/* Logo watermark */}
        <div style={{ opacity: 0.06, marginBottom: 32 }}>
          <Logo variant="white" height={48} alt="" />
        </div>

        {/* Headline watermark */}
        <div style={{
          opacity: 0.05,
          fontSize: 72,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          maxWidth: 600,
        }}>
          La finance<br />
          mobile au<br />
          service de la<br />
          <span style={{ color: '#E01E37' }}>RDC</span>
        </div>

        {/* Feature chips watermark */}
        <div style={{ display: 'flex', gap: 12, marginTop: 40, opacity: 0.06 }}>
          {FEATURES.map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              border: '1.5px solid #fff',
              color: '#fff', fontSize: 14, fontWeight: 500,
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div style={{
          position: 'absolute', right: -180, top: -180,
          width: 700, height: 700, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.06)',
          opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -160,
          width: 500, height: 500, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.05)',
          opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', left: -100, top: '40%',
          width: 300, height: 300, borderRadius: '50%',
          border: '1px solid rgba(224,30,55,.08)',
          opacity: 0.5,
        }} />
      </div>

      {/* ── Login card — centred, elevated above watermark ─────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: 420,
        margin: '24px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, #E01E37 0%, #0F62FE 50%, #E01E37 100%)',
          backgroundSize: '200% 100%',
        }} />

        <div style={{ padding: '36px 40px 32px' }}>

          {/* Logo */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <Logo variant="horizontal" height={28} alt="LipaEasyGo" />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Bon retour
            </Title>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              Connectez-vous à votre espace administrateur
            </Text>
          </div>

          {/* Error */}
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="email"
              label={<Text strong style={{ fontSize: 12, color: '#475569' }}>Adresse e-mail</Text>}
              rules={[
                { required: true, message: 'Veuillez saisir votre email' },
                { type: 'email', message: 'Email invalide' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                placeholder="vous@lipaeasygo.com"
                autoComplete="email"
                autoFocus
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<Text strong style={{ fontSize: 12, color: '#475569' }}>Mot de passe</Text>}
              rules={[
                { required: true, message: 'Veuillez saisir votre mot de passe' },
                { min: 6, message: 'Minimum 6 caractères' },
              ]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  height: 48,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0F62FE 0%, #0043CE 100%)',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(15,98,254,0.35)',
                  letterSpacing: '0.01em',
                }}
              >
                Se connecter
              </Button>
            </Form.Item>
          </Form>

          {/* Help */}
          <div style={{
            marginTop: 20,
            padding: '12px 14px',
            borderRadius: 8,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: 12,
            color: '#64748B',
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            Pas d'accès ?{' '}
            <Link href="mailto:admin@lipaeasygo.com" style={{ fontSize: 12, fontWeight: 600 }}>
              Contacter l'administrateur
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 40px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FAFAFA',
        }}>
          <Text style={{ fontSize: 11, color: '#94A3B8' }}>
            © {new Date().getFullYear()} LipaEasyGo
          </Text>
          <Space size={16}>
            {['Confidentialité', 'Conditions'].map((l) => (
              <Link key={l} href="#" style={{ fontSize: 11, color: '#94A3B8' }}>{l}</Link>
            ))}
          </Space>
        </div>
      </div>
    </div>
  )
}
