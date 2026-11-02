'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { FRAMEWORKS, getAutoControls, type FrameworkId, type Framework, type Control } from '@/lib/compliance/frameworks'

/* ─── Types ─────────────────────────────────────────────── */
interface Finding {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: string
  category: string
  cwe_id?: string | null
}

interface ControlStatus {
  control: Control
  framework: FrameworkId
  findings: Finding[]
  isGap: boolean
  isCovered: boolean
}

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const
const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308',
  low: '#60a5fa', info: 'rgba(255,255,255,0.35)',
}
const SEV_LABEL: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Info',
}

function worstSeverity(findings: Finding[]): string {
  for (const s of SEV_ORDER) {
    if (findings.some(f => f.severity === s)) return s
  }
  return 'info'
}

const FW_LABEL: Record<FrameworkId, string> = {
  iso27001: 'ISO 27001:2022',
  pci_dss:  'PCI DSS 4.0.1',
  nist_csf: 'NIST CSF 2.0',
}

export default function CompliancePage() {
  const params = useParams()
  const projectId = params?.id as string

  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedFw, setSelectedFw] = useState<FrameworkId>('iso27001')
  const [expandedControl, setExpandedControl] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'gaps' | 'covered'>('all')

  const loadFindings = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/findings`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setFindings(Array.isArray(data) ? data : (data.findings ?? []))
    } catch {
      setFindings([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadFindings() }, [loadFindings])

  const framework = FRAMEWORKS.find(f => f.id === selectedFw)!

  const controlStatuses: ControlStatus[] = framework.controls.map(control => {
    const mapped = findings.filter(f => {
      const m = getAutoControls(f.cwe_id, f.category)
      return m.some(x => x.control.id === control.id && x.framework === selectedFw)
    })
    const openFindings = mapped.filter(
      f => f.status === 'open' || f.status === 'in_review' || f.status === 'in_progress'
    )
    return {
      control, framework: selectedFw,
      findings: mapped,
      isCovered: mapped.length > 0,
      isGap: openFindings.length > 0,
    }
  })

  const totalControls      = controlStatuses.length
  const gapControls        = controlStatuses.filter(c => c.isGap).length
  const coveredControls    = controlStatuses.filter(c => c.isCovered && !c.isGap).length
  const notTestedControls  = controlStatuses.filter(c => !c.isCovered).length
  const compliancePct      = totalControls ? Math.round(((totalControls - gapControls) / totalControls) * 100) : 100

  const categories = Array.from(new Set(framework.controls.map(c => c.category)))

  const filteredStatuses = controlStatuses.filter(cs => {
    if (filterMode === 'gaps')    return cs.isGap
    if (filterMode === 'covered') return cs.isCovered && !cs.isGap
    return true
  })

  const scoreColor = compliancePct >= 80 ? '#4ade80' : compliancePct >= 60 ? '#facc15' : '#f87171'

  return (
    <>
      <style>{`
        .cp { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back-l { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back-l:hover { color: rgba(255,255,255,.8); }
        .cp-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
        .cp-title { font-size: 21px; font-weight: 800; margin: 0 0 4px; display: flex; align-items: center; gap: 10px; }
        .cp-sub { font-size: 13px; color: rgba(255,255,255,.38); margin: 0; }
        .fw-tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .fw-tab { padding: 7px 14px; border-radius: 9px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .12s; background: rgba(255,255,255,.04); color: rgba(255,255,255,.4); }
        .fw-tab.active { border-color: var(--fw-color); color: var(--fw-color); background: rgba(var(--fw-rgb), .08); }
        .fw-tab:hover:not(.active) { background: rgba(255,255,255,.07); color: rgba(255,255,255,.7); }
        .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
        @media(max-width:640px) { .score-grid { grid-template-columns: 1fr 1fr; } }
        .score-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; padding: 14px 18px; }
        .score-num { font-size: 26px; font-weight: 800; margin: 0 0 3px; }
        .score-lbl { font-size: 11px; color: rgba(255,255,255,.35); margin: 0; text-transform: uppercase; letter-spacing: .05em; }
        .score-arc-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 18px; margin-bottom: 22px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .arc-wrap { position: relative; width: 90px; height: 90px; flex-shrink: 0; }
        .arc-wrap svg { transform: rotate(-90deg); }
        .arc-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
        .arc-info { flex: 1; }
        .arc-title { font-size: 14px; font-weight: 700; margin: 0 0 6px; }
        .arc-desc { font-size: 12.5px; color: rgba(255,255,255,.4); margin: 0 0 12px; line-height: 1.5; }
        .arc-legend { display: flex; gap: 16px; flex-wrap: wrap; }
        .arc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .arc-leg-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: rgba(255,255,255,.45); }
        .filter-row { display: flex; gap: 6px; margin-bottom: 14px; }
        .filter-pill { padding: 5px 11px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .12s; background: rgba(255,255,255,.04); color: rgba(255,255,255,.35); }
        .filter-pill.active { background: rgba(255,255,255,.1); color: rgba(255,255,255,.9); border-color: rgba(255,255,255,.12); }
        .filter-pill:hover:not(.active) { background: rgba(255,255,255,.06); color: rgba(255,255,255,.6); }
        .cat-section { margin-bottom: 20px; }
        .cat-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.3); margin: 0 0 8px; padding-left: 2px; }
        .ctrl-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; margin-bottom: 6px; overflow: hidden; }
        .ctrl-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; transition: background .1s; }
        .ctrl-head:hover { background: rgba(255,255,255,.03); }
        .ctrl-badge { min-width: 62px; font-size: 10.5px; font-weight: 700; font-family: monospace; color: var(--fw-color); background: rgba(var(--fw-rgb),.1); padding: 3px 7px; border-radius: 5px; text-align: center; flex-shrink: 0; }
        .ctrl-title { flex: 1; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.85); }
        .ctrl-status { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; margin-left: auto; flex-shrink: 0; }
        .ctrl-chevron { color: rgba(255,255,255,.2); margin-left: 6px; flex-shrink: 0; }
        .ctrl-body { border-top: 1px solid rgba(255,255,255,.07); padding: 12px 14px; }
        .ctrl-desc { font-size: 12.5px; color: rgba(255,255,255,.45); margin: 0 0 12px; line-height: 1.55; }
        .ctrl-findings-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.28); margin: 0 0 6px; }
        .ctrl-finding-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: rgba(255,255,255,.03); border-radius: 7px; margin-bottom: 4px; text-decoration: none; transition: background .1s; }
        .ctrl-finding-row:hover { background: rgba(255,255,255,.06); }
        .ctrl-finding-name { font-size: 12px; color: rgba(255,255,255,.75); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ctrl-finding-sev { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
        .ctrl-finding-status { font-size: 10.5px; color: rgba(255,255,255,.3); flex-shrink: 0; }
        .ctrl-no-findings { font-size: 12px; color: rgba(255,255,255,.25); font-style: italic; }
        .ctrl-remed { margin-top: 10px; padding: 9px 12px; background: rgba(167,139,250,.06); border: 1px solid rgba(167,139,250,.15); border-radius: 8px; font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.5; }
        .ctrl-remed strong { color: rgba(167,139,250,.9); }
        .empty-state { text-align: center; padding: 48px 24px; color: rgba(255,255,255,.25); font-size: 13px; }
        .loading-state { text-align: center; padding: 60px; color: rgba(255,255,255,.3); font-size: 13px; }
      `}</style>

      <div className="cp">
        <Link href={`/projects/${projectId}`} className="back-l">
          <ArrowLeft size={14} /> Proyecto
        </Link>

        <div className="cp-hdr">
          <div>
            <h1 className="cp-title">
              <ShieldCheck size={20} color="#a78bfa" /> Cumplimiento Normativo
            </h1>
            <p className="cp-sub">Mapeo automático de hallazgos a controles de seguridad</p>
          </div>
        </div>

        <div className="fw-tabs">
          {FRAMEWORKS.map(fw => (
            <button
              key={fw.id}
              className={`fw-tab${selectedFw === fw.id ? ' active' : ''}`}
              style={{ '--fw-color': fw.color, '--fw-rgb': hexToRgb(fw.color) } as React.CSSProperties}
              onClick={() => { setSelectedFw(fw.id); setExpandedControl(null) }}
            >
              {fw.name} {fw.version}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">Cargando hallazgos…</div>
        ) : (
          <>
            <div className="score-arc-card">
              <div className="arc-wrap">
                {(() => {
                  const r = 38, cx = 45, cy = 45
                  const circ = 2 * Math.PI * r
                  const offset = circ * (1 - compliancePct / 100)
                  return (
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor} strokeWidth="8"
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset .5s' }} />
                    </svg>
                  )
                })()}
                <div className="arc-pct" style={{ color: scoreColor }}>{compliancePct}%</div>
              </div>
              <div className="arc-info">
                <p className="arc-title">Nivel de cumplimiento — {FW_LABEL[selectedFw]}</p>
                <p className="arc-desc">
                  {gapControls === 0
                    ? 'No se detectaron brechas activas. Todos los controles afectados están remediados o sin hallazgos abiertos.'
                    : `Se detectaron ${gapControls} control${gapControls !== 1 ? 'es' : ''} con hallazgos abiertos. Estos representan brechas normativas que requieren atención.`}
                </p>
                <div className="arc-legend">
                  <div className="arc-leg-item"><div className="arc-dot" style={{ background: '#f87171' }} />{gapControls} brechas activas</div>
                  <div className="arc-leg-item"><div className="arc-dot" style={{ background: '#4ade80' }} />{coveredControls} controles OK</div>
                  <div className="arc-leg-item"><div className="arc-dot" style={{ background: 'rgba(255,255,255,.2)' }} />{notTestedControls} sin hallazgos</div>
                </div>
              </div>
            </div>

            <div className="score-grid" style={{ marginBottom: 20 }}>
              <div className="score-card"><p className="score-num" style={{ color: '#f87171' }}>{gapControls}</p><p className="score-lbl">Brechas</p></div>
              <div className="score-card"><p className="score-num" style={{ color: '#4ade80' }}>{coveredControls}</p><p className="score-lbl">Resueltos</p></div>
              <div className="score-card"><p className="score-num" style={{ color: 'rgba(255,255,255,.4)' }}>{notTestedControls}</p><p className="score-lbl">Sin hallazgos</p></div>
              <div className="score-card"><p className="score-num" style={{ color: scoreColor }}>{compliancePct}%</p><p className="score-lbl">Cumplimiento</p></div>
            </div>

            <div className="filter-row">
              {([['all', `Todos (${totalControls})`], ['gaps', `Brechas (${gapControls})`], ['covered', `Resueltos (${coveredControls})`]] as const).map(([mode, label]) => (
                <button key={mode} className={`filter-pill${filterMode === mode ? ' active' : ''}`} onClick={() => setFilterMode(mode)}>{label}</button>
              ))}
            </div>

            {filteredStatuses.length === 0 ? (
              <div className="empty-state">
                {filterMode === 'gaps' ? '✅ No hay brechas activas en este framework.'
                  : filterMode === 'covered' ? 'No hay controles completamente resueltos aún.'
                  : 'No hay controles en este framework.'}
              </div>
            ) : (
              categories.map(cat => {
                const catControls = filteredStatuses.filter(cs => cs.control.category === cat)
                if (catControls.length === 0) return null
                return (
                  <div key={cat} className="cat-section">
                    <p className="cat-label">{cat}</p>
                    {catControls.map(cs => (
                      <ControlCard key={cs.control.id} cs={cs} fw={framework} projectId={projectId}
                        expanded={expandedControl === cs.control.id}
                        onToggle={() => setExpandedControl(expandedControl === cs.control.id ? null : cs.control.id)} />
                    ))}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </>
  )
}

function ControlCard({ cs, fw, projectId, expanded, onToggle }: {
  cs: ControlStatus; fw: Framework; projectId: string; expanded: boolean; onToggle: () => void
}) {
  const worst = cs.findings.length ? worstSeverity(cs.findings) : null
  const openCount = cs.findings.filter(f => f.status === 'open' || f.status === 'in_review' || f.status === 'in_progress').length

  let statusIcon: React.ReactNode, statusLabel: string, statusColor: string
  if (cs.isGap) {
    statusIcon = <AlertTriangle size={13} />
    statusLabel = `${openCount} brecha${openCount !== 1 ? 's' : ''}`
    statusColor = SEV_COLOR[worst ?? 'high']
  } else if (cs.isCovered) {
    statusIcon = <CheckCircle2 size={13} />
    statusLabel = 'Resuelto'
    statusColor = '#4ade80'
  } else {
    statusIcon = <XCircle size={13} />
    statusLabel = 'Sin hallazgos'
    statusColor = 'rgba(255,255,255,.25)'
  }

  return (
    <div className="ctrl-card" style={{ '--fw-color': fw.color, '--fw-rgb': hexToRgb(fw.color) } as React.CSSProperties}>
      <div className="ctrl-head" onClick={onToggle}>
        <span className="ctrl-badge">{cs.control.id}</span>
        <span className="ctrl-title">{cs.control.title}</span>
        <span className="ctrl-status" style={{ color: statusColor }}>{statusIcon}{statusLabel}</span>
        <span className="ctrl-chevron">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </div>
      {expanded && (
        <div className="ctrl-body">
          <p className="ctrl-desc">{cs.control.description}</p>
          {cs.findings.length > 0 ? (
            <>
              <p className="ctrl-findings-lbl">Hallazgos relacionados ({cs.findings.length})</p>
              {cs.findings.map(f => (
                <Link key={f.id} href={`/projects/${projectId}/findings/${f.id}`} className="ctrl-finding-row">
                  <span className="ctrl-finding-sev" style={{ color: SEV_COLOR[f.severity], background: `${SEV_COLOR[f.severity]}18` }}>{SEV_LABEL[f.severity]}</span>
                  <span className="ctrl-finding-name">{f.title}</span>
                  <span className="ctrl-finding-status">
                    {f.status === 'open' ? 'Abierto' : f.status === 'resolved' ? 'Resuelto' : f.status === 'in_review' ? 'En revisión' : f.status}
                  </span>
                </Link>
              ))}
            </>
          ) : (
            <p className="ctrl-no-findings">No hay hallazgos mapeados a este control.</p>
          )}
          {cs.isGap && (
            <div className="ctrl-remed">
              <strong>Plan de remediación:</strong> Revisar y corregir los hallazgos abiertos asociados a este control. Priorizar según severidad.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return '255,255,255'
  return m.map(x => parseInt(x, 16)).join(',')
}
