import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER } from '@/lib/utils/severity'
import { Plus, FileText, ChevronRight, ArrowLeft, Globe, Server, Upload, ShieldCheck, CheckCircle2, LayoutGrid, Network } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: 'Abierto',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  in_review:  { label: 'Revisión',  color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  resolved:   { label: 'Resuelto',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  accepted:   { label: 'Aceptado',  color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308',
  low: '#60a5fa', info: 'rgba(255,255,255,0.4)',
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

  const orgName = (Array.isArray(project.organization)
    ? project.organization[0]
    : project.organization as { name: string } | null)?.name

  const open     = (findings ?? []).filter(f => f.status === 'open' || f.status === 'in_progress').length
  const resolved = (findings ?? []).filter(f => f.status === 'resolved').length
  const total    = (findings ?? []).length
  const pct      = total ? Math.round((resolved / total) * 100) : 0

  return (
    <>
      <style>{`
        .pd { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back-l { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back-l:hover { color: rgba(255,255,255,.8); }
        .pd-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
        .pd-title { font-size: 21px; font-weight: 800; margin: 0 0 4px; }
        .pd-sub { font-size: 13px; color: rgba(255,255,255,.38); margin: 0; }
        .pd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-out { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.65); font-size: 13px; font-weight: 500; border-radius: 9px; text-decoration: none; transition: all .12s; }
        .btn-out:hover { background: rgba(255,255,255,.09); color: #fff; }
        .btn-pri { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.35); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all .12s; }
        .btn-pri:hover { background: rgba(37,99,235,1); }

        /* Summary strip */
        .summary-strip { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .strip-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; padding: 14px 18px; min-width: 110px; }
        .strip-num { font-size: 24px; font-weight: 800; margin: 0 0 3px; }
        .strip-lbl { font-size: 11.5px; color: rgba(255,255,255,.35); margin: 0; }

        /* Module grid */
        .mod-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; }
        @media(max-width:640px) { .mod-grid { grid-template-columns: 1fr 1fr; } }
        .mod-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; padding: 14px 16px; text-decoration: none; display: flex; align-items: center; gap: 11px; transition: all .12s; }
        .mod-card:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); }
        .mod-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mod-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.8); margin: 0 0 2px; }
        .mod-desc { font-size: 11px; color: rgba(255,255,255,.3); margin: 0; }

        /* Severity bar */
        .sev-row { display: flex; gap: 8px; margin-bottom: 22px; flex-wrap: wrap; }
        .sev-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 9px; font-size: 12.5px; font-weight: 700; }
        .sev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* Progress bar */
        .prog-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 16px 18px; margin-bottom: 20px; }
        .prog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .prog-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.6); }
        .prog-pct { font-size: 16px; font-weight: 800; color: #4ade80; }
        .prog-bar { height: 7px; border-radius: 99px; background: rgba(255,255,255,.07); overflow: hidden; margin-bottom: 8px; }
        .prog-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#4ade80,#22c55e); transition: width .4s; }
        .prog-stats { display: flex; gap: 16px; font-size: 12px; color: rgba(255,255,255,.3); }
        .prog-stats span { font-weight: 700; color: rgba(255,255,255,.6); }

        /* Findings list */
        .sec-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin: 0 0 10px; }
        .findings-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
        .f-hdr { display: grid; grid-template-columns: 1fr 80px 110px 26px; padding: 9px 16px; border-bottom: 1px solid rgba(255,255,255,.07); gap: 0; }
        .fh { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.28); }
        .f-row { display: grid; grid-template-columns: 1fr 80px 110px 26px; padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,.05); align-items: center; text-decoration: none; transition: background .1s; gap: 0; }
        .f-row:last-child { border-bottom: none; }
        .f-row:hover { background: rgba(255,255,255,.03); }
        .f-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.82); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status-chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 5px; display: inline-block; }
        .empty-findings { padding: 40px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }
        .chevron { color: rgba(255,255,255,.2); }
      `}</style>

      <div className="pd">
        <Link href="/projects" className="back-l">
          <ArrowLeft size={14} /> Proyectos
        </Link>

        <div className="pd-hdr">
          <div>
            <h1 className="pd-title">{project.name}</h1>
            <p className="pd-sub">{orgName ?? 'Sin organización'} · {project.type === 'web' ? 'Web' : project.type === 'infrastructure' ? 'Infraestructura' : 'Web + Infra'}</p>
          </div>
          <div className="pd-actions">
            <Link href={`/projects/${params.id}/findings`} className="btn-out">
              <FileText size={13} /> Ver hallazgos
            </Link>
            <Link href={`/projects/${params.id}/import`} className="btn-out">
              <Upload size={13} /> Importar XML
            </Link>
            <Link href={`/projects/${params.id}/findings/new`} className="btn-pri">
              <Plus size={13} /> Nuevo hallazgo
            </Link>
          </div>
        </div>

        {/* Summary strip */}
        <div className="summary-strip">
          {SEVERITY_ORDER.map(s => severityCounts[s] > 0 && (
            <div key={s} className="strip-card">
              <p className="strip-num" style={{ color: SEV_COLORS[s] }}>{severityCounts[s]}</p>
              <p className="strip-lbl">
                {s === 'critical' ? 'Críticos' : s === 'high' ? 'Altos' : s === 'medium' ? 'Medios' : s === 'low' ? 'Bajos' : 'Info'}
              </p>
            </div>
          ))}
          {total > 0 && (
            <div className="strip-card">
              <p className="strip-num" style={{ color: '#4ade80' }}>{pct}%</p>
              <p className="strip-lbl">Progreso</p>
            </div>
          )}
        </div>

        {/* Remediation progress */}
        {total > 0 && (
          <div className="prog-card">
            <div className="prog-head">
              <span className="prog-title">Progreso de remediación</span>
              <span className="prog-pct">{pct}%</span>
            </div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="prog-stats">
              <span><span>{resolved}</span> resueltos</span>
              <span><span>{open}</span> abiertos</span>
              <span><span>{total}</span> total</span>
            </div>
          </div>
        )}

        {/* Module grid */}
        <div className="mod-grid">
          <Link href={`/projects/${params.id}/findings`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(248,113,113,.12)' }}>
              <FileText size={16} color="#f87171" />
            </div>
            <div>
              <p className="mod-label">Hallazgos</p>
              <p className="mod-desc">{total} hallazgo{total !== 1 ? 's' : ''}</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/remediation`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(74,222,128,.1)' }}>
              <CheckCircle2 size={16} color="#4ade80" />
            </div>
            <div>
              <p className="mod-label">Remediación</p>
              <p className="mod-desc">Kanban · SLA</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/import`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(250,204,21,.1)' }}>
              <Upload size={16} color="#facc15" />
            </div>
            <div>
              <p className="mod-label">Importar XML</p>
              <p className="mod-desc">ZAP · Burp · Nessus · Nmap · Qualys</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/report`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(96,165,250,.1)' }}>
              <FileText size={16} color="#60a5fa" />
            </div>
            <div>
              <p className="mod-label">Reporte PDF</p>
              <p className="mod-desc">Generar · Descargar</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/compliance`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(167,139,250,.1)' }}>
              <ShieldCheck size={16} color="#a78bfa" />
            </div>
            <div>
              <p className="mod-label">Cumplimiento</p>
              <p className="mod-desc">OWASP · ISO · PCI</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/client-portal`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(16,185,129,.1)' }}>
              <Globe size={16} color="#34d399" />
            </div>
            <div>
              <p className="mod-label">Portal Cliente</p>
              <p className="mod-desc">Compartir acceso</p>
            </div>
          </Link>
          <Link href={`/projects/${params.id}/scope`} className="mod-card">
            <div className="mod-icon" style={{ background: 'rgba(251,191,36,.1)' }}>
              <Network size={16} color="#fbbf24" />
            </div>
            <div>
              <p className="mod-label">Scope</p>
              <p className="mod-desc">IPs · Dominios · URLs</p>
            </div>
          </Link>
        </div>

        {/* Recent findings */}
        {total > 0 && (
          <>
            <p className="sec-lbl">Hallazgos recientes</p>
            <div className="findings-panel">
              <div className="f-hdr">
                <div className="fh">Hallazgo</div>
                <div className="fh">Severidad</div>
                <div className="fh">Estado</div>
                <div></div>
              </div>
              {(findings ?? []).slice(0, 10).map(f => {
                const statusInfo = STATUS_MAP[f.status] ?? { label: f.status, color: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.06)' }
                return (
                  <Link key={f.id} href={`/projects/${params.id}/findings/${f.id}`} className="f-row">
                    <span className="f-name">{f.title}</span>
                    <span><SeverityBadge severity={f.severity as SeverityLevel} /></span>
                    <span>
                      <span className="status-chip" style={{ color: statusInfo.color, background: statusInfo.bg }}>
                        {statusInfo.label}
                      </span>
                    </span>
                    <span className="chevron">
                      <ChevronRight size={14} />
                    </span>
                  </Link>
                )
              })}
            </div>
            {total > 10 && (
              <Link href={`/projects/${params.id}/findings`} className="btn-out" style={{ display: 'inline-flex' }}>
                Ver todos los hallazgos ({total})
              </Link>
            )}
          </>
        )}

        {total === 0 && (
          <div className="findings-panel">
            <div className="empty-findings">
              <p>No hay hallazgos. <Link href={`/projects/${params.id}/findings/new`} style={{ color: '#60a5fa' }}>Crear uno</Link> o <Link href={`/projects/${params.id}/import`} style={{ color: '#60a5fa' }}>importar desde XML</Link>.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
