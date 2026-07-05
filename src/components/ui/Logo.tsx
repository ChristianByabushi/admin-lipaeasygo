import React, { useState } from 'react'

/**
 * Logo variants:
 *  - icon       : square icon only              → /logo.png
 *  - horizontal : icon + wordmark side-by-side  → /logo-horizontal.png
 *  - full       : stacked logo + wordmark        → /logo-full.png
 *  - dark       : dark version (light bg)        → /logo-dark.png
 *  - white      : white version (dark bg)        → /logo-white.png
 */
type LogoVariant = 'icon' | 'full' | 'dark' | 'white' | 'horizontal'

const SRC: Record<LogoVariant, string> = {
  icon:       '/logo-icon.png',
  full:       '/logo-full.png',
  dark:       '/logo-dark.png',
  white:      '/logo-white.png',
  horizontal: '/logo-horizontal.png',
}

// Text fallback shown when the image file is missing or fails to load.
// Styled to look intentional rather than broken.
function LogoFallback({ height, onDark }: { height: number; onDark: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height,
    }}>
      {/* Icon square */}
      <div style={{
        width: height,
        height: height,
        borderRadius: Math.round(height * 0.22),
        background: onDark ? '#fff' : '#CE1126',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          color: onDark ? '#CE1126' : '#fff',
          fontWeight: 800,
          fontSize: Math.round(height * 0.52),
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          L
        </span>
      </div>
      {/* Wordmark */}
      <span style={{
        color: onDark ? '#fff' : '#CE1126',
        fontWeight: 800,
        fontSize: Math.round(height * 0.62),
        letterSpacing: '-0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        LipaEasyGo
      </span>
    </div>
  )
}

interface LogoProps {
  variant?: LogoVariant
  height?: number
  width?: number
  style?: React.CSSProperties
  alt?: string
}

export function Logo({ variant = 'icon', height = 36, width, style, alt = 'LipaEasyGo' }: LogoProps) {
  const [failed, setFailed] = useState(false)

  // If image failed to load, render the text fallback
  if (failed) {
    const onDark = variant === 'white'
    return <LogoFallback height={height} onDark={onDark} />
  }

  return (
    <img
      src={SRC[variant]}
      alt={alt}
      height={height}
      width={width}
      loading="eager"
      style={{ objectFit: 'contain', display: 'block', ...style }}
      onError={() => setFailed(true)}
    />
  )
}
