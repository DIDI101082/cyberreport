'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER, SEVERITY_CONFIG } from '@/lib/utils/severity'

const CATEGORIES = [
  { value: 'web',            label: 'Web (OWASP)' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'network',        label: 'Red' },
  { value: 'social',         label: 'Social' },
  { value: 'physical',       label: 'Físico' },
  { value: 'other',          label: 'Otro' },
]

export default function NewFindingPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [form, setForm] = useState({
    title: '',
    severity: 'high' as SeverityLevel,
    category: 'web',
    cve_id: '',
    cvss_score: '',
    description: '',
    impact: '',
    recommendation: '',
    evidence: '',
    affected_components: '',
    status: 'open',
  })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleAIGenerate() {
    if (!form.title) {
      alert('Ingresá el título del hallazgo primero')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, severity: form.severity, category: form.category }),
      })
      if (!res.ok) throw new Error('Error en API')
      const data = await res.json()
      setForm(f => ({
        ...f,
        description: data.description ?? f.description,
        impact: data.impact ?? f.impact,
        recommendation: data.recommendation ?? f.recommendation,
      }))
    } catch {
      alert('Error al generar con IA. Verificá la clave de API.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      project_id: params.id,
      cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null,
      affected_components: form.affected_components
        ? form.affected_components.split('\n').filter(Boolean)
        : [],
    }
    const { data, error } = await supabase
      .from('findings')
      .insert(payload)
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/projects/${params.id}`)
    } else {
      alert('Error: ' + error?.message)
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href={`/projects/${params.id}`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al proyecto
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo hallazgo</h1>
        <button
          type="button"
          onClick={handleAIGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? 'Generando con IA…' : 'Generar con IA'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Ej: SQL Injection en /api/users"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Severidad + Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severidad *</label>
            <div className="flex flex-col gap-1.5">
              {SEVERITY_ORDER.map(s => {
                const cfg = SEVERITY_CONFIG[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`w-full py-1.5 rounded-lg text-xs font-medium border text-left px-3 transition-colors ${
                      form.severity === s
                        ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">CVE ID</label>
              <input
                value={form.cve_id}
                onChange={e => setForm(f => ({ ...f, cve_id: e.target.value }))}
                placeholder="CVE-2024-XXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVSS Score</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={form.cvss_score}
                onChange={e => setForm(f => ({ ...f, cvss_score: e.target.value }))}
                placeholder="0.0 – 10.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* AI-generated fields */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Contenido generado por IA (editable)
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción técnica del hallazgo…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
            <textarea
              rows={3}
              value={form.impact}
              onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}
              placeholder="Impacto potencial para el negocio…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recomendación</label>
            <textarea
              rows={3}
              value={form.recommendation}
              onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              placeholder="Pasos concretos para remediar…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            />
          </div>
        </div>

        {/* Evidencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia / POC</label>
          <textarea
            rows={3}
            value={form.evidence}
            onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
            placeholder="URLs, capturas, comandos usados…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
          />
        </div>

        {/* Componentes afectados */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Componentes afectados <span className="text-gray-400 font-normal">(uno por línea)</span>
          </label>
          <textarea
            rows={2}
            value={form.affected_components}
            onChange={e => setForm(f => ({ ...f, affected_components: e.target.value }))}
            placeholder="https://app.example.com/api/login&#10;192.168.1.10"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <Link
            href={`/projects/${params.id}`}
            className="flex-1 py-2.5 text-center rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar hallazgo'}
          </button>
        </div>
      </form>
    </div>
  )
}
