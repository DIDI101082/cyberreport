import type { SeverityLevel } from '@/types'

const SEV_STYLES: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Crítica', color: '#fca5a5', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
  high:     { label: 'Alta',    color: '#fdba74', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.28)' },
  medium:   { label: 'Media',   color: '#fde047', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.28)' },
  low:      { label: 'Baja',    color: '#93c5fd', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.28)' },
  info:     { label: 'Info',    color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
}

// Keep SEVERITY_CONFIG alias so existing imports still resolve
export const SEVERITY_CONFIG = SEV_STYLES

interface Props {
  severity: SeverityLevel
  size?: 'sm' | 'md'
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const cfg = SEV_STYLES[severity] ?? SEV_STYLES.info
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 99,
      fontWeight: 600,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
      fontSize: 11,
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
