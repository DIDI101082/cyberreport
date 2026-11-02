import type { SeverityLevel } from '@/types'

export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Crítica',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  high:     { label: 'Alta',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  medium:   { label: 'Media',    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  low:      { label: 'Baja',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  info:     { label: 'Info',     color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']

export function getSeverityConfig(severity: SeverityLevel) {
  return SEVERITY_CONFIG[severity]
}

export function cvssToSeverity(score: number): SeverityLevel {
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  if (score >= 0.1) return 'low'
  return 'info'
}
