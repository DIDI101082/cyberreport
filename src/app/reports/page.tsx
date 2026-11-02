import { createClient } from '@/lib/supabase/server'
import { FileText, Download } from 'lucide-react'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, organization:organizations(name), findings(id)')
    .in('status', ['in_progress', 'review', 'completed'])
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">Generá PDF o PowerPoint de cada proyecto</p>
      </div>

      {!projects?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay proyectos disponibles</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {projects.map(project => {
            const orgRaw = project.organization
            const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw as { name: string } | null)?.name ?? '—'
            const findingCount = (project.findings as { id: string }[]).length
            return (
              <div key={project.id} className="flex items-center justify-between p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{org} · {findingCount} hallazgos</p>
                  </div>
                </div>
                <Link
                  href={`/projects/${project.id}/report`}
                  className="flex items-center gap-2 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Generar
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
