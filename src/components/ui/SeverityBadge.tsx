import type { SeverityLevel } from '@/types'
import { SEVERITY_CONFIG } from '@/lib/utils/severity'

interface Props {
  severity: SeverityLevel
  size?: 'sm' | 'md'
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const cfg = SEVERITY_CONFIG[severity]
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${px} ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
      {cfg.label}
    </span>
  )
}
