import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderOpen, ChevronRight, AlertTriangle, Flame } from 'lucide-react'
import DeleteProjectButton from '@/components/DeleteProjectButton'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'En curso',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  review:      { label: 'Revisión',   color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  completed:   { label: 'Completado', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  archived:    { label: 'Archivado',  color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' },
}

const TYPE_LABEL: Record<string, string> = {
  web: 'Web', infrastructure: 'Infraestructura', both: 'Web + Infraestructura'
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = user
    ? await supabase
        .from('projects')
        .select('*, organization:organizations(name), findings(severity)')
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <>
      <style>{`
        .pg-wrap { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .pg-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .pg-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pg-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
        .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 10px; text-decoration: none; transition: all 0.15s; }
        .btn-primary:hover { background: rgba(37,99,235,1); }
        .list-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
        .proj-row { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.12s; }
        .proj-row:last-child { border-bottom: none; }
        .proj-row:hover { background: rgba(255,255,255,0.03); }
        .proj-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .proj-name { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
        .proj-meta { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0 0 8px; }
        .proj-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
        .badge-critical { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .badge-high { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.2); }
        .badge-count { font-size: 11px; color: rgba(255,255,255,0.25); }
        .status-pill { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; }
        .empty-box { padding: 64px 20px; text-align: center; }
        .empty-text { color: rgba(255,255,255,0.3); font-size: 13px; margin: 12px 0 8px; }
        .empty-link { color: #60a5fa; font-size: 12px; text-decoration: none; }
      `}</style>

      <div className="pg-wrap">
        <div className="pg-header">
          <div>
            <h1 className="pg-title">Proyectos</h1>
            <p className="pg-sub">{projects?.length ?? 0} auditorías registradas</p>
          </div>
          <Link href="/projects/new" className="btn-primary">
            <Plus size={14} />
            Nuevo proyecto
          </Link>
        </div>

        {!projects?.length ? (
          <div className="list-panel">
            <div className="empty-box">
              <FolderOpen size={36} color="rgba(255,255,255,0.1)" />
              <p className="empty-text">No hay proyectos aún</p>
              <Link href="/projects/new" className="empty-link">Crear el primero →</Link>
            </div>
          </div>
        ) : (
          <div className="list-panel">
            {projects.map(project => {
              const findings = (project.findings as { severity: string }[]) ?? []
              const critical = findings.filter(f => f.severity === 'critical').length
              const high = findings.filter(f => f.severity === 'high').length
              const orgRaw = project.organization
              const orgName = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw as { name: string } | null)?.name ?? '—'
              const st = STATUS_CFG[project.status] ?? STATUS_CFG.archived

              return (
                <div key={project.id} className="proj-row">
                  <Link href={`/projects/${project.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div className="proj-icon">
                        <FolderOpen size={17} color="#60a5fa" />
                      </div>
                      <div>
                        <p className="proj-name">{project.name}</p>
                        <p className="proj-meta">{orgName} · {TYPE_LABEL[project.type] ?? project.type}</p>
                        <div className="proj-badges">
                          {critical > 0 && (
                            <span className="badge badge-critical">
                              <Flame size={9} style={{ display: 'inline', marginRight: 3 }} />
                              {critical} crít.
                            </span>
                          )}
                          {high > 0 && (
                            <span className="badge badge-high">
                              <AlertTriangle size={9} style={{ display: 'inline', marginRight: 3 }} />
                              {high} alto{high > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="badge-count">{findings.length} hallazgos</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="status-pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                    </div>
                  </Link>
                  <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
