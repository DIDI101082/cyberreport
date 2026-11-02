'use client'

import type { PlanTier, SubscriptionStatus } from '@/types/billing'

interface PlanBadgeProps {
  tier: PlanTier
  status: SubscriptionStatus
  trialEnd?: string | null
  compact?: boolean
}

const TIER_STYLES: Record<PlanTier, string> = {
  starter:      'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  agency:       'bg-purple-100 text-purple-700',
}

const TIER_LABELS: Record<PlanTier, string> = {
  starter:      'Starter',
  professional: 'Professional',
  agency:       'Agency',
}

export default function PlanBadge({ tier, status, trialEnd, compact = false }: PlanBadgeProps) {
  const isTrialing = status === 'trialing'
  const label = isTrialing ? 'Trial' : TIER_LABELS[tier]

  if (compact) {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isTrialing ? 'bg-amber-100 text-amber-700' : TIER_STYLES[tier]}`}>
        {label}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${isTrialing ? 'bg-amber-100 text-amber-700' : TIER_STYLES[tier]}`}>
      <span>{label}</span>
      {isTrialing && trialEnd && (
        <span className="opacity-70">
          · hasta {new Date(trialEnd).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  )
}
