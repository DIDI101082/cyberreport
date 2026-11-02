'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    organization_id: '',
    type: 'web' as 'web' | 'infrastructure' | 'both',
    scope: '',
    start_date: '',
    end_date: '',
    target_frameworks: [] as string[],
  })

  useEffect(() => {
    supabase.from('organizations').select('*').order('name').then(({ data }) => {
      if (data) setOrgs(data)
    })
  }, [])

  const FRAMEWORKS = ['ISO 27001', 'PCI-DSS v4.0', 'NIST CSF 2.0']

  function toggleFramework(fw: string) {
    setForm(f => ({
      ...f,
      target_frameworks: f.target_frameworks.includes(fw)
        ? f.target_frameworks.filter(x => x !== fw)
        : [...f.target_frameworks, fw],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...form, status: 'in_progress' })
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/projects/${data.id}`)
    } else {
      alert('Error al crear el proyecto: ' + error?.message)
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/projects" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a proyectos
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo proyecto</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del proyecto *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Pentest Web — Empresa ABC Q1 2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
          <select
            required
            value={form.organization_id}
            onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar cliente…</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de auditoría *</label>
          <div className="flex gap-3">
            {[
              { value: 'web', label: 'Web (OWASP)' },
              { value: 'infrastructure', label: 'Infraestructura' },
              { value: 'both', label: 'Ambas' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: opt.value as typeof f.type }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.type === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alcance / Descripción</label>
          <textarea
            value={form.scope}
            onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
            rows={3}
            placeholder="Dominio, IPs, aplicaciones en alcance…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marcos normativos</label>
          <div className="flex gap-3">
            {FRAMEWORKS.map(fw => (
              <button
                key={fw}
                type="button"
                onClick={() => toggleFramework(fw)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  form.target_frameworks.includes(fw)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <Link
            href="/projects"
            className="flex-1 py-2.5 text-center rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creando…' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </div>
  )
}
