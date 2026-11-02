import { createClient } from '@/lib/supabase/server'
import { getActivePlan } from '@/lib/billing/plan-guard'
import { PLAN_CONFIG } from '@/types/billing'
import type { PlanTier } from '@/types/billing'
import { Check, Zap, Building2, Shield, CreditCard, AlertCircle } from 'lucide-react'

const TIER_ICONS: Record<PlanTier, React.ReactNode> = {
  starter:      <Shield size={18} />,
  professional: <Zap size={18} />,
  agency:       <Building2 size={18} />,
}

const TIER_COLORS: Record<PlanTier, { border: string; iconBg: string; iconColor: string; btnBg: string; badgeBg: string; badgeColor: string }> = {
  starter: {
    border: 'rgba(255,255,255,0.1)',
    iconBg: 'rgba(255,255,255,0.08)', iconColor: 'rgba(255,255,255,0.5)',
    btnBg: 'rgba(255,255,255,0.1)',
    badgeBg: 'rgba(255,255,255,0.1)', badgeColor: 'rgba(255,255,255,0.5)',
  },
  professional: {
    border: 'rgba(59,130,246,0.5)',
    iconBg: 'rgba(37,99,235,0.3)', iconColor: '#60a5fa',
    btnBg: 'rgba(37,99,235,0.85)',
    badgeBg: 'rgba(37,99,235,0.9)', badgeColor: '#fff',
  },
  agency: {
    border: 'rgba(167,139,250,0.4)',
    iconBg: 'rgba(124,58,237,0.25)', iconColor: '#c084fc',
    btnBg: 'rgba(124,58,237,0.7)',
    badgeBg: 'rgba(124,58,237,0.3)', badgeColor: '#e9d5ff',
  },
}

export default async function BillingPage() {
  const activePlan = await getActivePlan()
  const supabase = await createClient()

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
    <>
      <style>{`
        .pg-wrap { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; max-width: 1000px; }
        .pg-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pg-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 24px; }
        .banner { border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
        .banner-trial { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); }
        .banner-active { background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: space-between; }
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .plan-card { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; position: relative; transition: transform 0.15s; }
        .plan-card:hover { transform: translateY(-2px); }
        .plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 99px; white-space: nowrap; }
        .plan-icon { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .plan-name { font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .plan-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 14px; }
        .plan-price { margin-bottom: 16px; }
        .plan-price-num { font-size: 36px; font-weight: 900; color: #fff; }
        .plan-price-unit { font-size: 13px; color: rgba(255,255,255,0.3); }
        .plan-limits { display: grid; grid-template-columns: repeat(3, 1fr); background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px; gap: 0; margin-bottom: 16px; }
        .plan-limit-item { text-align: center; }
        .plan-limit-item + .plan-limit-item { border-left: 1px solid rgba(255,255,255,0.07); }
        .plan-limit-val { font-size: 13px; font-weight: 700; color: #fff; }
        .plan-limit-label { font-size: 10px; color: rgba(255,255,255,0.3); }
        .plan-features { flex: 1; margin-bottom: 16px; }
        .plan-feature { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.65); }
        .plan-btn { width: 100%; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; color: #fff; transition: opacity 0.15s; }
        .plan-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .plan-btn:not(:disabled):hover { opacity: 0.85; }
        .compare-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
        .compare-header { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); }
        .compare-table { width: 100%; border-collapse: collapse; }
        .compare-table th { padding: 10px 16px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-align: center; }
        .compare-table th:first-child { text-align: left; }
        .compare-table td { padding: 10px 16px; font-size: 12px; color: rgba(255,255,255,0.6); border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
        .compare-table td:first-child { text-align: left; color: rgba(255,255,255,0.75); }
        .compare-table .col-pro { background: rgba(37,99,235,0.05); color: #93c5fd; font-weight: 600; }
        .invoices-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table th { padding: 10px 18px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.05em; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .inv-table td { padding: 12px 18px; font-size: 13px; color: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(255,255,255,0.04); }
        .inv-table tr:last-child td { border-bottom: none; }
        .inv-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
        .inv-paid { background: rgba(74,222,128,0.12); color: #4ade80; }
        .inv-pending { background: rgba(250,204,21,0.12); color: #facc15; }
        .inv-failed { background: rgba(239,68,68,0.12); color: #f87171; }
      `}</style>

      <div className="pg-wrap">
        <h1 className="pg-title">Planes y facturación</h1>
        <p className="pg-sub">Elegí el plan que mejor se adapta a tu equipo de pentesting</p>

        {/* Banner trial */}
        {isTrialing && trialEnd && (
          <div className="banner banner-trial">
            <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#fde68a', margin: 0 }}>
              Estás en período de prueba gratuito hasta el <strong>{trialEnd}</strong>. Elegí un plan antes de que termine para no perder el acceso.
            </p>
          </div>
        )}

        {/* Banner plan activo */}
        {activePlan && !isTrialing && (
          <div className="banner banner-active">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={16} color="#60a5fa" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', margin: '0 0 2px' }}>Plan {activePlan.plan_name} activo</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  Próxima renovación: {new Date(activePlan.current_period_end).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>${activePlan.price_usd}/mes</span>
          </div>
        )}

        {/* Grid planes */}
        <div className="plans-grid">
          {(Object.entries(PLAN_CONFIG) as [PlanTier, typeof PLAN_CONFIG[PlanTier]][]).map(([tier, cfg]) => {
            const colors = TIER_COLORS[tier]
            const isCurrent = currentTier === tier

            return (
              <div
                key={tier}
                className="plan-card"
                style={{ border: `1px solid ${colors.border}` }}
              >
                {cfg.badge && (
                  <span
                    className="plan-badge"
                    style={{ background: colors.badgeBg, color: colors.badgeColor }}
                  >
                    {cfg.badge}
                  </span>
                )}
                {isCurrent && !cfg.badge && (
                  <span className="plan-badge" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>
                    Plan actual
                  </span>
                )}

                <div className="plan-icon" style={{ background: colors.iconBg }}>
                  <span style={{ color: colors.iconColor }}>{TIER_ICONS[tier]}</span>
                </div>

                <h2 className="plan-name">{cfg.label}</h2>
                <p className="plan-desc">{cfg.description}</p>

                <div className="plan-price">
                  <span className="plan-price-num">${cfg.price}</span>
                  <span className="plan-price-unit">/mes</span>
                </div>

                <div className="plan-limits">
                  <div className="plan-limit-item">
                    <p className="plan-limit-val">{cfg.limits.projects}</p>
                    <p className="plan-limit-label">proyectos</p>
                  </div>
                  <div className="plan-limit-item">
                    <p className="plan-limit-val">{cfg.limits.users}</p>
                    <p className="plan-limit-label">usuarios</p>
                  </div>
                  <div className="plan-limit-item">
                    <p className="plan-limit-val">{cfg.limits.clients}</p>
                    <p className="plan-limit-label">clientes</p>
                  </div>
                </div>

                <ul className="plan-features">
                  {cfg.features.map((f, i) => (
                    <li key={i} className="plan-feature">
                      <Check size={13} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled className="plan-btn" style={{ background: 'rgba(255,255,255,0.05)' }}>Plan actual</button>
                ) : (
                  <button className="plan-btn" style={{ background: colors.btnBg }}>
                    {currentTier && ['starter','professional','agency'].indexOf(tier) > ['starter','professional','agency'].indexOf(currentTier)
                      ? `Actualizar a ${cfg.label}`
                      : `Cambiar a ${cfg.label}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Comparación */}
        <div className="compare-panel">
          <div className="compare-header">Comparación de funcionalidades</div>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Funcionalidad</th>
                <th>Starter</th>
                <th className="col-pro">Professional</th>
                <th>Agency</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Proyectos',                        starter: '3',       pro: 'Ilimitados', agency: 'Ilimitados' },
                { label: 'Usuarios',                         starter: '2',       pro: '5',          agency: 'Ilimitados' },
                { label: 'Exportación PDF / PPTX',           starter: '✓',       pro: '✓',          agency: '✓' },
                { label: 'Framework OWASP',                  starter: '✓',       pro: '✓',          agency: '✓' },
                { label: 'ISO 27001 / PCI-DSS / NIST / CIS', starter: '—',      pro: '✓',          agency: '✓' },
                { label: 'Portal de remediación clientes',   starter: '—',       pro: '✓',          agency: '✓' },
                { label: 'Importación Nessus / ZAP / Burp',  starter: '—',      pro: '✓',          agency: '✓' },
                { label: 'Análisis de código con IA',        starter: 'Básico', pro: 'Avanzado',   agency: 'Avanzado' },
                { label: 'Marca blanca en reportes',         starter: '—',       pro: '—',          agency: '✓' },
                { label: 'API REST',                         starter: '—',       pro: '—',          agency: '✓' },
                { label: 'Soporte',                          starter: 'Email',  pro: 'Prioritario', agency: '24/7' },
              ].map(row => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.starter}</td>
                  <td className="col-pro">{row.pro}</td>
                  <td>{row.agency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Facturas */}
        {invoices && invoices.length > 0 && (
          <div className="invoices-panel">
            <div className="compare-header">Historial de facturación</div>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Período</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: { id: string; created_at: string; period_start: string; period_end: string; amount_usd: number; status: string }) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                    <td style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {inv.period_start && inv.period_end
                        ? `${new Date(inv.period_start).toLocaleDateString('es-AR')} – ${new Date(inv.period_end).toLocaleDateString('es-AR')}`
                        : '—'}
                    </td>
                    <td style={{ color: '#fff', fontWeight: 600 }}>${inv.amount_usd}</td>
                    <td>
                      <span className={`inv-badge ${inv.status === 'paid' ? 'inv-paid' : inv.status === 'pending' ? 'inv-pending' : 'inv-failed'}`}>
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
    </>
  )
}
