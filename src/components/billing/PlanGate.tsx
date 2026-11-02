'use client'

import { Lock, Zap } from 'lucide-react'
import Link from 'next/link'
import type { PlanTier } from '@/types/billing'

interface PlanGateProps {
  children: React.ReactNode
  requiredTier: PlanTier
  currentTier: PlanTier | undefined
  featureName: string
}

const TIER_ORDER: Record<PlanTier, number> = { starter: 0, professional: 1, agency: 2 }
const TIER_LABELS: Record<PlanTier, string> = { starter: 'Starter', professional: 'Professional', agency: 'Agency' }
const TIER_COLORS: Record<PlanTier, string> = {
  starter: 'text-gray-700',
  professional: 'text-blue-700',
  agency: 'text-purple-700',
}

export default function PlanGate({ children, requiredTier, currentTier, featureName }: PlanGateProps) {
  const hasAccess = currentTier !== undefined && TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier]

  if (hasAccess) return <>{children}</>

  return (
    <div className="relative">
      {/* Contenido bloqueado con blur */}
      <div className="pointer-events-none select-none blur-[2px] opacity-40">
        {children}
      </div>

      {/* Overlay de upgrade */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-5 text-center max-w-xs mx-4">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{featureName}</p>
          <p className="text-xs text-gray-500 mb-4">
            Esta función requiere el plan{' '}
            <span className={`font-semibold ${TIER_COLORS[requiredTier]}`}>
              {TIER_LABELS[requiredTier]}
            </span>{' '}
            o superior
          </p>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Ver planes
          </Link>
        </div>
      </div>
    </div>
  )
}
