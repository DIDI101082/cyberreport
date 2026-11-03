import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'
import { ArrowLeft, Plus, Search, Filter, ChevronRight } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Abierto',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  in_progress: { label: 'En progreso', color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  in_review:   { label: 'En revisión', color: '#facc15', bg: 'rgba(250,204,21,0.1)'  },
  resolved:    { label: 'Resuelto',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  accepted:    { label: 'Aceptado',    color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
}

const SEV_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']

export default async function FindingsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  const { data: findings } = await supabase
    .from('findings')
    .select('id, title, severity, status, category, cwe_id, created_at')
    .eq('project_id', params.id)
    .order('severity', { ascending: false })

  const all = findings ?? []
  const total    = all.length
  const open     = all.filter(f => f.status === 'open' || f.status === 'in_progress').length
  const resolved = all.filter(f => f.status === 'resolved').length

  return (
    <>
      <style>{`
        .fl { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .fl-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .fl-title { font-size: 20px; font-weight: 800; margin: 0; }
        .fl-sub { font-size: 13px; color: rgba(255,255,255,.35); margin: 2px 0 0; }
        .btn-new { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.35); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all .12s; }
        .btn-new:hover { background: rgba(37,99,235,1); }

        .stats { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 12px 16px; min-width: 90px; }
        .stat-num { font-size: 22px; font-weight: 800; margin: 0 0 2px; }
        .stat-lbl { font-size: 11px; color: rgba(255,255,255,.35); margin: 0; }

        .sev-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .sev-tab { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 7px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.4); cursor: pointer; text-decoration: none; transition: all .12s; }
        .sev-tab:hover { background: rgba(255,255,255,.08); color: rgba(255,255,255,.7); }

        .panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; overflow: hidden; }
        .f-hdr { display: grid; grid-template-columns: 1fr 90px 120px 120px 28px; padding: 9px 16px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .fh { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.28); }
        .f-row { display: grid; grid-template-columns: 1fr 90px 120px 120px 28px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.05); align-items: center; text-decoration: none; transition: background .1s; }
        .f-row:last-child { border-bottom: none; }
        .f-row:hover { background: rgba(255,255,255,.03); }
        .f-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.82); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; }
        .f-cat { font-size: 11px; color: rgba(255,255,255,.3); }
        .status-chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 5px; display: inline-block; }
        .chevron { color: rgba(255,255,255,.2); }
        .empty { padding: 48px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }
      `}</style>

      <div className="fl">
        <Link href={`/projects/${params.id}`} className="back">
          <ArrowLeft size={14} /> {project.name}
        </Link>

        <div className="fl-hdr">
          <div>
            <h1 className="fl-title">Hallazgos</h1>
            <p className="fl-sub">{total} hallazgo{total !== 1 ? 's' : ''} · {project.name}</p>
          </div>
          <Link href={`/projects/${params.id}/findings/new`} className="btn-new">
            <Plus size={14} /> Nuevo hallazgo
          </Link>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <p className="stat-num">{total}</p>
            <p className="stat-lbl">Total</p>
          </div>
          <div className="stat">
            <p className="stat-num" style={{ color: '#f87171' }}>{open}</p>
            <p className="stat-lbl">Abiertos</p>
          </div>
          <div className="stat">
            <p className="stat-num" style={{ color: '#4ade80' }}>{resolved}</p>
            <p className="stat-lbl">Resueltos</p>
          </div>
          {SEV_ORDER.map(s => {
            const count = all.filter(f => f.severity === s).length
            if (!count) return null
            const colors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,.4)' }
            const labels: Record<string, string> = { critical: 'Críticos', high: 'Altos', medium: 'Medios', low: 'Bajos', info: 'Info' }
            return (
              <div key={s} className="stat">
                <p className="stat-num" style={{ color: colors[s] }}>{count}</p>
                <p className="stat-lbl">{labels[s]}</p>
              </div>
            )
          })}
        </div>

        {/* Findings table */}
        {total === 0 ? (
          <div className="panel">
            <div className="empty">
              No hay hallazgos todavía.{' '}
              <Link href={`/projects/${params.id}/findings/new`} style={{ color: '#60a5fa' }}>Crear uno</Link>
              {' '}o{' '}
              <Link href={`/projects/${params.id}/import`} style={{ color: '#60a5fa' }}>importar desde XML</Link>.
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="f-hdr">
              <div className="fh">Hallazgo</div>
              <div className="fh">Severidad</div>
              <div className="fh">Estado</div>
              <div className="fh">Categoría</div>
              <div></div>
            </div>
            {all.map(f => {
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
                  <span className="f-cat">{f.category ?? '—'}</span>
                  <span className="chevron"><ChevronRight size={14} /></span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
