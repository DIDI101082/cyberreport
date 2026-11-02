'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FileText, Presentation, Loader2, Download } from 'lucide-react'
import Link from 'next/link'

export default function ReportPage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<{ name: string; organization: { name: string } | null } | null>(null)
  const [format, setFormat] = useState<'pdf' | 'pptx'>('pdf')
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase
      .from('projects')
      .select('name, target_frameworks, organization:organizations(name)')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const orgRaw = data.organization
          const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name: string } | null
          setProject({ name: data.name as string, organization: org })
          setFrameworks((data.target_frameworks as string[]) ?? [])
        }
      })
  }, [params.id])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const endpoint = format === 'pdf' ? '/api/reports/pdf' : '/api/reports/pptx'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: params.id, frameworks }),
      })
      if (!res.ok) throw new Error('Error generando reporte')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cyberreport_${params.id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error al generar el reporte: ' + (err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  if (!project) return (
    <div className="p-8 flex justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  const ALL_FRAMEWORKS = ['ISO 27001', 'PCI-DSS v4.0', 'NIST CSF 2.0']

  function toggleFw(fw: string) {
    setFrameworks(f => f.includes(fw) ? f.filter(x => x !== fw) : [...f, fw])
  }

  return (
    <div className="p-8 max-w-xl">
      <Link href={`/projects/${params.id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al proyecto
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Generar reporte</h1>
      <p className="text-gray-500 text-sm mb-8">{project.name}</p>

      {/* Formato */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Formato de exportación</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat('pdf')}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors ${
              format === 'pdf'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <FileText className={`w-7 h-7 ${format === 'pdf' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${format === 'pdf' ? 'text-blue-700' : 'text-gray-600'}`}>
              PDF
            </span>
            <span className="text-xs text-gray-400">Informe técnico completo</span>
          </button>
          <button
            onClick={() => setFormat('pptx')}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors ${
              format === 'pptx'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Presentation className={`w-7 h-7 ${format === 'pptx' ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${format === 'pptx' ? 'text-purple-700' : 'text-gray-600'}`}>
              PowerPoint
            </span>
            <span className="text-xs text-gray-400">Presentación ejecutiva</span>
          </button>
        </div>
      </div>

      {/* Frameworks */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">Marcos normativos a incluir</label>
        <div className="space-y-2">
          {ALL_FRAMEWORKS.map(fw => (
            <label key={fw} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={frameworks.includes(fw)}
                onChange={() => toggleFw(fw)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">{fw}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className={`w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
          format === 'pdf' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {generating ? 'Generando…' : `Descargar ${format.toUpperCase()}`}
      </button>
    </div>
  )
}
