import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, Globe } from 'lucide-react'
import type { SeverityLevel } from '@/types'

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,0.35)',
}
const SEV_LABELS: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Info',
}

export default async function ClientPortalView({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  // Buscar token
  const { data: tokenRow } = await supabase
    .from('client_tokens')
    .select('*, project:projects(id, name, description, start_date, end_date, organization:organizations(name, contact_email))')
    .eq('token', params.token)
    .single()

  if (!tokenRow) notFound()

  // Verificar expiración
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#0f1e3d 0%,#0a1020 60%,#0d1628 100%)', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Inter,sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <AlertCircle size={48} color="#f87171" />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 8px' }}>Enlace expirado</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Este enlace de acceso ya no es válido. Contacta a tu consultor.</p>
        </div>
      </div>
    )
  }

  // Incrementar vistas
  await supabase.from('client_tokens').update({ views: (tokenRow.views ?? 0) + 1 }).eq('id', tokenRow.id)

  // Datos del proyecto
  const project = Array.isArray(tokenRow.project) ? tokenRow.project[0] : tokenRow.project as {
    id: string; name: string; description: string | null; start_date: string | null; end_date: string | null
    organization: { name: string; contact_email?: string } | { name: string; contact_email?: string }[] | null
  } | null

  if (!project) notFound()

  const org = Array.isArray(project.organization) ? project.organization[0] : project.organization

  // Hallazgos (sin detalle técnico para cliente)
  const { data: findings } = await supabase
    .from('findings')
    .select('id, title, severity, category, status, description, recommendation')
    .eq('project_id', project.id)
    .not('status', 'in', '("false_positive")')
    .order('severity', { ascending: false })

  const allFindings = findings ?? []
  const sevOrder: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']
  const counts = sevOrder.reduce((acc, s) => {
    acc[s] = allFindings.filter(f => f.severity === s).length
    return acc
  }, {} as Record<string, number>)

  const open     = allFindings.filter(f => f.status === 'open' || f.status === 'in_progress' || f.status === 'in_review').length
  const resolved = allFindings.filter(f => f.status === 'resolved' || f.status === 'mitigated').length

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: linear-gradient(160deg,#0f1e3d 0%,#0a1020 60%,#0d1628 100%); min-height: 100vh; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif; color: #fff; }
        .cl-wrap { max-width: 900px; margin: 0 auto; padding: 36px 24px; }
        .cl-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .cl-logo { font-size: 13px; font-weight: 700; letter-spacing: -.02em; color: rgba(255,255,255,0.7); }
        .cl-logo span { color: #60a5fa; }
        .cl-badge { font-size: 11px; padding: 3px 9px; border-radius: 99px; background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); font-weight: 600; }
        .cl-header { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 28px; margin-bottom: 20px; }
        .cl-proj-name { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
        .cl-proj-org { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
        .cl-dates { display: flex; gap: 20px; }
        .cl-date { font-size: 12px; color: rgba(255,255,255,0.35); }
        .cl-date strong { color: rgba(255,255,255,0.65); display: block; font-size: 13px; margin-bottom: 2px; }
        .sev-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
        .sev-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 11px; padding: 14px 10px; text-align: center; }
        .sev-count { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
        .sev-lbl { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }
        .progress-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .progress-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 14px; }
        .progress-bar { height: 8px; border-radius: 99px; background: rgba(255,255,255,0.06); overflow: hidden; margin-bottom: 8px; }
        .progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #4ade80, #22c55e); }
        .progress-stats { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.4); }
        .findings-section { margin-bottom: 24px; }
        .section-lbl { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.35); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 10px; }
        .finding-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 11px; padding: 16px 18px; margin-bottom: 8px; }
        .finding-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .sev-pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; letter-spacing: .03em; }
        .finding-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88); }
        .finding-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 10px; }
        .rec-box { background: rgba(37,99,235,0.08); border: 1px solid rgba(59,130,246,0.15); border-radius: 8px; padding: 10px 14px; }
        .rec-lbl { font-size: 11px; font-weight: 600; color: #60a5fa; margin-bottom: 4px; }
        .rec-text { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5; }
        .cl-footer { text-align: center; padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 36px; }
        .cl-footer-text { font-size: 12px; color: rgba(255,255,255,0.25); }
        .readonly-banner { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 10px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.5); }
      `}</style>

      <div className="cl-wrap">
        {/* Brand */}
        <div className="cl-brand">
          <span className="cl-logo">//accusys | <span>CyberReport</span></span>
          <span className="cl-badge">Vista Cliente · Solo Lectura</span>
        </div>

        <div className="readonly-banner">
          <CheckCircle2 size={15} color="#34d399" />
          Este portal es de solo lectura. Los datos no pueden ser modificados desde esta vista.
        </div>

        {/* Header proyecto */}
        <div className="cl-header">
          <h1 className="cl-proj-name">{project.name}</h1>
          {org && <p className="cl-proj-org">{org.name}</p>}
          {project.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16 }}>
              {project.description}
            </p>
          )}
          <div className="cl-dates">
            {project.start_date && (
              <div className="cl-date">
                <strong>{new Date(project.start_date).toLocaleDateString('es')}</strong>
                Inicio
              </div>
            )}
            {project.end_date && (
              <div className="cl-date">
                <strong>{new Date(project.end_date).toLocaleDateString('es')}</strong>
                Fin
              </div>
            )}
            <div className="cl-date">
              <strong>{allFindings.length}</strong>
              Hallazgos totales
            </div>
          </div>
        </div>

        {/* Severidad */}
        <div className="sev-grid">
          {sevOrder.map(s => (
            <div key={s} className="sev-card">
              <div className="sev-count" style={{ color: SEV_COLORS[s] }}>{counts[s] ?? 0}</div>
              <div className="sev-lbl">{SEV_LABELS[s]}</div>
            </div>
          ))}
        </div>

        {/* Progreso remediación */}
        {allFindings.length > 0 && (
          <div className="progress-card">
            <p className="progress-title">Progreso de remediación</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.round((resolved / allFindings.length) * 100)}%` }} />
            </div>
            <div className="progress-stats">
              <span>{resolved} resueltos de {allFindings.length}</span>
              <span>{Math.round((resolved / allFindings.length) * 100)}%</span>
            </div>
          </div>
        )}

        {/* Hallazgos agrupados por severidad */}
        {sevOrder.map(s => {
          const group = allFindings.filter(f => f.severity === s)
          if (!group.length) return null
          return (
            <div key={s} className="findings-section">
              <p className="section-lbl">{SEV_LABELS[s]} ({group.length})</p>
              {group.map(f => (
                <div key={f.id} className="finding-card">
                  <div className="finding-head">
                    <span
                      className="sev-pill"
                      style={{ background: `${SEV_COLORS[s]}22`, color: SEV_COLORS[s], border: `1px solid ${SEV_COLORS[s]}44` }}
                    >
                      {SEV_LABELS[s]}
                    </span>
                    {f.status === 'resolved' || f.status === 'mitigated' ? (
                      <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Resuelto
                      </span>
                    ) : null}
                  </div>
                  <p className="finding-title">{f.title}</p>
                  {f.description && (
                    <p className="finding-desc">{f.description.length > 300 ? f.description.slice(0, 300) + '…' : f.description}</p>
                  )}
                  {f.recommendation && (
                    <div className="rec-box">
                      <p className="rec-lbl">Recomendación</p>
                      <p className="rec-text">{f.recommendation.length > 250 ? f.recommendation.slice(0, 250) + '…' : f.recommendation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        <div className="cl-footer">
          <p className="cl-footer-text">
            Reporte confidencial generado por //accusys | CyberReport · {new Date().toLocaleDateString('es')}
          </p>
          <p className="cl-footer-text" style={{ marginTop: 4 }}>
            Este documento es confidencial y está destinado únicamente al cliente indicado.
          </p>
        </div>
      </div>
    </>
  )
}
