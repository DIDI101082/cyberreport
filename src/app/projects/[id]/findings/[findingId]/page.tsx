'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Search, Filter, ChevronRight, X } from 'lucide-react'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'

interface Finding {
  id: string
  title: string
  severity: string
  status: string
  category: string | null
  cvss_score: number | null
  cve_id: string | null
  cwe_id: string | null
  created_at: string
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: '#6b7280',
}
const SEV_LABELS: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Info',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_review: 'En revisión', resolved: 'Resuelto',
  accepted: 'Aceptado', false_positive: 'Falso positivo',
}
const STATUS_COLORS: Record<string, string> = {
  open: '#f87171', in_review: '#facc15', resolved: '#4ade80',
  accepted: 'rgba(255,255,255,0.4)', false_positive: '#9ca3af',
}
const CAT_LABELS: Record<string, string> = {
  web: 'Web', infrastructure: 'Infraestructura', network: 'Red',
  social: 'Social', physical: 'Físico', other: 'Otro',
}

export default function FindingsListPage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [findings, setFindings] = useState<Finding[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'severity' | 'status' | 'date'>('severity')

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('name').eq('id', params.id).single(),
      supabase.from('findings').select('*').eq('project_id', params.id).order('created_at', { ascending: false }),
    ]).then(([proj, finds]) => {
      setProjectName(proj.data?.name ?? '')
      setFindings(finds.data ?? [])
      setLoading(false)
    })
  }, [params.id])

  const filtered = useMemo(() => {
    let f = findings
    if (search) f = f.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || (x.cve_id ?? '').toLowerCase().includes(search.toLowerCase()) || (x.cwe_id ?? '').toLowerCase().includes(search.toLowerCase()))
    if (filterSev.length)    f = f.filter(x => filterSev.includes(x.severity))
    if (filterStatus.length) f = f.filter(x => filterStatus.includes(x.status))
    return [...f].sort((a, b) => {
      if (sortBy === 'severity') return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
      if (sortBy === 'status')   return (a.status ?? '').localeCompare(b.status ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [findings, search, filterSev, filterStatus, sortBy])

  const counts = useMemo(() => SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length; return acc
  }, {} as Record<string, number>), [findings])

  const openCount    = findings.filter(f => f.status === 'open').length
  const resolvedCount = findings.filter(f => f.status === 'resolved').length

  function toggleFilter(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
      Cargando hallazgos…
    </div>
  )

  return (
    <>
      <style>{`
        .fl-wrap { padding: 24px 28px; max-width: 900px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .fl-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .fl-back:hover { color: rgba(255,255,255,.8); }
        .fl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .fl-title { font-size: 20px; font-weight: 700; margin: 0; }
        .btn-new { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all .12s; }
        .btn-new:hover { background: rgba(37,99,235,1); }

        /* Summary pills */
        .fl-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .sev-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .12s; background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); }
        .sev-pill.active { border-color: rgba(255,255,255,.2); }
        .sev-dot { width: 7px; height: 7px; border-radius: 50%; }

        /* Controls */
        .fl-controls { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
        .fl-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .fl-search { width: 100%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 9px; padding: 8px 12px 8px 34px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; }
        .fl-search:focus { border-color: rgba(59,130,246,.5); }
        .fl-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.3); pointer-events: none; }
        .fl-filter-group { display: flex; gap: 6px; flex-wrap: wrap; }
        .filter-chip { padding: 6px 11px; border-radius: 7px; font-size: 11.5px; font-weight: 600; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.45); cursor: pointer; transition: all .12s; display: inline-flex; align-items: center; gap: 5px; }
        .filter-chip:hover { background: rgba(255,255,255,.08); }
        .filter-chip.active { background: rgba(59,130,246,.18); border-color: rgba(59,130,246,.4); color: #93c5fd; }
        .sort-select { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 9px; padding: 8px 12px; font-size: 12px; color: rgba(255,255,255,.65); font-family: inherit; outline: none; cursor: pointer; }
        .sort-select option { background: #131f35; }

        /* Active filters bar */
        .active-filters { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
        .active-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 6px; font-size: 11px; background: rgba(59,130,246,.12); border: 1px solid rgba(59,130,246,.25); color: #93c5fd; }
        .active-tag button { background: none; border: none; color: rgba(147,197,253,.6); cursor: pointer; padding: 0; display: flex; align-items: center; }
        .active-tag button:hover { color: #93c5fd; }
        .clear-all { font-size: 11px; color: rgba(255,255,255,.3); cursor: pointer; text-decoration: underline; }
        .clear-all:hover { color: rgba(255,255,255,.6); }

        /* Result count */
        .fl-count { font-size: 12px; color: rgba(255,255,255,.3); margin-bottom: 10px; }

        /* Table */
        .fl-table { width: 100%; border-collapse: collapse; }
        .fl-th { text-align: left; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .fl-tr { border-bottom: 1px solid rgba(255,255,255,.05); cursor: pointer; transition: background .1s; }
        .fl-tr:hover { background: rgba(255,255,255,.03); }
        .fl-tr:last-child { border-bottom: none; }
        .fl-td { padding: 11px 12px; font-size: 13px; color: rgba(255,255,255,.8); vertical-align: middle; }
        .fl-td.title { font-weight: 500; max-width: 320px; }
        .fl-td.title a { color: rgba(255,255,255,.85); text-decoration: none; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fl-td.title a:hover { color: #fff; }
        .fl-td.meta { color: rgba(255,255,255,.3); font-size: 11px; }
        .status-chip { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,.06); }
        .cat-chip { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 11px; background: rgba(255,255,255,.05); color: rgba(255,255,255,.35); }
        .cvss-badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 700; font-family: monospace; }
        .fl-empty { padding: 56px 20px; text-align: center; color: rgba(255,255,255,.3); font-size: 13px; }
        .panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
      `}</style>

      <div className="fl-wrap">
        <Link href={`/projects/${params.id}`} className="fl-back">
          <ArrowLeft size={14} /> {projectName || 'Volver'}
        </Link>

        <div className="fl-header">
          <div>
            <h1 className="fl-title">Hallazgos</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
              {findings.length} total · {openCount} abiertos · {resolvedCount} resueltos
            </p>
          </div>
          <Link href={`/projects/${params.id}/findings/new`} className="btn-new">
            <Plus size={14} /> Nuevo hallazgo
          </Link>
        </div>

        {/* Severity pills */}
        <div className="fl-summary">
          {SEVERITY_ORDER.map(s => counts[s] > 0 && (
            <button
              key={s}
              className={`sev-pill${filterSev.includes(s) ? ' active' : ''}`}
              style={filterSev.includes(s) ? { background: `${SEV_COLORS[s]}18`, borderColor: `${SEV_COLORS[s]}40`, color: SEV_COLORS[s] } : {}}
              onClick={() => toggleFilter(filterSev, setFilterSev, s)}
            >
              <span className="sev-dot" style={{ background: SEV_COLORS[s] }} />
              {SEV_LABELS[s]} <span style={{ opacity: .5 }}>{counts[s]}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="fl-controls">
          <div className="fl-search-wrap">
            <Search size={14} className="fl-search-icon" />
            <input
              className="fl-search"
              placeholder="Buscar por título, CVE, CWE…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="fl-filter-group">
            {['open','in_review','resolved','accepted'].map(s => (
              <button
                key={s}
                className={`filter-chip${filterStatus.includes(s) ? ' active' : ''}`}
                onClick={() => toggleFilter(filterStatus, setFilterStatus, s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="severity">Severidad</option>
            <option value="status">Estado</option>
            <option value="date">Más reciente</option>
          </select>
        </div>

        {/* Active filter tags */}
        {(filterSev.length > 0 || filterStatus.length > 0 || search) && (
          <div className="active-filters">
            <Filter size={11} color="rgba(255,255,255,.3)" />
            {search && (
              <span className="active-tag">
                &ldquo;{search}&rdquo;
                <button onClick={() => setSearch('')}><X size={10} /></button>
              </span>
            )}
            {filterSev.map(s => (
              <span key={s} className="active-tag">
                {SEV_LABELS[s]}
                <button onClick={() => toggleFilter(filterSev, setFilterSev, s)}><X size={10} /></button>
              </span>
            ))}
            {filterStatus.map(s => (
              <span key={s} className="active-tag">
                {STATUS_LABELS[s]}
                <button onClick={() => toggleFilter(filterStatus, setFilterStatus, s)}><X size={10} /></button>
              </span>
            ))}
            <span className="clear-all" onClick={() => { setSearch(''); setFilterSev([]); setFilterStatus([]) }}>
              Limpiar todo
            </span>
          </div>
        )}

        <p className="fl-count">{filtered.length} hallazgo{filtered.length !== 1 ? 's' : ''}</p>

        <div className="panel">
          {filtered.length === 0 ? (
            <div className="fl-empty">
              {findings.length === 0
                ? 'No hay hallazgos en este proyecto'
                : 'Ningún hallazgo coincide con los filtros'}
            </div>
          ) : (
            <table className="fl-table">
              <thead>
                <tr>
                  <th className="fl-th">Severidad</th>
                  <th className="fl-th">Título</th>
                  <th className="fl-th">Categoría</th>
                  <th className="fl-th">CVSS</th>
                  <th className="fl-th">Estado</th>
                  <th className="fl-th" style={{ width: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const cvss = f.cvss_score
                  const cvssColor = cvss == null ? '' : cvss >= 9 ? '#ef4444' : cvss >= 7 ? '#f97316' : cvss >= 4 ? '#eab308' : '#60a5fa'
                  return (
                    <tr key={f.id} className="fl-tr" onClick={() => window.location.href = `/projects/${params.id}/findings/${f.id}`}>
                      <td className="fl-td">
                        <SeverityBadge severity={f.severity as SeverityLevel} />
                      </td>
                      <td className="fl-td title">
                        <Link href={`/projects/${params.id}/findings/${f.id}`} onClick={e => e.stopPropagation()}>
                          {f.title}
                        </Link>
                        {(f.cve_id || f.cwe_id) && (
                          <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                            {f.cve_id && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace' }}>{f.cve_id}</span>}
                            {f.cwe_id && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace' }}>{f.cwe_id}</span>}
                          </div>
                        )}
                      </td>
                      <td className="fl-td">
                        {f.category && <span className="cat-chip">{CAT_LABELS[f.category] ?? f.category}</span>}
                      </td>
                      <td className="fl-td">
                        {cvss != null && (
                          <span className="cvss-badge" style={{ background: `${cvssColor}18`, color: cvssColor }}>
                            {cvss.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="fl-td">
                        <span className="status-chip" style={{ color: STATUS_COLORS[f.status] ?? 'rgba(255,255,255,.4)' }}>
                          {STATUS_LABELS[f.status] ?? f.status}
                        </span>
                      </td>
                      <td className="fl-td" style={{ color: 'rgba(255,255,255,.2)' }}>
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
