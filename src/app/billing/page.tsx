import { createClient } from '@/lib/supabase/server'
import { getActivePlan } from '@/lib/billing/plan-guard'
import { PLAN_CONFIG } from '@/types/billing'
import type { PlanTier } from '@/types/billing'
import { Check, Zap, Building2, Shield, CreditCard, AlertCircle } from 'lucide-react'

const TIER_ICONS: Record<PlanTier, React.ReactNode> = {
  starter:      <Shield className="w-5 h-5" />,
  professional: <Zap className="w-5 h-5" />,
  agency:       <Building2 className="w-5 h-5" />,
}

const TIER_COLORS: Record<PlanTier, { ring: string; badge: string; btn: string; icon: string }> = {
  starter: {
    ring:  'ring-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    btn:   'bg-gray-800 hover:bg-gray-900 text-white',
    icon:  'bg-gray-100 text-gray-700',
  },
  professional: {
    ring:  'ring-blue-500 ring-2',
    badge: 'bg-blue-600 text-white',
    btn:   'bg-blue-600 hover:bg-blue-700 text-white',
    icon:  'bg-blue-100 text-blue-700',
  },
  agency: {
    ring:  'ring-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    btn:   'bg-purple-700 hover:bg-purple-800 text-white',
    icon:  'bg-purple-100 text-purple-700',
  },
}

export default async function BillingPage() {
  const activePlan = await getActivePlan()
  const supabase = await createClient()

  // Historial de facturas
  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const currentTier = activePlan?.tier
  const isTrialing = activePlan?.subscription_status === 'trialing'
  const trialEnd = activePlan?.trial_ends_at
    ? new Date(activePlan.trial_ends_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Planes y facturación</h1>
        <p className="text-gray-500 mt-1">Elegí el plan que mejor se adapta a tu equipo</p>
      </div>

      {/* Banner de trial */}
      {isTrialing && trialEnd && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Estás en período de prueba gratuito hasta el <strong>{trialEnd}</strong>. Elegí un plan antes de que termine para no perder el acceso.
          </p>
        </div>
      )}

      {/* Plan activo actual */}
      {activePlan && !isTrialing && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Plan {activePlan.plan_name} activo</p>
              <p className="text-xs text-blue-700">
                Próxima renovación: {new Date(activePlan.current_period_end).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-blue-800">${activePlan.price_usd}/mes</span>
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {(Object.entries(PLAN_CONFIG) as [PlanTier, typeof PLAN_CONFIG[PlanTier]][]).map(([tier, cfg]) => {
          const colors = TIER_COLORS[tier]
          const isCurrent = currentTier === tier

          return (
            <div
              key={tier}
              className={`bg-white rounded-2xl ring-1 ${colors.ring} p-6 relative flex flex-col`}
            >
              {/* Badge popular / activo */}
              {cfg.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                  {cfg.badge}
                </span>
              )}
              {isCurrent && !cfg.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Plan actual
                </span>
              )}

              {/* Ícono y nombre */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors.icon}`}>
                {TIER_ICONS[tier]}
              </div>

              <h2 className="text-lg font-bold text-gray-900">{cfg.label}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">{cfg.description}</p>

              {/* Precio */}
              <div className="mb-6">
                <span className="text-4xl font-black text-gray-900">${cfg.price}</span>
                <span className="text-gray-400 text-sm">/mes</span>
              </div>

              {/* Límites rápidos */}
              <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-50 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-900">{cfg.limits.projects}</p>
                  <p className="text-xs text-gray-400">proyectos</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-xs font-bold text-gray-900">{cfg.limits.users}</p>
                  <p className="text-xs text-gray-400">usuarios</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-900">{cfg.limits.clients}</p>
                  <p className="text-xs text-gray-400">clientes</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {cfg.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                  Plan actual
                </button>
              ) : (
                <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${colors.btn}`}>
                  {currentTier && ['starter','professional','agency'].indexOf(tier) > ['starter','professional','agency'].indexOf(currentTier)
                    ? 'Actualizar a ' + cfg.label
                    : 'Cambiar a ' + cfg.label}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Comparación detallada */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Comparación de funcionalidades</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/2">Funcionalidad</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Starter</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50">Professional</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-purple-700">Agency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { label: 'Proyectos',             starter: '3', pro: 'Ilimitados', agency: 'Ilimitados' },
              { label: 'Usuarios',              starter: '2', pro: '5', agency: 'Ilimitados' },
              { label: 'Exportación PDF / PPTX',starter: '✓', pro: '✓', agency: '✓' },
              { label: 'Framework OWASP',       starter: '✓', pro: '✓', agency: '✓' },
              { label: 'ISO 27001 / PCI-DSS / NIST / CIS', starter: '—', pro: '✓', agency: '✓' },
              { label: 'Portal de remediación para clientes', starter: '—', pro: '✓', agency: '✓' },
              { label: 'Importación Nessus / ZAP / Burp', starter: '—', pro: '✓', agency: '✓' },
              { label: 'Análisis de código con IA', starter: 'Básico', pro: 'Avanzado', agency: 'Avanzado' },
              { label: 'Marca blanca en reportes', starter: '—', pro: '—', agency: '✓' },
              { label: 'Múltiples workspaces', starter: '—', pro: '—', agency: '✓' },
              { label: 'API REST',              starter: '—', pro: '—', agency: '✓' },
              { label: 'Soporte prioritario',   starter: 'Email', pro: 'Prioritario', agency: '24/7' },
            ].map(row => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-700">{row.label}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">{row.starter}</td>
                <td className="px-4 py-3 text-center text-sm text-blue-700 bg-blue-50/50 font-medium">{row.pro}</td>
                <td className="px-4 py-3 text-center text-sm text-purple-700">{row.agency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historial de facturas */}
      {invoices && invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Historial de facturación</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv: { id: string; created_at: string; period_start: string; period_end: string; amount_usd: number; status: string }) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {new Date(inv.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {inv.period_start && inv.period_end
                      ? `${new Date(inv.period_start).toLocaleDateString('es-AR')} – ${new Date(inv.period_end).toLocaleDateString('es-AR')}`
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">${inv.amount_usd}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status === 'paid' ? 'Pagada' : inv.status === 'pending' ? 'Pendiente' : 'Fallida'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
