/**
 * Form helpers — wrappers autour d'antd.
 * Conserve l'ancienne API Field/Input/Select/Textarea/Alert pour les pages existantes.
 */
import React from 'react'
import {
  Form, Input as AntInput, Select as AntSelect, Alert as AntAlert,
} from 'antd'
import type { InputProps as AntInputProps } from 'antd'

// ── Field ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

export function Field({ label, error, required, hint, children }: FieldProps) {
  return (
    <Form.Item
      label={<span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>}
      required={required}
      validateStatus={error ? 'error' : undefined}
      help={error ?? hint ?? undefined}
      style={{ marginBottom: 16 }}
    >
      {children}
    </Form.Item>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'type'> {
  hasError?: boolean
  type?: string
  autoComplete?: string
}

export function Input({ hasError, style, type = 'text', ...props }: InputProps) {
  if (type === 'password') {
    return (
      <AntInput.Password
        status={hasError ? 'error' : undefined}
        style={style}
        // forward compat props
        autoComplete={props.autoComplete}
        value={props.value as string}
        onChange={props.onChange as any}
        placeholder={props.placeholder}
        disabled={props.disabled}
        maxLength={props.maxLength}
        onFocus={props.onFocus as any}
        onBlur={props.onBlur as any}
      />
    )
  }
  return (
    <AntInput
      status={hasError ? 'error' : undefined}
      type={type}
      style={style}
      value={props.value as string}
      onChange={props.onChange as any}
      placeholder={props.placeholder}
      disabled={props.disabled}
      maxLength={props.maxLength}
      autoComplete={props.autoComplete}
      onFocus={props.onFocus as any}
      onBlur={props.onBlur as any}
      min={props.min as string}
      max={props.max as string}
      step={props.step as string}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps {
  hasError?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
  style?: React.CSSProperties
}

export function Select({ hasError, options, placeholder, value, onChange, disabled, style }: SelectProps) {
  // Convert legacy onChange (HTMLSelectElement) → antd onChange (value)
  function handleChange(val: string) {
    if (onChange) {
      const fakeEvent = { target: { value: val } } as React.ChangeEvent<HTMLSelectElement>
      onChange(fakeEvent)
    }
  }
  return (
    <AntSelect
      status={hasError ? 'error' : undefined}
      value={value || undefined}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      options={options}
    />
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  hasError?: boolean
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function Textarea({ hasError, style, value, onChange, placeholder, rows, disabled }: TextareaProps) {
  return (
    <AntInput.TextArea
      status={hasError ? 'error' : undefined}
      style={style}
      value={value as string}
      onChange={onChange as any}
      placeholder={placeholder}
      rows={rows ?? 4}
      disabled={disabled}
    />
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────

export function Alert({ type = 'error', message }: { type?: 'error' | 'success' | 'info'; message: string }) {
  return (
    <AntAlert
      type={type}
      message={message}
      showIcon
      style={{ marginBottom: 12, borderRadius: 8 }}
    />
  )
}
