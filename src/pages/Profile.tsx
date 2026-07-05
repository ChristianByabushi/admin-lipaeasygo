import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Form, Input, Button, Alert, Avatar, Tag, Descriptions, Typography, Space, Divider, Row, Col,
} from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, SaveOutlined } from '@ant-design/icons'
import { api, getErrorMessage } from '../lib/api'
import { getStoredUser, setStoredAuth, ROLE_LABELS, ROLE_COLORS } from '../lib/auth'
import { usePageTitle } from '../components/layout/AppLayout'

const { Title, Text } = Typography

export default function Profile() {
  usePageTitle('Mon profil', ['Admin', 'Mon profil'])

  const qc   = useQueryClient()
  const user = getStoredUser()

  const [infoForm]   = Form.useForm()
  const [emailForm]  = Form.useForm()
  const [pwdForm]    = Form.useForm()

  const [infoMsg,  setInfoMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwdMsg,   setPwdMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isSuperAdmin = user?.role === 'super_admin'
  const roleColor    = ROLE_COLORS[user?.role ?? 'admin'] ?? '#6B7280'
  const roleLabel    = ROLE_LABELS[user?.role ?? 'admin'] ?? user?.role
  const initials     = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  // ── Info mutation ─────────────────────────────────────────────────────────
  const infoMut = useMutation({
    mutationFn: (values: { first_name: string; last_name: string }) =>
      api.put('/admin/me', values),
    onSuccess: (res, values) => {
      if (user) setStoredAuth(localStorage.getItem('admin_token')!, { ...user, ...values })
      setInfoMsg({ type: 'success', text: 'Profil mis à jour.' })
      qc.invalidateQueries({ queryKey: ['admin-me'] })
    },
    onError: (e) => setInfoMsg({ type: 'error', text: getErrorMessage(e) }),
  })

  // ── Email mutation (super_admin only) ─────────────────────────────────────
  const emailMut = useMutation({
    mutationFn: (values: { new_email: string }) => api.put('/admin/me/email', values),
    onSuccess: (_, values) => {
      if (user) setStoredAuth(localStorage.getItem('admin_token')!, { ...user, email: values.new_email })
      setEmailMsg({ type: 'success', text: 'E-mail mis à jour.' })
    },
    onError: (e) => setEmailMsg({ type: 'error', text: getErrorMessage(e) }),
  })

  // ── Password mutation ─────────────────────────────────────────────────────
  const pwdMut = useMutation({
    mutationFn: (values: { current_password: string; new_password: string }) =>
      api.put('/admin/me/password', values),
    onSuccess: () => {
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' })
      pwdForm.resetFields()
    },
    onError: (e) => setPwdMsg({ type: 'error', text: getErrorMessage(e) }),
  })

  if (!user) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Avatar size={80} style={{ background: roleColor, fontSize: 28, fontWeight: 800 }}>
            {initials}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0 }}>{user.first_name} {user.last_name}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{user.email}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={roleColor} style={{ borderRadius: 999, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {roleLabel}
              </Tag>
            </div>
          </div>
          <Tag color={user.is_active ? 'success' : 'error'} style={{ fontSize: 12, fontWeight: 600 }}>
            {user.is_active ? 'Compte actif' : 'Compte inactif'}
          </Tag>
        </div>
      </Card>

      {/* ── Informations personnelles ── */}
      <Card title="Informations personnelles" style={{ borderRadius: 12 }}>
        {infoMsg && <Alert type={infoMsg.type} message={infoMsg.text} showIcon style={{ marginBottom: 16 }} />}
        <Form
          form={infoForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ first_name: user.first_name, last_name: user.last_name }}
          onFinish={(v) => { setInfoMsg(null); infoMut.mutate(v) }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="first_name" label="Prénom" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="Prénom" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Nom de famille" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="Nom" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={infoMut.isPending} icon={<SaveOutlined />}>
              Enregistrer
            </Button>
          </div>
        </Form>
      </Card>

      {/* ── Email (super_admin uniquement) ── */}
      <Card title="Adresse e-mail" style={{ borderRadius: 12 }}>
        {emailMsg && <Alert type={emailMsg.type} message={emailMsg.text} showIcon style={{ marginBottom: 16 }} />}
        {isSuperAdmin ? (
          <Form
            form={emailForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{ new_email: user.email }}
            onFinish={(v) => { setEmailMsg(null); emailMut.mutate(v) }}
          >
            <Form.Item name="new_email" label="Nouvelle adresse e-mail" rules={[{ required: true }, { type: 'email' }]}
              extra="Modifiable car vous êtes super_admin.">
              <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="admin@lipaeasygo.com" />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="default" htmlType="submit" loading={emailMut.isPending} icon={<MailOutlined />}>
                Mettre à jour l'e-mail
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <Input
              prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
              value={user.email}
              disabled
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
              Lecture seule — contactez un super_admin pour modifier.
            </Text>
          </>
        )}
      </Card>

      {/* ── Mot de passe ── */}
      <Card title="Sécurité — Changer le mot de passe" style={{ borderRadius: 12 }}>
        {pwdMsg && <Alert type={pwdMsg.type} message={pwdMsg.text} showIcon style={{ marginBottom: 16 }} />}
        <Form
          form={pwdForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(v) => {
            if (v.new_password !== v.confirm_password) {
              setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
              return
            }
            setPwdMsg(null)
            pwdMut.mutate({ current_password: v.current_password, new_password: v.new_password })
          }}
        >
          <Form.Item name="current_password" label="Mot de passe actuel" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="new_password" label="Nouveau mot de passe" rules={[{ required: true }, { min: 8, message: 'Minimum 8 caractères' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="••••••••" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="confirm_password" label="Confirmer" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="••••••••" autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button htmlType="submit" loading={pwdMut.isPending} icon={<LockOutlined />}>
              Changer le mot de passe
            </Button>
          </div>
        </Form>
      </Card>

      {/* ── Détails compte ── */}
      <Card title="Détails du compte" style={{ borderRadius: 12 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Identifiant">
            <Text code style={{ fontSize: 11 }}>{user.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Rôle">
            <Tag color={roleColor} style={{ fontWeight: 600 }}>{roleLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Statut">
            <Tag color={user.is_active ? 'success' : 'error'}>{user.is_active ? 'Actif' : 'Inactif'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
