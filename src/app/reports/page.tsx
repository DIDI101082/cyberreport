import { createClient } from '@/lib/supabase/server'
import { FileText, Download, Shield } from 'lucide-react'
import Link from 'next/link'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'En curso',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  review:      { label: 'Revisión',   color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  completed:   { label: 'Completado', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, organization:organizations(name), findings(id)')
    .in('status', ['in_progress', 'review', 'completed'])
    .order('created_at', { ascending: false })

  return (
    <>
      <style>{`
        .pg-wrap { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .pg-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pg-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 24px; }
        .list-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
        .rpt-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .rpt-row:last-child { border-bottom: none; }
        .rpt-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rpt-name { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
        .rpt-meta { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0; }
        .btn-gen { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; font-size: 12px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all 0.15s; }
        .btn-gen:hover { background: rgba(37,99,235,0.4); color: #fff; }
        .status-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
        .empty-box { padding: 64px 20px; text-align: center; }
        .empty-text { color: rgba(255,255,255,0.3); font-size: 13px; margin: 12px 0 0; }
      `}</style>

      <div className="pg-wrap">
        <h1 className="pg-title">Reportes</h1>
        <p className="pg-sub">Generá PDF o PowerPoint de cada proyecto de auditoría</p>

        {!projects?.length ? (
          <div className="list-panel">
            <div className="empty-box">
              <FileText size={36} color="rgba(255,255,255,0.1)" />
              <p className="empty-text">No hay proyectos disponibles para reportar</p>
            </div>
          </div>
        ) : (
          <div className="list-panel">
            {projects.map(project => {
              const orgRaw = project.organization
              const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw as { name: string } | null)?.name ?? '—'
              const findingCount = (project.findings as { id: string }[]).length
              const st = STATUS_CFG[project.status] ?? STATUS_CFG.in_progress

              return (
                <div key={project.id} className="rpt-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="rpt-icon">
                      <FileText size={17} color="#60a5fa" />
                    </div>
                    <div>
                      <p className="rpt-name">{project.name}</p>
                      <p className="rpt-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{org}</span>
                        <span>·</span>
                        <span>{findingCount} hallazgos</span>
                        <span
                          className="status-pill"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Link href={`/projects/${project.id}/report`} className="btn-gen">
                    <Download size={13} />
                    Generar reporte
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* Info badge */}
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <Shield size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 3px', fontWeight: 600 }}>
              Formatos disponibles: PDF ejecutivo · PowerPoint Accusys · HTML interactivo
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Los reportes incluyen portada con branding Accusys, resumen ejecutivo, hallazgos por severidad y recomendaciones.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
