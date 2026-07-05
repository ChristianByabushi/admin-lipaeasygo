/**
 * Button — thin wrapper autour d'antd Button.
 * Conserve l'ancienne API (variant/size/loading/icon) pour ne pas modifier les pages.
 */
import React from 'react'
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<AntButtonProps, 'type' | 'size' | 'danger' | 'variant'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const VARIANT_MAP: Record<Variant, Partial<AntButtonProps>> = {
  primary:   { type: 'primary' },
  secondary: { type: 'primary', style: { background: '#0F62FE', borderColor: '#0F62FE' } },
  danger:    { type: 'primary', danger: true },
  ghost:     { type: 'text' },
  outline:   { type: 'default' },
}

const SIZE_MAP: Record<Size, AntButtonProps['size']> = {
  sm: 'small',
  md: 'middle',
  lg: 'large',
}

export function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  icon,
  children,
  ...props
}: ButtonProps) {
  const variantProps = VARIANT_MAP[variant]
  return (
    <AntButton
      {...variantProps}
      {...props}
      size={SIZE_MAP[size]}
      loading={loading}
      icon={icon}
    >
      {children}
    </AntButton>
  )
}

/** @deprecated — kept for backward compat, use antd Spin instead */
export function Spinner({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <LoadingOutlined style={{ fontSize: size, color }} spin />
}
