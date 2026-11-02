import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Shield, AlertTriangle, CheckCircle, TrendingDown,
  ArrowRight, Clock, Flame, Activity, Lock, Globe,
  ChevronRight, BarChart2, Zap
} from 'lucide-react'

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-400',
  info:     'bg-gray-500',
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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-black leading-none" style={{ fontSize: size * 0.28 }}>{grade}</span>
        <span className="text-white/40 leading-none" style={{ fontSize: size * 0.16 }}>{score}</span>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, full_name')
    .eq('id', user!.id)
    .single()

  // Proyectos activos con sus findings
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, type, status, start_date,
      findings(severity, status)
    `)
    .eq('tenant_id', profile!.tenant_id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(6)

  // Findings recientes sin resolver
  const { data: recentFindings } = await supabase
    .from('findings')
    .select('id, title, severity, status, created_at, projects(name)')
    .in('severity', ['critical', 'high'])
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(8)

  // Totales globales
  const { data: allFindings } = await supabase
    .from('findings')
    .select('severity, status')

  const total = allFindings?.length ?? 0
  const critical = allFindings?.filter(f => f.severity === 'critical').length ?? 0
  const high = allFindings?.filter(f => f.severity === 'high').length ?? 0
  const resolved = allFindings?.filter(f => f.status === 'resolved').length ?? 0
  const open = total - resolved

  // Score global (simplificado)
  const penalty = (critical * 20 + high * 10) / Math.max(total, 1) * 10
  const globalScore = Math.max(0, Math.round(100 - Math.min(penalty, 100)))

  // Hora del día para saludo
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Alejandro'

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-white/40 text-sm mb-1">{greeting}, {firstName}</p>
            <h1 className="text-2xl font-bold text-white">Postura de Seguridad</h1>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            Nuevo proyecto
          </Link>
        </div>

        {/* Score global + stats */}
        <div className="grid grid-cols-12 gap-4 mb-6">

          {/* Score principal */}
          <div className="col-span-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex items-center gap-5">
            <ScoreRing score={globalScore} size={88} />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Score global</p>
              <p className="text-white font-bold text-lg leading-tight">
                {globalScore >= 75 ? 'Buena postura' : globalScore >= 50 ? 'Postura media' : 'Postura crítica'}
              </p>
              <p className="text-white/30 text-xs mt-1">{projects?.length ?? 0} proyectos activos</p>
            </div>
          </div>

          {/* Stats */}
          {[
            {
              icon: <Flame className="w-4 h-4 text-red-400" />,
              bg: 'bg-red-500/10 border-red-500/20',
              label: 'Críticos abiertos',
              value: critical,
              sub: 'requieren acción inmediata',
              alert: critical > 0,
            },
            {
              icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
              bg: 'bg-orange-500/10 border-orange-500/20',
              label: 'Altos sin resolver',
              value: high,
              sub: 'alta prioridad',
              alert: false,
            },
            {
              icon: <Activity className="w-4 h-4 text-blue-400" />,
              bg: 'bg-blue-500/10 border-blue-500/20',
              label: 'Total hallazgos',
              value: open,
              sub: `${resolved} resueltos`,
              alert: false,
            },
            {
              icon: <CheckCircle className="w-4 h-4 text-green-400" />,
              bg: 'bg-green-500/10 border-green-500/20',
              label: 'Tasa de resolución',
              value: total > 0 ? `${Math.round((resolved / total) * 100)}%` : '—',
              sub: `${resolved} de ${total}`,
              alert: false,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`col-span-2 rounded-2xl border p-5 ${stat.bg} ${stat.alert ? 'ring-1 ring-red-500/40' : 'border-white/[0.08] bg-white/[0.04]'}`}
              style={stat.alert ? {} : { background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-white/10">{stat.icon}</div>
              </div>
              <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-white/60 text-xs font-medium">{stat.label}</p>
              <p className="text-white/25 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4">

          {/* Proyectos — izquierda */}
          <div className="col-span-7">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/80">Proyectos activos</h2>
                </div>
                <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {!projects?.length ? (
                  <div className="px-5 py-12 text-center">
                    <Shield className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">No hay proyectos activos</p>
                    <Link href="/projects/new" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                      Crear primer proyecto →
                    </Link>
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
                  const gradeColor = pScore >= 75 ? 'text-green-400' : pScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  const typeLabel = project.type === 'web' ? 'Web' : project.type === 'infrastructure' ? 'Infra' : 'Web + Infra'

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
                        {/* Grade */}
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                          <span className={`text-lg font-black ${gradeColor}`}>{pGrade}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white/90 truncate">{project.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.07] text-white/40 flex-shrink-0">
                              {typeLabel}
                            </span>
                            {pCritical > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                                {pCritical} crítico{pCritical > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {/* Mini severity dots */}
                            {['critical','high','medium','low'].map(s => {
                              const c = findings.filter(f => f.severity === s && f.status !== 'resolved').length
                              return c > 0 ? (
                                <span key={s} className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[s]}`} />
                                  <span className="text-[11px] text-white/30">{c}</span>
                                </span>
                              ) : null
                            })}
                            {pTotal === 0 && <span className="text-[11px] text-white/20">Sin hallazgos</span>}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-24 flex-shrink-0">
                          <div className="flex justify-between text-[10px] text-white/30 mb-1">
                            <span>Resolución</span>
                            <span>{pTotal > 0 ? Math.round((pResolved/pTotal)*100) : 0}%</span>
                          </div>
                          <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pScore >= 75 ? 'bg-green-500' : pScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pTotal > 0 ? (pResolved/pTotal)*100 : 0}%` }}
                            />
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Feed de críticos — derecha */}
          <div className="col-span-5 space-y-4">

            {/* Hallazgos críticos/altos */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-semibold text-white/80">Requieren atención</h2>
                </div>
                {critical + high > 8 && (
                  <span className="text-xs text-white/30">+{critical + high - 8} más</span>
                )}
              </div>

              <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
                {!recentFindings?.length ? (
                  <div className="px-5 py-10 text-center">
                    <CheckCircle className="w-7 h-7 text-green-500/40 mx-auto mb-2" />
                    <p className="text-white/30 text-xs">Sin hallazgos críticos pendientes</p>
                  </div>
                ) : recentFindings.map(f => {
                  const proj = f.projects as { name: string } | null
                  return (
                    <Link key={f.id} href={`/projects/${(f as { project_id?: string }).project_id ?? ''}/findings/${f.id}`}>
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEVERITY_DOT[f.severity]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate">{f.title}</p>
                          <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1.5">
                            {f.severity === 'critical'
                              ? <span className="text-red-400">{SEVERITY_LABEL[f.severity]}</span>
                              : <span className="text-orange-400">{SEVERITY_LABEL[f.severity]}</span>
                            }
                            <span>·</span>
                            <span className="truncate">{proj?.name ?? '—'}</span>
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/30 flex-shrink-0 mt-1" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Acciones rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: '/projects/new',  icon: FolderOpen,     label: 'Nuevo proyecto',  color: 'text-blue-400' },
                  { href: '/code-analysis', icon: Code2,          label: 'Analizar código', color: 'text-purple-400' },
                  { href: '/reports',       icon: TrendingDown,   label: 'Ver reportes',    color: 'text-green-400' },
                  { href: '/organizations', icon: Globe,          label: 'Clientes',        color: 'text-orange-400' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all group"
                  >
                    <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                    <span className="text-xs text-white/60 group-hover:text-white/90 font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Frameworks coverage */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-white/30" />
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Cobertura de frameworks</p>
              </div>
              {[
                { name: 'OWASP Top 10',  pct: 82 },
                { name: 'ISO 27001',     pct: 67 },
                { name: 'PCI-DSS v4.0', pct: 54 },
                { name: 'NIST CSF 2.0', pct: 71 },
              ].map(fw => (
                <div key={fw.name} className="mb-2.5">
                  <div className="flex justify-between text-[11px] text-white/40 mb-1">
                    <span>{fw.name}</span>
                    <span>{fw.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                      style={{ width: `${fw.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
