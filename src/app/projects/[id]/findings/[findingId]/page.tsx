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

const STATUS_ACTIVE: Record<string, { bg: string; color: string; border: string }> = {
  open:      { bg: 'rgba(248,113,113,0.15)', color: '#fca5a5', border: 'rgba(248,113,113,0.35)' },
  in_review: { bg: 'rgba(250,204,21,0.15)',  color: '#fde047', border: 'rgba(250,204,21,0.35)' },
  resolved:  { bg: 'rgba(74,222,128,0.15)',  color: '#86efac', border: 'rgba(74,222,128,0.35)' },
  accepted:  { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.2)' },
}

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
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <Loader2 size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <>
      <style>{`
        .fd-wrap { padding: 24px 28px; max-width: 700px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .fd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .fd-back:hover { color: rgba(255,255,255,0.8); }
        .fd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
        .fd-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
        .fd-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .btn-regen { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; background: rgba(124,58,237,0.15); border: 1px solid rgba(167,139,250,0.25); color: #c084fc; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-regen:hover { background: rgba(124,58,237,0.25); }
        .btn-regen:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-del { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-del:hover { background: rgba(239,68,68,0.2); }
        .fd-field { margin-bottom: 16px; }
        .fd-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
        .fd-textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; resize: none; transition: border-color 0.12s; }
        .fd-textarea:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .fd-textarea.mono { font-family: monospace; font-size: 12px; }
        .status-btns { display: flex; gap: 7px; flex-wrap: wrap; }
        .status-btn { padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .status-btn:not(.active):hover { background: rgba(255,255,255,0.07); }
        .btn-save { width: 100%; padding: 12px; border-radius: 9px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 8px; transition: all 0.12s; }
        .btn-save:hover { background: rgba(37,99,235,1); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="fd-wrap">
        <Link href={`/projects/${params.id}`} className="fd-back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <div className="fd-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ flexShrink: 0 }}>
              <SeverityBadge severity={finding.severity as SeverityLevel} />
            </div>
            <h1 className="fd-title">{finding.title}</h1>
          </div>
          <div className="fd-actions" style={{ marginLeft: 16 }}>
            <button onClick={handleAIRegenerate} disabled={generating} className="btn-regen">
              {generating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
              Re-generar IA
            </button>
            <button onClick={handleDelete} className="btn-del">
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>

        {/* Estado */}
        <div className="fd-field">
          <label className="fd-label">Estado</label>
          <div className="status-btns">
            {STATUS_OPTIONS.map(opt => {
              const active = finding.status === opt.value
              const cfg = STATUS_ACTIVE[opt.value]
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('status', opt.value as Finding['status'])}
                  className={`status-btn${active ? ' active' : ''}`}
                  style={active ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : {}}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="fd-field">
          <label className="fd-label">Descripción</label>
          <textarea rows={4} value={finding.description ?? ''} onChange={e => update('description', e.target.value)} className="fd-textarea" />
        </div>

        <div className="fd-field">
          <label className="fd-label">Impacto</label>
          <textarea rows={3} value={finding.impact ?? ''} onChange={e => update('impact', e.target.value)} className="fd-textarea" />
        </div>

        <div className="fd-field">
          <label className="fd-label">Recomendación</label>
          <textarea rows={3} value={finding.recommendation ?? ''} onChange={e => update('recommendation', e.target.value)} className="fd-textarea" />
        </div>

        <div className="fd-field">
          <label className="fd-label">Evidencia / POC</label>
          <textarea rows={3} value={finding.evidence ?? ''} onChange={e => update('evidence', e.target.value)} className="fd-textarea mono" />
        </div>

        {dirty && (
          <button onClick={handleSave} disabled={saving} className="btn-save">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </>
  )
}
