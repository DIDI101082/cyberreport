'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Clock, CheckCircle2, LayoutGrid, List } from 'lucide-react'

interface Finding {
  id: string
  title: string
  severity: string
  status: string
  category: string | null
  assigned_to: string | null
  due_date: string | null
  created_at: string
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308',
  low: '#60a5fa', info: 'rgba(255,255,255,0.3)',
}
const SLA_DAYS: Record<string, number> = {
  critical: 7, high: 14, medium: 30, low: 90, info: 180,
}
const KANBAN_COLS = [
  { id: 'open',           label: 'Abierto',       color: '#f87171' },
  { id: 'in_progress',   label: 'En progreso',    color: '#facc15' },
  { id: 'in_review',     label: 'En revisión',    color: '#60a5fa' },
  { id: 'resolved',      label: 'Resuelto',       color: '#4ade80' },
  { id: 'accepted',      label: 'Aceptado',       color: '#a78bfa' },
  { id: 'false_positive',label: 'Falso positivo', color: '#9ca3af' },
]
const STATUS_OPTS = KANBAN_COLS.map(c => ({ value: c.id, label: c.label }))

function slaDeadline(severity: string, createdAt: string): string {
  const base = new Date(createdAt)
  base.setDate(base.getDate() + (SLA_DAYS[severity] ?? 30))
  return base.toISOString().slice(0, 10)
}
function daysLeft(due: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

export default function RemediationPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [findings, setFindings]     = useState<Finding[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<'kanban' | 'table'>('kanban')
  const [saving, setSaving]         = useState<string | null>(null)
  const [editMap, setEditMap]       = useState<Record<string, Partial<Finding>>>({})
  const [dragId, setDragId]         = useState<string | null>(null)
  const [overCol, setOverCol]       = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: proj }, { data: fds }] = await Promise.all([
      supabase.from('projects').select('name').eq('id', id).single(),
      supabase.from('findings')
        .select('id, title, severity, status, category, assigned_to, due_date, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: true }),
    ])
    setProjectName(proj?.name ?? '')
    setFindings((fds ?? []) as Finding[])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function patch(fid: string, field: keyof Finding, value: string) {
    setEditMap(prev => ({ ...prev, [fid]: { ...prev[fid], [field]: value } }))
  }
  async function save(fid: string) {
    const changes = editMap[fid]
    if (!changes || !Object.keys(changes).length) return
    setSaving(fid)
    await supabase.from('findings').update(changes).eq('id', fid)
    setSaving(null)
    setEditMap(prev => { const n = { ...prev }; delete n[fid]; return n })
    await load()
  }
  async function applyAllSLA() {
    for (const f of findings) {
      if (!f.due_date) {
        await supabase.from('findings').update({ due_date: slaDeadline(f.severity, f.created_at) }).eq('id', f.id)
      }
    }
    await load()
  }

  /* Drag-and-drop */
  function onDragStart(fid: string) { setDragId(fid) }
  function onDragOver(e: React.DragEvent, col: string) { e.preventDefault(); setOverCol(col) }
  async function onDrop(e: React.DragEvent, col: string) {
    e.preventDefault()
    if (!dragId) return
    setDragId(null); setOverCol(null)
    setFindings(prev => prev.map(f => f.id === dragId ? { ...f, status: col } : f))
    await supabase.from('findings').update({ status: col }).eq('id', dragId)
  }
  function onDragEnd() { setDragId(null); setOverCol(null) }

  const open     = findings.filter(f => ['open','in_progress','in_review'].includes(f.status))
  const closed   = findings.filter(f => ['resolved','false_positive','accepted'].includes(f.status))
  const overdue  = open.filter(f => { const d = daysLeft(f.due_date); return d !== null && d < 0 }).length
  const dueSoon  = open.filter(f => { const d = daysLeft(f.due_date); return d !== null && d >= 0 && d <= 3 }).length

  return (
    <>
      <style>{`
        .rem { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back-link:hover { color: rgba(255,255,255,.8); }
        .top-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
        .page-title { font-size: 20px; font-weight: 700; margin: 0; }
        .page-sub { font-size: 12px; color: rgba(255,255,255,.35); margin: 4px 0 0; }
        .top-actions { display: flex; gap: 8px; align-items: center; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all .12s; border: 1px solid; }
        .btn-sla { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.6); }
        .btn-sla:hover { background: rgba(255,255,255,.1); }
        .btn-view { padding: 7px 11px; background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.1); color: rgba(255,255,255,.5); }
        .btn-view.active { background: rgba(37,99,235,.2); border-color: rgba(59,130,246,.35); color: #93c5fd; }

        /* Stats */
        .stats { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
        .stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 14px 18px; min-width: 120px; }
        .stat-n { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
        .stat-l { font-size: 11.5px; color: rgba(255,255,255,.38); margin: 0; }

        /* ── KANBAN ── */
        .kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; align-items: flex-start; }
        .kanban::-webkit-scrollbar { height: 4px; }
        .kanban::-webkit-scrollbar-track { background: transparent; }
        .kanban::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
        .kb-col { min-width: 200px; flex: 0 0 200px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; display: flex; flex-direction: column; transition: border-color .1s; }
        .kb-col.over { border-color: rgba(59,130,246,.45); background: rgba(37,99,235,.06); }
        .kb-head { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.07); display: flex; align-items: center; justify-content: space-between; }
        .kb-label { font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .kb-count { font-size: 11px; background: rgba(255,255,255,.08); border-radius: 4px; padding: 2px 7px; color: rgba(255,255,255,.45); font-weight: 600; }
        .kb-body { padding: 8px; min-height: 60px; flex: 1; }
        .kb-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); border-radius: 9px; padding: 10px 11px; margin-bottom: 7px; cursor: grab; transition: all .12s; }
        .kb-card:active { cursor: grabbing; }
        .kb-card:last-child { margin-bottom: 0; }
        .kb-card.dragging { opacity: .4; }
        .kb-card:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.15); }
        .kb-card-title { font-size: 12px; font-weight: 500; color: rgba(255,255,255,.85); line-height: 1.35; margin-bottom: 7px; }
        .kb-meta { display: flex; align-items: center; justify-content: space-between; }
        .sev-pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: capitalize; }
        .sla-badge { font-size: 10px; font-weight: 600; }

        /* ── TABLE ── */
        .tbl-wrap { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
        .tbl-grid { display: grid; grid-template-columns: 2fr 80px 110px 130px 120px 70px; }
        .tbl-h { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.3); padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .tbl-r { border-bottom: 1px solid rgba(255,255,255,.05); align-items: center; }
        .tbl-r:last-child { border-bottom: none; }
        .tbl-c { padding: 10px 12px; font-size: 12.5px; color: rgba(255,255,255,.75); }
        .f-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 7px; }
        .tbl-sel { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #fff; font-size: 11.5px; border-radius: 6px; padding: 4px 6px; width: 100%; font-family: inherit; }
        .tbl-inp { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #fff; font-size: 11.5px; border-radius: 6px; padding: 4px 8px; width: 100%; font-family: inherit; }
        .tbl-inp::placeholder { color: rgba(255,255,255,.2); }
        .save-b { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px; border: none; cursor: pointer; background: rgba(37,99,235,.8); color: #fff; }
        .sec-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin: 0 0 8px; }
        .empty-state { text-align: center; padding: 48px; color: rgba(255,255,255,.25); font-size: 13px; }
      `}</style>

      <div className="rem">
        <Link href={`/projects/${id}`} className="back-link">
          <ArrowLeft size={14} /> {projectName || 'Proyecto'}
        </Link>

        <div className="top-row">
          <div>
            <h1 className="page-title">Portal de Remediación</h1>
            <p className="page-sub">Arrastra las tarjetas para cambiar estado · SLA automático por severidad</p>
          </div>
          <div className="top-actions">
            <button className="btn btn-sla" onClick={applyAllSLA}>
              <Clock size={13} /> Aplicar SLA
            </button>
            <button className={`btn btn-view${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>
              <LayoutGrid size={13} />
            </button>
            <button className={`btn btn-view${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>
              <List size={13} />
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="stats">
            <div className="stat">
              <p className="stat-n" style={{ color: '#f87171' }}>{open.length}</p>
              <p className="stat-l">Abiertos</p>
            </div>
            <div className="stat">
              <p className="stat-n" style={{ color: '#4ade80' }}>{closed.length}</p>
              <p className="stat-l">Cerrados</p>
            </div>
            <div className="stat">
              <p className="stat-n" style={{ color: '#fbbf24' }}>{dueSoon}</p>
              <p className="stat-l">Vencen pronto</p>
            </div>
            <div className="stat">
              <p className="stat-n" style={{ color: '#f87171' }}>{overdue}</p>
              <p className="stat-l">Vencidos</p>
            </div>
            <div className="stat">
              <p className="stat-n" style={{ color: 'rgba(255,255,255,.7)' }}>
                {findings.length ? Math.round((closed.length / findings.length) * 100) : 0}%
              </p>
              <p className="stat-l">Progreso</p>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Cargando…</p>
        ) : findings.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} color="rgba(255,255,255,.08)" style={{ margin: '0 auto 12px' }} />
            <p>No hay hallazgos en este proyecto</p>
          </div>
        ) : view === 'kanban' ? (
          /* ─── KANBAN ─── */
          <div className="kanban">
            {KANBAN_COLS.map(col => {
              const cards = findings.filter(f => f.status === col.id)
              return (
                <div
                  key={col.id}
                  className={`kb-col${overCol === col.id ? ' over' : ''}`}
                  onDragOver={e => onDragOver(e, col.id)}
                  onDrop={e => onDrop(e, col.id)}
                >
                  <div className="kb-head">
                    <span className="kb-label" style={{ color: col.color }}>{col.label}</span>
                    <span className="kb-count">{cards.length}</span>
                  </div>
                  <div className="kb-body">
                    {cards.map(f => {
                      const days = daysLeft(f.due_date)
                      const slaColor = days === null ? 'rgba(255,255,255,.25)' : days < 0 ? '#f87171' : days <= 3 ? '#fbbf24' : '#4ade80'
                      return (
                        <div
                          key={f.id}
                          className={`kb-card${dragId === f.id ? ' dragging' : ''}`}
                          draggable
                          onDragStart={() => onDragStart(f.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => window.location.href = `/projects/${id}/findings/${f.id}`}
                        >
                          <p className="kb-card-title">{f.title}</p>
                          <div className="kb-meta">
                            <span
                              className="sev-pill"
                              style={{ background: `${SEV_COLORS[f.severity]}20`, color: SEV_COLORS[f.severity] }}
                            >
                              {f.severity}
                            </span>
                            {days !== null && (
                              <span className="sla-badge" style={{ color: slaColor }}>
                                {days < 0 ? `${Math.abs(days)}d tarde` : `${days}d`}
                              </span>
                            )}
                          </div>
                          {f.assigned_to && (
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: '6px 0 0' }}>
                              👤 {f.assigned_to}
                            </p>
                          )}
                        </div>
                      )
                    })}
                    {cards.length === 0 && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.15)', textAlign: 'center', padding: '12px 0' }}>
                        Vacío
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── TABLE ─── */
          <>
            {open.length > 0 && (
              <>
                <p className="sec-lbl" style={{ marginBottom: 8 }}>Pendientes ({open.length})</p>
                <div className="tbl-wrap" style={{ marginBottom: 20 }}>
                  <div className="tbl-grid">
                    {['Hallazgo','Sev.','Estado','Asignado','Límite','SLA'].map(h => (
                      <div key={h} className="tbl-h">{h}</div>
                    ))}
                  </div>
                  {open.map(f => {
                    const edit = editMap[f.id] ?? {}
                    const curStatus   = (edit.status as string) ?? f.status
                    const curAssigned = (edit.assigned_to as string) ?? (f.assigned_to ?? '')
                    const curDue      = (edit.due_date as string) ?? (f.due_date ?? '')
                    const days = daysLeft(curDue || null)
                    const isDirty = !!Object.keys(editMap[f.id] ?? {}).length
                    return (
                      <div key={f.id} className="tbl-grid tbl-r">
                        <div className="tbl-c f-name">
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLORS[f.severity], flexShrink: 0, display: 'inline-block' }} />
                          {f.title}
                        </div>
                        <div className="tbl-c" style={{ color: SEV_COLORS[f.severity], fontWeight: 600, textTransform: 'capitalize', fontSize: 11.5 }}>{f.severity}</div>
                        <div className="tbl-c">
                          <select className="tbl-sel" value={curStatus} onChange={e => patch(f.id, 'status', e.target.value)}>
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div className="tbl-c">
                          <input className="tbl-inp" placeholder="Asignar…" value={curAssigned} onChange={e => patch(f.id, 'assigned_to', e.target.value)} />
                        </div>
                        <div className="tbl-c">
                          <input type="date" className="tbl-inp" value={curDue} onChange={e => patch(f.id, 'due_date', e.target.value)} />
                        </div>
                        <div className="tbl-c" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {days !== null && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: days < 0 ? '#f87171' : days <= 3 ? '#fbbf24' : '#4ade80' }}>
                              {days < 0 ? `${Math.abs(days)}d tarde` : `${days}d`}
                            </span>
                          )}
                          {isDirty && (
                            <button className="save-b" onClick={() => save(f.id)} disabled={saving === f.id}>
                              {saving === f.id ? '…' : 'Guardar'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {closed.length > 0 && (
              <>
                <p className="sec-lbl">Cerrados ({closed.length})</p>
                <div className="tbl-wrap">
                  <div className="tbl-grid">
                    {['Hallazgo','Sev.','Estado','Asignado','Límite',''].map((h,i) => (
                      <div key={i} className="tbl-h">{h}</div>
                    ))}
                  </div>
                  {closed.map(f => (
                    <div key={f.id} className="tbl-grid tbl-r" style={{ opacity: .55 }}>
                      <div className="tbl-c f-name">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLORS[f.severity], flexShrink: 0, display: 'inline-block' }} />
                        {f.title}
                      </div>
                      <div className="tbl-c" style={{ color: SEV_COLORS[f.severity], fontWeight: 600, textTransform: 'capitalize', fontSize: 11.5 }}>{f.severity}</div>
                      <div className="tbl-c" style={{ color: '#4ade80', fontSize: 11.5, fontWeight: 600 }}>
                        {STATUS_OPTS.find(o => o.value === f.status)?.label}
                      </div>
                      <div className="tbl-c" style={{ color: 'rgba(255,255,255,.35)' }}>{f.assigned_to ?? '—'}</div>
                      <div className="tbl-c" style={{ color: 'rgba(255,255,255,.35)' }}>{f.due_date ?? '—'}</div>
                      <div className="tbl-c"><CheckCircle2 size={13} color="#4ade80" /></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
