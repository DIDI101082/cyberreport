'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, AlertCircle, Clock, CheckCircle2, User, RefreshCw, ChevronDown } from 'lucide-react'

interface Finding {
  id: string
  title: string
  severity: string
  status: string
  category: string | null
  assigned_to: string | null
  due_date: string | null
  retest_date: string | null
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#60a5fa',
  info:     'rgba(255,255,255,0.3)',
}

const SLA_DAYS: Record<string, number> = {
  critical: 7,
  high:     14,
  medium:   30,
  low:      90,
  info:     180,
}

const STATUS_OPTS = [
  { value: 'open',           label: 'Abierto' },
  { value: 'in_progress',    label: 'En progreso' },
  { value: 'in_review',      label: 'En revisión' },
  { value: 'resolved',       label: 'Resuelto' },
  { value: 'false_positive', label: 'Falso positivo' },
  { value: 'accepted',       label: 'Aceptado' },
]

function slaDeadline(severity: string, createdAt?: string): string {
  const base = createdAt ? new Date(createdAt) : new Date()
  const days = SLA_DAYS[severity] ?? 30
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

function daysLeft(due: string | null): number | null {
  if (!due) return null
  const diff = new Date(due).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

export default function RemediationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [findings, setFindings] = useState<Finding[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editMap, setEditMap] = useState<Record<string, Partial<Finding>>>({})

  const load = useCallback(async () => {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', id).single()
    if (proj) setProjectName(proj.name)

    const { data } = await supabase
      .from('findings')
      .select('id, title, severity, status, category, assigned_to, due_date, retest_date, created_at')
      .eq('project_id', id)
      .order('severity', { ascending: false })

    setFindings((data ?? []) as Finding[])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  function patch(fid: string, field: keyof Finding, value: string) {
    setEditMap(prev => ({ ...prev, [fid]: { ...prev[fid], [field]: value } }))
  }

  async function save(fid: string) {
    const changes = editMap[fid]
    if (!changes || Object.keys(changes).length === 0) return
    setSaving(fid)
    await supabase.from('findings').update(changes).eq('id', fid)
    setSaving(null)
    setEditMap(prev => { const n = { ...prev }; delete n[fid]; return n })
    await load()
  }

  async function applyAllSLA() {
    for (const f of findings) {
      if (!f.due_date) {
        await supabase.from('findings').update({ due_date: slaDeadline(f.severity) }).eq('id', f.id)
      }
    }
    await load()
  }

  const open   = findings.filter(f => f.status === 'open' || f.status === 'in_progress' || f.status === 'in_review')
  const closed = findings.filter(f => f.status === 'resolved' || f.status === 'false_positive' || f.status === 'accepted')

  return (
    <>
      <style>{`
        .rem-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .rem-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .rem-back:hover { color: rgba(255,255,255,0.8); }
        .rem-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .rem-title { font-size: 18px; font-weight: 700; margin: 0; }
        .rem-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin: 4px 0 0; }
        .rem-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.35); color: #93c5fd; font-size: 13px; font-weight: 500; border-radius: 9px; cursor: pointer; transition: all 0.12s; }
        .rem-btn:hover { background: rgba(37,99,235,0.3); }
        .stats-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .stat-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 14px 18px; flex: 1; }
        .stat-num { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
        .stat-lbl { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
        .section-lbl { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.35); letter-spacing: .06em; text-transform: uppercase; margin: 0 0 10px; }
        .table-wrap { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        .tbl-header { display: grid; grid-template-columns: 2fr 90px 120px 130px 120px 80px; gap: 0; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); letter-spacing: .05em; text-transform: uppercase; }
        .tbl-row { display: grid; grid-template-columns: 2fr 90px 120px 130px 120px 80px; gap: 0; padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; }
        .tbl-row:last-child { border-bottom: none; }
        .f-title { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sev-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex-shrink: 0; }
        .tbl-select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 12px; border-radius: 7px; padding: 4px 6px; width: 100%; cursor: pointer; }
        .tbl-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 12px; border-radius: 7px; padding: 4px 8px; width: 100%; }
        .tbl-input::placeholder { color: rgba(255,255,255,0.25); }
        .save-btn { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 7px; border: none; cursor: pointer; transition: all 0.1s; }
        .sla-ok { color: #4ade80; }
        .sla-warn { color: #fbbf24; }
        .sla-over { color: #f87171; }
      `}</style>

      <div className="rem-wrap">
        <Link href={`/projects/${id}`} className="rem-back">
          <ArrowLeft size={14} /> {projectName || 'Proyecto'}
        </Link>

        <div className="rem-top">
          <div>
            <h1 className="rem-title">Portal de Remediación</h1>
            <p className="rem-sub">Gestión de hallazgos, SLA y retesting</p>
          </div>
          <button className="rem-btn" onClick={applyAllSLA}>
            <Clock size={14} />
            Aplicar SLA automático
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="stats-row">
            <div className="stat-box">
              <p className="stat-num" style={{ color: '#f87171' }}>{open.length}</p>
              <p className="stat-lbl">Hallazgos abiertos</p>
            </div>
            <div className="stat-box">
              <p className="stat-num" style={{ color: '#4ade80' }}>{closed.length}</p>
              <p className="stat-lbl">Resueltos / cerrados</p>
            </div>
            <div className="stat-box">
              <p className="stat-num" style={{ color: '#fbbf24' }}>
                {open.filter(f => { const d = daysLeft(f.due_date); return d !== null && d <= 3 }).length}
              </p>
              <p className="stat-lbl">Vencen en 3 días</p>
            </div>
            <div className="stat-box">
              <p className="stat-num" style={{ color: '#f87171' }}>
                {open.filter(f => { const d = daysLeft(f.due_date); return d !== null && d < 0 }).length}
              </p>
              <p className="stat-lbl">Vencidos</p>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando hallazgos…</p>
        ) : (
          <>
            {/* Abiertos */}
            {open.length > 0 && (
              <>
                <p className="section-lbl">Pendientes de remediación ({open.length})</p>
                <div className="table-wrap">
                  <div className="tbl-header">
                    <span>Hallazgo</span>
                    <span>Severidad</span>
                    <span>Estado</span>
                    <span>Asignado a</span>
                    <span>Fecha límite</span>
                    <span>SLA</span>
                  </div>
                  {open.map(f => {
                    const edit = editMap[f.id] ?? {}
                    const currentStatus  = (edit.status  as string) ?? f.status
                    const currentAssigned = (edit.assigned_to as string) ?? (f.assigned_to ?? '')
                    const currentDue     = (edit.due_date as string) ?? (f.due_date ?? '')
                    const days = daysLeft(currentDue || null)
                    const isDirty = Object.keys(editMap[f.id] ?? {}).length > 0
                    return (
                      <div key={f.id} className="tbl-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
                          <span className="sev-dot" style={{ background: SEV_COLORS[f.severity] ?? '#aaa' }} />
                          <span className="f-title">{f.title}</span>
                        </div>
                        <span style={{ fontSize: 12, color: SEV_COLORS[f.severity] ?? '#aaa', fontWeight: 600, textTransform: 'capitalize' }}>
                          {f.severity}
                        </span>
                        <select
                          className="tbl-select"
                          value={currentStatus}
                          onChange={e => patch(f.id, 'status', e.target.value)}
                        >
                          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                          className="tbl-input"
                          placeholder="email / nombre"
                          value={currentAssigned}
                          onChange={e => patch(f.id, 'assigned_to', e.target.value)}
                        />
                        <input
                          type="date"
                          className="tbl-input"
                          value={currentDue}
                          onChange={e => patch(f.id, 'due_date', e.target.value)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {days !== null && (
                            <span className={`${days < 0 ? 'sla-over' : days <= 3 ? 'sla-warn' : 'sla-ok'}`}
                              style={{ fontSize: 11, fontWeight: 600 }}>
                              {days < 0 ? `${Math.abs(days)}d tarde` : `${days}d`}
                            </span>
                          )}
                          {isDirty && (
                            <button
                              className="save-btn"
                              style={{
                                background: saving === f.id ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.8)',
                                color: '#fff',
                              }}
                              onClick={() => save(f.id)}
                              disabled={saving === f.id}
                            >
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

            {/* Cerrados */}
            {closed.length > 0 && (
              <>
                <p className="section-lbl">Resueltos / cerrados ({closed.length})</p>
                <div className="table-wrap">
                  <div className="tbl-header">
                    <span>Hallazgo</span>
                    <span>Severidad</span>
                    <span>Estado</span>
                    <span>Asignado a</span>
                    <span>Fecha límite</span>
                    <span></span>
                  </div>
                  {closed.map(f => (
                    <div key={f.id} className="tbl-row" style={{ opacity: 0.6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <span className="sev-dot" style={{ background: SEV_COLORS[f.severity] ?? '#aaa' }} />
                        <span className="f-title">{f.title}</span>
                      </div>
                      <span style={{ fontSize: 12, color: SEV_COLORS[f.severity], fontWeight: 600, textTransform: 'capitalize' }}>{f.severity}</span>
                      <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
                        {STATUS_OPTS.find(o => o.value === f.status)?.label ?? f.status}
                      </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{f.assigned_to ?? '—'}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{f.due_date ?? '—'}</span>
                      <span>
                        <CheckCircle2 size={14} color="#4ade80" />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {findings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <CheckCircle2 size={40} color="rgba(255,255,255,0.1)" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12 }}>
                  No hay hallazgos en este proyecto
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
