import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, AlertTriangle, Info } from 'lucide-react'
import { mapFindingToControls, type ControlRef } from '@/lib/compliance/mapping'

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,0.3)',
}

const FRAMEWORK_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'ISO 27001:2022': { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  'PCI-DSS v4.0':  { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  'NIST CSF 2.0':  { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  'OWASP Top 10':  { bg: 'rgba(239,68,68,0.10)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' },
  'CWE':           { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.12)' },
}

interface FindingWithControls {
  id: string
  title: string
  severity: string
  category: string | null
  controls: ControlRef[]
}

export default async function CompliancePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name').eq('id', params.id).single()
  if (!project) notFound()

  const { data: rawFindings } = await supabase
    .from('findings')
    .select('id, title, severity, category, status')
    .eq('project_id', params.id)
    .not('status', 'eq', 'false_positive')

  const findings: FindingWithControls[] = (rawFindings ?? []).map(f => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    category: f.category ?? 'infrastructure',
    controls: mapFindingToControls(f.title, f.category ?? 'infrastructure', f.severity),
  }))

  // Agrupar controles únicos por framework
  const byFramework: Record<string, { control: ControlRef; findings: FindingWithControls[] }[]> = {}
  findings.forEach(f => {
    f.controls.forEach(ctrl => {
      if (!byFramework[ctrl.framework]) byFramework[ctrl.framework] = []
      const key = `${ctrl.framework}::${ctrl.control_id}`
      const existing = byFramework[ctrl.framework].find(e => `${e.control.framework}::${e.control.control_id}` === key)
      if (existing) {
        if (!existing.findings.find(ef => ef.id === f.id)) existing.findings.push(f)
      } else {
        byFramework[ctrl.framework].push({ control: ctrl, findings: [f] })
      }
    })
  })

  const frameworks = Object.keys(byFramework).sort()

  // Conteo de controles afectados por framework
  const frameworkCounts = Object.entries(byFramework).map(([fw, items]) => ({
    fw, count: items.length,
  }))

  return (
    <>
      <style>{`
        .cp-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .cp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .cp-back:hover { color: rgba(255,255,255,0.8); }
        .cp-top { margin-bottom: 24px; }
        .cp-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
        .cp-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin: 0; }
        .fw-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
        .fw-badge { padding: 10px 16px; border-radius: 11px; display: flex; flex-direction: column; gap: 2px; border: 1px solid; min-width: 160px; }
        .fw-badge-name { font-size: 12px; font-weight: 600; }
        .fw-badge-count { font-size: 20px; font-weight: 800; }
        .fw-badge-lbl { font-size: 11px; opacity: 0.7; }
        .fw-section { margin-bottom: 28px; }
        .fw-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .fw-title { font-size: 14px; font-weight: 700; }
        .fw-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; border: 1px solid; }
        .ctrl-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
        .ctrl-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .ctrl-id { font-size: 12px; font-weight: 700; font-family: monospace; }
        .ctrl-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 2px 0 0; }
        .ctrl-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 10px; line-height: 1.5; }
        .ctrl-findings { display: flex; flex-wrap: wrap; gap: 6px; }
        .cf-tag { font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid; display: inline-flex; align-items: center; gap: 5px; }
        .sev-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .empty-state { padding: 60px 20px; text-align: center; }
        .empty-text { font-size: 13px; color: rgba(255,255,255,0.3); margin: 12px 0 0; }
      `}</style>

      <div className="cp-wrap">
        <Link href={`/projects/${params.id}`} className="cp-back">
          <ArrowLeft size={14} /> {project.name}
        </Link>

        <div className="cp-top">
          <h1 className="cp-title">Mapeo de Compliance</h1>
          <p className="cp-sub">Controles normativos afectados por los hallazgos · ISO 27001:2022 · PCI-DSS v4.0 · NIST CSF 2.0</p>
        </div>

        {findings.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={40} color="rgba(255,255,255,0.1)" />
            <p className="empty-text">No hay hallazgos para mapear.</p>
            <p className="empty-text">Agrega hallazgos al proyecto para ver su impacto normativo.</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="fw-summary">
              {frameworkCounts.map(({ fw, count }) => {
                const style = FRAMEWORK_COLORS[fw] ?? FRAMEWORK_COLORS['CWE']
                return (
                  <div key={fw} className="fw-badge" style={{ background: style.bg, borderColor: style.border }}>
                    <span className="fw-badge-name" style={{ color: style.color }}>{fw}</span>
                    <span className="fw-badge-count" style={{ color: style.color }}>{count}</span>
                    <span className="fw-badge-lbl" style={{ color: style.color }}>controles afectados</span>
                  </div>
                )
              })}
              <div className="fw-badge" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="fw-badge-name" style={{ color: 'rgba(255,255,255,0.5)' }}>Hallazgos totales</span>
                <span className="fw-badge-count" style={{ color: '#fff' }}>{findings.length}</span>
                <span className="fw-badge-lbl" style={{ color: 'rgba(255,255,255,0.4)' }}>mapeados</span>
              </div>
            </div>

            {/* Por framework */}
            {frameworks.map(fw => {
              const items = byFramework[fw]
              const style = FRAMEWORK_COLORS[fw] ?? FRAMEWORK_COLORS['CWE']
              return (
                <div key={fw} className="fw-section">
                  <div className="fw-header">
                    <span className="fw-pill" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                      {fw}
                    </span>
                    <span className="fw-title">{items.length} control{items.length !== 1 ? 'es' : ''} afectado{items.length !== 1 ? 's' : ''}</span>
                  </div>

                  {items.sort((a, b) => a.control.control_id.localeCompare(b.control.control_id)).map(({ control, findings: flist }) => (
                    <div key={control.control_id} className="ctrl-card">
                      <div className="ctrl-top">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="ctrl-id" style={{ color: style.color }}>{control.control_id}</span>
                          <p className="ctrl-name">{control.title}</p>
                          <p className="ctrl-desc">{control.description}</p>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                            {flist.length} hallazgo{flist.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="ctrl-findings">
                        {flist.map(f => (
                          <Link
                            key={f.id}
                            href={`/projects/${params.id}/findings/${f.id}`}
                            className="cf-tag"
                            style={{
                              background: `${SEV_COLORS[f.severity]}18`,
                              color: SEV_COLORS[f.severity],
                              borderColor: `${SEV_COLORS[f.severity]}35`,
                            }}
                          >
                            <span className="sev-dot" style={{ background: SEV_COLORS[f.severity] }} />
                            {f.title.length > 40 ? f.title.slice(0, 40) + '…' : f.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </div>
    </>
  )
}
