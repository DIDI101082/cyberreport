import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER } from '@/lib/utils/severity'
import { Plus, FileText, ChevronRight, ArrowLeft, Globe, Server } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  open:       { label: 'Abierto',   className: 'bg-red-50 text-red-700' },
  in_review:  { label: 'Revisión',  className: 'bg-yellow-50 text-yellow-700' },
  resolved:   { label: 'Resuelto',  className: 'bg-green-50 text-green-700' },
  accepted:   { label: 'Aceptado',  className: 'bg-gray-50 text-gray-600' },
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  web: <Globe className="w-3.5 h-3.5" />,
  infrastructure: <Server className="w-3.5 h-3.5" />,
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

  return (
    <div className="p-8">
      {/* Header */}
      <Link href="/projects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft className="w-4 h-4" /> Proyectos
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {(Array.isArray(project.organization) ? project.organization[0] : project.organization as { name: string } | null)?.name}
            {project.start_date && ` · ${new Date(project.start_date).toLocaleDateString('es')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${params.id}/report`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generar reporte
          </Link>
          <Link
            href={`/projects/${params.id}/findings/new`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar hallazgo
          </Link>
        </div>
      </div>

      {/* Resumen de severidad */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SEVERITY_ORDER.map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{severityCounts[s]}</p>
            <SeverityBadge severity={s} size="sm" />
          </div>
        ))}
      </div>

      {/* Hallazgos */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Hallazgos <span className="text-gray-400 font-normal text-sm ml-1">({findings?.length ?? 0})</span>
          </h2>
        </div>

        {!findings?.length ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-3">No hay hallazgos registrados</p>
            <Link
              href={`/projects/${params.id}/findings/new`}
              className="text-blue-600 text-sm hover:underline"
            >
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {findings.map(f => {
              const status = STATUS_MAP[f.status]
              return (
                <Link
                  key={f.id}
                  href={`/projects/${params.id}/findings/${f.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      <SeverityBadge severity={f.severity as SeverityLevel} size="sm" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{f.title}</p>
                      {f.cve_id && (
                        <p className="text-xs text-gray-400 mt-0.5">{f.cve_id}</p>
                      )}
                      {f.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-1">
                          {CATEGORY_ICON[f.category] ?? null}
                          {f.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.cvss_score && (
                      <span className="text-xs font-mono font-medium text-gray-500">
                        CVSS {f.cvss_score}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
