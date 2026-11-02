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

const SEV_ACTIVE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.18)',  color: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
  high:     { bg: 'rgba(249,115,22,0.15)', color: '#fdba74', border: 'rgba(249,115,22,0.35)' },
  medium:   { bg: 'rgba(234,179,8,0.15)',  color: '#fde047', border: 'rgba(234,179,8,0.35)' },
  low:      { bg: 'rgba(96,165,250,0.15)', color: '#93c5fd', border: 'rgba(96,165,250,0.35)' },
  info:     { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.2)' },
}

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
    if (!form.title) { alert('Ingresá el título del hallazgo primero'); return }
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
      affected_components: form.affected_components ? form.affected_components.split('\n').filter(Boolean) : [],
    }
    const { data, error } = await supabase.from('findings').insert(payload).select('id').single()
    if (!error && data) {
      router.push(`/projects/${params.id}`)
    } else {
      alert('Error: ' + error?.message)
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .nf-wrap { padding: 24px 28px; max-width: 700px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .nf-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color 0.12s; }
        .nf-back:hover { color: rgba(255,255,255,0.8); }
        .nf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .nf-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
        .btn-ai { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; background: rgba(124,58,237,0.25); border: 1px solid rgba(167,139,250,0.35); color: #c084fc; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-ai:hover { background: rgba(124,58,237,0.4); }
        .btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }
        .nf-field { margin-bottom: 16px; }
        .nf-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
        .nf-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.12s; }
        .nf-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .nf-input option { background: #131f35; }
        .nf-textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; resize: none; transition: border-color 0.12s; }
        .nf-textarea:focus { border-color: rgba(59,130,246,0.5); }
        .nf-textarea.mono { font-family: monospace; font-size: 12px; }
        .nf-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .sev-btn { width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); cursor: pointer; font-family: inherit; text-align: left; transition: all 0.12s; margin-bottom: 5px; }
        .sev-btn:last-child { margin-bottom: 0; }
        .sev-btn:not(.active):hover { background: rgba(255,255,255,0.07); }
        .ai-section { background: rgba(124,58,237,0.06); border: 1px solid rgba(167,139,250,0.15); border-radius: 11px; padding: 16px; margin-bottom: 16px; }
        .ai-section-label { font-size: 11px; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 14px; display: flex; align-items: center; gap: 7px; }
        .nf-footer { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 11px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .btn-submit { flex: 1; padding: 11px; border-radius: 9px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-submit:hover { background: rgba(37,99,235,1); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="nf-wrap">
        <Link href={`/projects/${params.id}`} className="nf-back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <div className="nf-header">
          <h1 className="nf-title">Nuevo hallazgo</h1>
          <button type="button" onClick={handleAIGenerate} disabled={generating} className="btn-ai">
            {generating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            {generating ? 'Generando con IA…' : 'Generar con IA'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="nf-field">
            <label className="nf-label">Título *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: SQL Injection en /api/users"
              className="nf-input"
            />
          </div>

          <div className="nf-2col">
            {/* Severidad */}
            <div>
              <label className="nf-label">Severidad *</label>
              {SEVERITY_ORDER.map(s => {
                const active = form.severity === s
                const cfg = SEV_ACTIVE[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`sev-btn${active ? ' active' : ''}`}
                    style={active ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : {}}
                  >
                    {SEVERITY_CONFIG[s]?.label ?? s}
                  </button>
                )
              })}
            </div>
            {/* Categoría + CVE + CVSS */}
            <div>
              <div className="nf-field">
                <label className="nf-label">Categoría</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="nf-input">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="nf-field">
                <label className="nf-label">CVE ID</label>
                <input value={form.cve_id} onChange={e => setForm(f => ({ ...f, cve_id: e.target.value }))} placeholder="CVE-2024-XXXXX" className="nf-input" />
              </div>
              <div className="nf-field">
                <label className="nf-label">CVSS Score</label>
                <input type="number" step="0.1" min="0" max="10" value={form.cvss_score} onChange={e => setForm(f => ({ ...f, cvss_score: e.target.value }))} placeholder="0.0 – 10.0" className="nf-input" />
              </div>
            </div>
          </div>

          {/* IA section */}
          <div className="ai-section">
            <p className="ai-section-label"><Sparkles size={12} />Contenido generado por IA (editable)</p>
            <div className="nf-field">
              <label className="nf-label">Descripción</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción técnica del hallazgo…" className="nf-textarea" />
            </div>
            <div className="nf-field">
              <label className="nf-label">Impacto</label>
              <textarea rows={3} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} placeholder="Impacto potencial para el negocio…" className="nf-textarea" />
            </div>
            <div className="nf-field" style={{ marginBottom: 0 }}>
              <label className="nf-label">Recomendación</label>
              <textarea rows={3} value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} placeholder="Pasos concretos para remediar…" className="nf-textarea" />
            </div>
          </div>

          <div className="nf-field">
            <label className="nf-label">Evidencia / POC</label>
            <textarea rows={3} value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="URLs, capturas, comandos usados…" className="nf-textarea mono" />
          </div>

          <div className="nf-field">
            <label className="nf-label">Componentes afectados <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(uno por línea)</span></label>
            <textarea rows={2} value={form.affected_components} onChange={e => setForm(f => ({ ...f, affected_components: e.target.value }))} placeholder={"https://app.example.com/api/login\n192.168.1.10"} className="nf-textarea mono" />
          </div>

          <div className="nf-footer">
            <Link href={`/projects/${params.id}`} className="btn-cancel">Cancelar</Link>
            <button type="submit" disabled={saving} className="btn-submit">
              {saving ? 'Guardando…' : 'Guardar hallazgo'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
