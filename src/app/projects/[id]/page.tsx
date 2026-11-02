import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER } from '@/lib/utils/severity'
import { Plus, FileText, ChevronRight, ArrowLeft, Globe, Server } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: 'Abierto',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  in_review:  { label: 'Revisión',  color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  resolved:   { label: 'Resuelto',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  accepted:   { label: 'Aceptado',  color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#60a5fa',
  info:     'rgba(255,255,255,0.4)',
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, organization:organizations(name, contact_email)')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('project_id', params.id)
    .order('severity', { ascending: false })

  const severityCounts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = (findings ?? []).filter(f => f.severity === s).length
    return acc
  }, {} as Record<SeverityLevel, number>)

  const orgName = (Array.isArray(project.organization) ? project.organization[0] : project.organization as { name: string } | null)?.name

  return (
    <>
      <style>{`
        .pd-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .pd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .pd-back:hover { color: rgba(255,255,255,0.8); }
        .pd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .pd-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pd-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
        .pd-actions { display: flex; gap: 8px; }
        .btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500; border-radius: 9px; text-decoration: none; transition: all 0.12s; }
        .btn-outline:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all 0.12s; }
        .btn-primary:hover { background: rgba(37,99,235,1); }
        .sev-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
        .sev-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 14px 10px; text-align: center; }
        .sev-count { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
        .findings-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .findings-header { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; }
        .findings-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0; }
        .finding-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); text-decoration: none; transition: background 0.1s; }
        .finding-row:last-child { border-bottom: none; }
        .finding-row:hover { background: rgba(255,255,255,0.03); }
        .finding-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); margin: 0 0 3px; }
        .finding-row:hover .finding-name { color: #60a5fa; }
        .finding-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; font-family: monospace; display: flex; align-items: center; gap: 6px; }
        .status-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
        .empty-box { padding: 50px 20px; text-align: center; }
        .empty-text { font-size: 13px; color: rgba(255,255,255,0.3); margin: 10px 0 12px; }
        .empty-link { font-size: 13px; color: #60a5fa; text-decoration: none; }
        .empty-link:hover { text-decoration: underline; }
      `}</style>

      <div className="pd-wrap">
        <Link href="/projects" className="pd-back">
          <ArrowLeft size={14} /> Proyectos
        </Link>

        <div className="pd-header">
          <div>
            <h1 className="pd-title">{project.name}</h1>
            <p className="pd-sub">
              {orgName ?? '—'}
              {project.start_date && ` · ${new Date(project.start_date).toLocaleDateString('es')}`}
            </p>
          </div>
          <div className="pd-actions">
            <Link href={`/projects/${params.id}/report`} className="btn-outline">
              <FileText size={13} />
              Generar reporte
            </Link>
            <Link href={`/projects/${params.id}/findings/new`} className="btn-primary">
              <Plus size={13} />
              Agregar hallazgo
            </Link>
          </div>
        </div>

        {/* Resumen severidad */}
        <div className="sev-grid">
          {SEVERITY_ORDER.map(s => (
            <div key={s} className="sev-card">
              <p className="sev-count" style={{ color: SEV_COLORS[s] }}>{severityCounts[s]}</p>
              <SeverityBadge severity={s} size="sm" />
            </div>
          ))}
        </div>

        {/* Hallazgos */}
        <div className="findings-panel">
          <div className="findings-header">
            <h2 className="findings-title">
              Hallazgos{' '}
              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 13 }}>
                ({findings?.length ?? 0})
              </span>
            </h2>
          </div>

          {!findings?.length ? (
            <div className="empty-box">
              <FileText size={32} color="rgba(255,255,255,0.08)" />
              <p className="empty-text">No hay hallazgos registrados</p>
              <Link href={`/projects/${params.id}/findings/new`} className="empty-link">
                Agregar el primero
              </Link>
            </div>
          ) : (
            findings.map(f => {
              const st = STATUS_MAP[f.status] ?? STATUS_MAP.open
              return (
                <Link
                  key={f.id}
                  href={`/projects/${params.id}/findings/${f.id}`}
                  className="finding-row"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ marginTop: 2 }}>
                      <SeverityBadge severity={f.severity as SeverityLevel} size="sm" />
                    </div>
                    <div>
                      <p className="finding-name">{f.title}</p>
                      <p className="finding-meta">
                        {f.cve_id && <span>{f.cve_id}</span>}
                        {f.cve_id && f.category && <span>·</span>}
                        {f.category && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {f.category === 'web' ? <Globe size={10} /> : f.category === 'infrastructure' ? <Server size={10} /> : null}
                            {f.category}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {f.cvss_score && (
                      <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                        CVSS {f.cvss_score}
                      </span>
                    )}
                    <span className="status-pill" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
