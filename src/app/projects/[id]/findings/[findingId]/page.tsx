'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { Finding, SeverityLevel } from '@/types'
import { ArrowLeft, Trash2, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'open',      label: 'Abierto' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved',  label: 'Resuelto' },
  { value: 'accepted',  label: 'Riesgo aceptado' },
]

export default function FindingDetailPage() {
  const params = useParams<{ id: string; findingId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [finding, setFinding] = useState<Finding | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    supabase
      .from('findings')
      .select('*')
      .eq('id', params.findingId)
      .single()
      .then(({ data }) => setFinding(data))
  }, [params.findingId])

  function update<K extends keyof Finding>(key: K, value: Finding[K]) {
    setFinding(f => f ? { ...f, [key]: value } : f)
    setDirty(true)
  }

  async function handleAIRegenerate() {
    if (!finding) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finding.title, severity: finding.severity, category: finding.category }),
      })
      const data = await res.json()
      setFinding(f => f ? { ...f, description: data.description, impact: data.impact, recommendation: data.recommendation } : f)
      setDirty(true)
    } catch { /* noop */ } finally { setGenerating(false) }
  }

  async function handleSave() {
    if (!finding) return
    setSaving(true)
    await supabase.from('findings').update(finding).eq('id', finding.id)
    setSaving(false)
    setDirty(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este hallazgo?')) return
    await supabase.from('findings').delete().eq('id', params.findingId)
    router.push(`/projects/${params.id}`)
  }

  if (!finding) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <Link href={`/projects/${params.id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft className="w-4 h-4" /> Volver al proyecto
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={finding.severity as SeverityLevel} />
          <h1 className="text-xl font-bold text-gray-900">{finding.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAIRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 border border-purple-300 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-50 disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Re-generar IA
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('status', opt.value as Finding['status'])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  finding.status === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            rows={4}
            value={finding.description ?? ''}
            onChange={e => update('description', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Impacto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
          <textarea
            rows={3}
            value={finding.impact ?? ''}
            onChange={e => update('impact', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Recomendación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recomendación</label>
          <textarea
            rows={3}
            value={finding.recommendation ?? ''}
            onChange={e => update('recommendation', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Evidencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia / POC</label>
          <textarea
            rows={3}
            value={finding.evidence ?? ''}
            onChange={e => update('evidence', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  )
}
