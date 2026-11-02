import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderOpen, ChevronRight } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  in_progress: { label: 'En curso',    className: 'bg-blue-50 text-blue-700' },
  review:      { label: 'Revisión',    className: 'bg-yellow-50 text-yellow-700' },
  completed:   { label: 'Completado',  className: 'bg-green-50 text-green-700' },
  archived:    { label: 'Archivado',   className: 'bg-gray-50 text-gray-500' },
}

const TYPE_LABEL: Record<string, string> = {
  web: 'Web', infrastructure: 'Infraestructura', both: 'Web + Infraestructura'
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*, organization:organizations(name), findings(severity)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 text-sm mt-1">{projects?.length ?? 0} auditorías</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </Link>
      </div>

      {!projects?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay proyectos aún</p>
          <Link href="/projects/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {projects.map(project => {
            const findings = (project.findings as { severity: string }[]) ?? []
            const critical = findings.filter(f => f.severity === 'critical').length
            const high = findings.filter(f => f.severity === 'high').length
            const status = STATUS_LABEL[project.status]
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-600">{project.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {(Array.isArray(project.organization) ? project.organization[0] : project.organization as {name:string} | null)?.name ?? '—'} · {TYPE_LABEL[project.type]}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {critical > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                          {critical} crítica{critical > 1 ? 's' : ''}
                        </span>
                      )}
                      {high > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium">
                          {high} alta{high > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{findings.length} hallazgos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
  )
}
