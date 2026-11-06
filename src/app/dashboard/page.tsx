import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, AlertTriangle, CheckCircle,
  ArrowRight, Flame, Activity, Lock,
  ChevronRight, BarChart2, Zap, FolderOpen, Code2, FileText, Globe, TrendingDown
} from 'lucide-react'
import { getAutoControls } from '@/lib/compliance/frameworks'

const SEVERITY_DOT: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#60a5fa',
  info:     '#6b7280',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Info',
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.28, lineHeight: 1 }}>{grade}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: size * 0.16, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, full_name')
    .eq('id', user!.id)
    .single()

  // If profile is missing, render dashboard with empty data instead of redirecting.
  // A redirect here causes a streaming SSR loop: the layout (sidebar) is already
  // sent to the browser before the page component runs, leaving the content slot
  // blank forever. Graceful fallback is the correct pattern here.
  const tenantId = profile?.tenant_id ?? null

  const { data: projects } = tenantId ? await supabase
    .from('projects')
    .select(`id, name, status, start_date, findings(severity, status)`)
    .eq('tenant_id', tenantId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(6)
    : { data: [] }

  const { data: recentFindings } = tenantId ? await supabase
    .from('findings')
    .select('id, title, severity, status, created_at, projects(name)')
    .eq('tenant_id', tenantId)
    .in('severity', ['critical', 'high'])
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(8)
    : { data: [] }

  const { data: allFindings } = tenantId ? await supabase
    .from('findings')
    .select('severity, status, cwe_id, category')
    .eq('tenant_id', tenantId)
    : { data: [] }

  const total = allFindings?.length ?? 0
  const critical = allFindings?.filter(f => f.severity === 'critical').length ?? 0
  const high = allFindings?.filter(f => f.severity === 'high').length ?? 0
  const resolved = allFindings?.filter(f => f.status === 'resolved').length ?? 0
  const open = total - resolved

  const penalty = (critical * 20 + high * 10) / Math.max(total, 1) * 10
  const globalScore = Math.max(0, Math.round(100 - Math.min(penalty, 100)))

  // ── Framework coverage (real) ──────────────────────────────────────────────
  // Count unique controls covered by all findings per framework
  const coveredIso = new Set<string>()
  const coveredPci = new Set<string>()
  const coveredNist = new Set<string>()

  ;(allFindings ?? []).forEach(f => {
    const controls = getAutoControls(f.cwe_id ?? undefined, f.category ?? undefined)
    controls.forEach(c => {
      if (c.framework === 'iso27001') coveredIso.add(c.control.id)
      else if (c.framework === 'pci_dss') coveredPci.add(c.control.id)
      else if (c.framework === 'nist_csf') coveredNist.add(c.control.id)
    })
  })

  // Total controls per framework (from the mapping file)
  const ISO_TOTAL  = 17
  const PCI_TOTAL  = 12
  const NIST_TOTAL = 12

  const fwCoverage = [
    { name: 'ISO 27001',     pct: Math.round((coveredIso.size  / ISO_TOTAL)  * 100), color: '#60a5fa' },
    { name: 'PCI-DSS v4.0', pct: Math.round((coveredPci.size  / PCI_TOTAL)  * 100), color: '#f97316' },
    { name: 'NIST CSF 2.0', pct: Math.round((coveredNist.size / NIST_TOTAL) * 100), color: '#a78bfa' },
  ]

  const sevDist = [
    { key: 'critical', label: 'Crítico', color: '#ef4444' },
    { key: 'high',     label: 'Alto',    color: '#f97316' },
    { key: 'medium',   label: 'Medio',   color: '#eab308' },
    { key: 'low',      label: 'Bajo',    color: '#60a5fa' },
    { key: 'info',     label: 'Info',    color: '#6b7280' },
  ].map(s => ({ ...s, count: allFindings?.filter(f => f.severity === s.key).length ?? 0 }))

  const maxFindings = Math.max(...(projects?.map(p => ((p.findings ?? []) as unknown[]).length) ?? [0]), 1)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? user!.email?.split('@')[0] ?? 'Usuario'

  return (
    <>
      <style>{`
        .dash-wrap {
          min-height: 100vh;
          padding: 28px 32px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
          color: #fff;
        }
        .dash-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .dash-greeting {
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          margin: 0 0 4px;
        }
        .dash-title {
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          background: rgba(37,99,235,0.85);
          border: 1px solid rgba(59,130,246,0.4);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s;
          backdrop-filter: blur(8px);
        }
        .btn-primary:hover {
          background: rgba(37,99,235,1);
          border-color: rgba(96,165,250,0.6);
        }
        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .score-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .score-info p { margin: 0; }
        .score-label {
          color: rgba(255,255,255,0.4);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px !important;
        }
        .score-status {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
        }
        .score-sub {
          color: rgba(255,255,255,0.3);
          font-size: 11px;
          margin-top: 3px !important;
        }
        .stat-card {
          padding: 18px;
        }
        .stat-card.alert {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
        }
        .stat-icon-wrap {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          margin: 0 0 3px;
          line-height: 1;
        }
        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          font-weight: 500;
          margin: 0;
        }
        .stat-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          margin: 2px 0 0;
        }
        /* Main grid */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 16px;
        }
        .panel {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
        }
        .panel-link {
          font-size: 12px;
          color: #60a5fa;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .panel-link:hover { color: #93c5fd; }
        .panel-empty {
          padding: 48px 20px;
          text-align: center;
        }
        .panel-empty-icon {
          color: rgba(255,255,255,0.1);
          margin: 0 auto 12px;
          display: block;
        }
        .panel-empty-text {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          margin: 0 0 8px;
        }
        .panel-empty-link {
          color: #60a5fa;
          font-size: 12px;
          text-decoration: none;
        }
        /* Project rows */
        .proj-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          transition: background 0.12s;
        }
        .proj-row:last-child { border-bottom: none; }
        .proj-row:hover { background: rgba(255,255,255,0.03); }
        .proj-grade {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 17px;
          font-weight: 900;
        }
        .proj-info { flex: 1; min-width: 0; }
        .proj-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.88);
          margin: 0 0 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .proj-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .proj-dot-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .proj-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .proj-dot-count {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
        }
        .proj-bar-wrap { width: 90px; flex-shrink: 0; }
        .proj-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 4px;
        }
        .proj-bar-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          overflow: hidden;
        }
        .proj-bar-fill {
          height: 100%;
          border-radius: 99px;
        }
        .proj-arrow { color: rgba(255,255,255,0.18); flex-shrink: 0; }
        .proj-row:hover .proj-arrow { color: rgba(255,255,255,0.4); }
        /* Finding rows */
        .finding-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          transition: background 0.12s;
        }
        .finding-row:last-child { border-bottom: none; }
        .finding-row:hover { background: rgba(255,255,255,0.03); }
        .finding-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .finding-info { flex: 1; min-width: 0; }
        .finding-title {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
          margin: 0 0 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .finding-meta {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        /* Quick actions */
        .quick-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 14px;
        }
        .quick-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          text-decoration: none;
          transition: all 0.12s;
        }
        .quick-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.12);
        }
        .quick-btn-label {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }
        .quick-btn:hover .quick-btn-label { color: rgba(255,255,255,0.9); }
        /* Frameworks */
        .fw-wrap { padding: 14px 16px; }
        .fw-section-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.35);
          margin-bottom: 14px;
        }
        .fw-item { margin-bottom: 10px; }
        .fw-item:last-child { margin-bottom: 0; }
        .fw-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 5px;
        }
        .fw-track {
          height: 5px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px;
          overflow: hidden;
        }
        .fw-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .right-col { display: flex; flex-direction: column; gap: 14px; }
      `}</style>

      <div className="dash-wrap">
        {/* Header */}
        <div className="dash-header">
          <div>
            <p className="dash-greeting">{greeting}, {firstName}</p>
            <h1 className="dash-title">Postura de Seguridad</h1>
          </div>
          <Link href="/projects/new" className="btn-primary">
            <Zap size={14} />
            Nuevo proyecto
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {/* Score */}
          <div className="card score-card">
            <ScoreRing score={globalScore} size={84} />
            <div className="score-info">
              <p className="score-label">Score global</p>
              <p className="score-status">
                {globalScore >= 75 ? 'Buena postura' : globalScore >= 50 ? 'Postura media' : 'Postura crítica'}
              </p>
              <p className="score-sub">{projects?.length ?? 0} proyectos activos</p>
            </div>
          </div>

          {/* Críticos */}
          <div className={`card stat-card${critical > 0 ? ' alert' : ''}`}>
            <div className="stat-icon-wrap">
              <Flame size={14} color="#f87171" />
            </div>
            <p className="stat-value">{critical}</p>
            <p className="stat-label">Críticos abiertos</p>
            <p className="stat-sub">requieren acción inmediata</p>
          </div>

          {/* Altos */}
          <div className="card stat-card">
            <div className="stat-icon-wrap">
              <AlertTriangle size={14} color="#fb923c" />
            </div>
            <p className="stat-value">{high}</p>
            <p className="stat-label">Altos sin resolver</p>
            <p className="stat-sub">alta prioridad</p>
          </div>

          {/* Total */}
          <div className="card stat-card">
            <div className="stat-icon-wrap">
              <Activity size={14} color="#60a5fa" />
            </div>
            <p className="stat-value">{open}</p>
            <p className="stat-label">Total hallazgos</p>
            <p className="stat-sub">{resolved} resueltos</p>
          </div>

          {/* Resolución */}
          <div className="card stat-card">
            <div className="stat-icon-wrap">
              <CheckCircle size={14} color="#4ade80" />
            </div>
            <p className="stat-value">{total > 0 ? `${Math.round((resolved / total) * 100)}%` : '—'}</p>
            <p className="stat-label">Tasa de resolución</p>
            <p className="stat-sub">{resolved} de {total}</p>
          </div>
        </div>

        {/* Main */}
        <div className="main-grid">
          {/* Proyectos */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <BarChart2 size={14} color="rgba(255,255,255,0.4)" />
                Proyectos activos
              </div>
              <Link href="/projects" className="panel-link">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>

            {!projects?.length ? (
              <div className="panel-empty">
                <Shield size={32} className="panel-empty-icon" />
                <p className="panel-empty-text">No hay proyectos activos</p>
                <Link href="/projects/new" className="panel-empty-link">Crear primer proyecto →</Link>
              </div>
            ) : projects.map(project => {
              const findings = (project.findings ?? []) as { severity: string; status: string }[]
              const pCritical = findings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length
              const pHigh = findings.filter(f => f.severity === 'high' && f.status !== 'resolved').length
              const pTotal = findings.length
              const pResolved = findings.filter(f => f.status === 'resolved').length
              const pPenalty = (pCritical * 20 + pHigh * 10) / Math.max(pTotal, 1) * 5
              const pScore = Math.max(0, Math.round(100 - Math.min(pPenalty, 100)))
              const pGrade = pScore >= 90 ? 'A' : pScore >= 75 ? 'B' : pScore >= 60 ? 'C' : pScore >= 40 ? 'D' : 'F'
              const gradeColor = pScore >= 75 ? '#4ade80' : pScore >= 50 ? '#facc15' : '#f87171'
              const pct = pTotal > 0 ? Math.round((pResolved / pTotal) * 100) : 0
              const barColor = pScore >= 75 ? '#22c55e' : pScore >= 50 ? '#eab308' : '#ef4444'

              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="proj-row">
                  <div className="proj-grade" style={{ color: gradeColor }}>{pGrade}</div>
                  <div className="proj-info">
                    <p className="proj-name">{project.name}</p>
                    <div className="proj-tags">
                      {['critical','high','medium','low'].map(s => {
                        const c = findings.filter(f => f.severity === s && f.status !== 'resolved').length
                        return c > 0 ? (
                          <span key={s} className="proj-dot-group">
                            <span className="proj-dot" style={{ background: SEVERITY_DOT[s] }} />
                            <span className="proj-dot-count">{c}</span>
                          </span>
                        ) : null
                      })}
                      {pTotal === 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Sin hallazgos</span>}
                    </div>
                  </div>
                  <div className="proj-bar-wrap">
                    <div className="proj-bar-labels">
                      <span>Resolución</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="proj-bar-track">
                      <div className="proj-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                  <ChevronRight size={14} className="proj-arrow" />
                </Link>
              )
            })}
          </div>

          {/* Columna derecha */}
          <div className="right-col">
            {/* Requieren atención */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Flame size={14} color="#f87171" />
                  Requieren atención
                </div>
                {critical + high > 8 && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+{critical + high - 8} más</span>
                )}
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {!recentFindings?.length ? (
                  <div className="panel-empty">
                    <CheckCircle size={28} color="rgba(74,222,128,0.3)" className="panel-empty-icon" />
                    <p className="panel-empty-text" style={{ fontSize: 12 }}>Sin hallazgos críticos pendientes</p>
                  </div>
                ) : recentFindings.map(f => {
                  const projRaw = f.projects
                  const proj = (Array.isArray(projRaw) ? projRaw[0] : projRaw) as { name: string } | null
                  const projectId = (f as Record<string, unknown>).project_id as string ?? ''
                  const sevColor = f.severity === 'critical' ? '#f87171' : '#fb923c'
                  return (
                    <Link key={f.id} href={`/projects/${projectId}/findings/${f.id}`} className="finding-row">
                      <span className="finding-dot" style={{ background: SEVERITY_DOT[f.severity] }} />
                      <div className="finding-info">
                        <p className="finding-title">{f.title}</p>
                        <p className="finding-meta">
                          <span style={{ color: sevColor }}>{SEVERITY_LABEL[f.severity]}</span>
                          <span>·</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj?.name ?? '—'}</span>
                        </p>
                      </div>
                      <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0, marginTop: 2 }} />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  Acciones rápidas
                </div>
              </div>
              <div className="quick-grid">
                {[
                  { href: '/projects/new',  icon: FolderOpen,   label: 'Nuevo proyecto',  color: '#60a5fa' },
                  { href: '/code-analysis', icon: Code2,        label: 'Analizar código', color: '#c084fc' },
                  { href: '/reports',       icon: TrendingDown, label: 'Ver reportes',    color: '#4ade80' },
                  { href: '/organizations', icon: Globe,        label: 'Clientes',        color: '#fb923c' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href} className="quick-btn">
                    <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                    <span className="quick-btn-label">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Frameworks */}
            <div className="panel">
              <div className="fw-wrap">
                <div className="fw-section-label">
                  <Lock size={12} />
                  Cobertura de frameworks
                </div>
                {fwCoverage.map(fw => (
                  <div key={fw.name} className="fw-item">
                    <div className="fw-labels">
                      <span>{fw.name}</span>
                      <span style={{ color: fw.pct > 0 ? fw.color : 'rgba(255,255,255,0.25)' }}>
                        {fw.pct}%
                      </span>
                    </div>
                    <div className="fw-track">
                      <div className="fw-fill" style={{ width: `${fw.pct}%`, background: fw.color }} />
                    </div>
                  </div>
                ))}
                {total === 0 && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '8px 0 0', textAlign: 'center' }}>
                    Sin hallazgos registrados aún
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts: distribución + por proyecto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>

          {/* Distribución por severidad */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <BarChart2 size={14} color="rgba(255,255,255,0.4)" />
                Distribución por severidad
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{total} hallazgos</span>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {sevDist.map(s => (
                <div key={s.key} style={{ marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        {total > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.count > 0 ? s.color : 'rgba(255,255,255,0.2)', minWidth: 20, textAlign: 'right' as const }}>{s.count}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: total > 0 ? `${(s.count / total) * 100}%` : '0%', background: s.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
              {total === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '16px 0' }}>Sin hallazgos registrados</p>
              )}
            </div>
          </div>

          {/* Hallazgos por proyecto */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <FolderOpen size={14} color="rgba(255,255,255,0.4)" />
                Hallazgos por proyecto
              </div>
              <Link href="/projects" className="panel-link">Ver todos <ChevronRight size={12} /></Link>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {projects?.length ? projects.map(project => {
                const pFindings = (project.findings ?? []) as { severity: string; status: string }[]
                const pOpen = pFindings.filter(f => f.status !== 'resolved').length
                const pCrit = pFindings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length
                const pct = maxFindings > 0 ? (pFindings.length / maxFindings) * 100 : 0
                const barColor = pCrit > 0 ? '#ef4444' : pOpen > 0 ? '#f97316' : '#4ade80'
                return (
                  <div key={project.id} style={{ marginBottom: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{project.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: pOpen > 0 ? '#fff' : '#4ade80', flexShrink: 0 }}>
                        {pOpen} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>abiertos</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99 }} />
                    </div>
                  </div>
                )
              }) : (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '16px 0' }}>Sin proyectos activos</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
