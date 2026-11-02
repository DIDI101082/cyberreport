'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { Finding, SeverityLevel } from '@/types'
import { ArrowLeft, Trash2, Sparkles, Loader2, ChevronDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'open',           label: 'Abierto' },
  { value: 'in_review',      label: 'En revisión' },
  { value: 'resolved',       label: 'Resuelto' },
  { value: 'accepted',       label: 'Riesgo aceptado' },
  { value: 'false_positive', label: 'Falso positivo' },
]

const STATUS_ACTIVE: Record<string, { bg: string; color: string; border: string }> = {
  open:           { bg: 'rgba(248,113,113,0.15)',  color: '#fca5a5', border: 'rgba(248,113,113,0.35)' },
  in_review:      { bg: 'rgba(250,204,21,0.15)',   color: '#fde047', border: 'rgba(250,204,21,0.35)' },
  resolved:       { bg: 'rgba(74,222,128,0.15)',   color: '#86efac', border: 'rgba(74,222,128,0.35)' },
  accepted:       { bg: 'rgba(255,255,255,0.08)',  color: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.2)' },
  false_positive: { bg: 'rgba(107,114,128,0.12)',  color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
}

const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)', icon: '🟣' },
  { value: 'openai',    label: 'GPT-4o (OpenAI)',    icon: '🟢' },
]

function cvssToSeverity(score: number): string {
  if (score >= 9.0) return '🔴 CRÍTICO'
  if (score >= 7.0) return '🟠 ALTO'
  if (score >= 4.0) return '🟡 MEDIO'
  if (score > 0)    return '🔵 BAJO'
  return '⚪ NINGUNO'
}

export default function FindingDetailPage() {
  const params = useParams<{ id: string; findingId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [finding, setFinding] = useState<Finding | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [providerOpen, setProviderOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle')

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
    setAiStatus('idle')
    try {
      const res = await fetch('/api/ai/generate-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          provider: aiProvider,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 503) {
          alert(`API key no configurada: ${data.error}\n\nAgregá la variable en Vercel → Settings → Environment Variables`)
        } else {
          alert('Error al generar con IA: ' + (data.error ?? 'desconocido'))
        }
        setAiStatus('error')
        return
      }
      setFinding(f => f ? {
        ...f,
        description: data.description ?? f.description,
        impact: data.impact ?? f.impact,
        recommendation: data.recommendation ?? f.recommendation,
      } : f)
      setDirty(true)
      setAiStatus('success')
    } catch {
      alert('Error de red al contactar la API de IA.')
      setAiStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!finding) return
    setSaving(true)
    const { error } = await supabase.from('findings').update(finding).eq('id', finding.id)
    if (error) alert('Error al guardar: ' + error.message)
    setSaving(false)
    setDirty(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este hallazgo? Esta acción no se puede deshacer.')) return
    await supabase.from('findings').delete().eq('id', params.findingId)
    router.push(`/projects/${params.id}`)
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === aiProvider)!

  if (!finding) return (
    <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
      <Loader2 size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const cvssNum = finding.cvss_score ?? 0

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
        .fd-wrap { padding: 24px 28px; max-width: 740px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .fd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .fd-back:hover { color: rgba(255,255,255,0.8); }
        .fd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 12px; }
        .fd-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
        .fd-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }

        /* AI button group */
        .ai-group { display: flex; align-items: center; }
        .btn-regen { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(124,58,237,0.18); border: 1px solid rgba(167,139,250,0.28); border-right: none; color: #c084fc; font-size: 12px; font-weight: 600; border-radius: 8px 0 0 8px; cursor: pointer; font-family: inherit; transition: all 0.12s; white-space: nowrap; }
        .btn-regen:hover:not(:disabled) { background: rgba(124,58,237,0.32); }
        .btn-regen:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-regen.success { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #86efac; }
        .provider-btn-sm { display: inline-flex; align-items: center; gap: 3px; padding: 7px 8px; background: rgba(124,58,237,0.12); border: 1px solid rgba(167,139,250,0.28); color: rgba(167,139,250,0.7); font-size: 11px; border-radius: 0 8px 8px 0; cursor: pointer; font-family: inherit; position: relative; }
        .provider-btn-sm:hover { background: rgba(124,58,237,0.22); }
        .provider-dropdown { position: absolute; top: calc(100% + 5px); right: 0; min-width: 180px; background: #131f35; border: 1px solid rgba(167,139,250,0.22); border-radius: 9px; padding: 5px; z-index: 50; animation: fadeIn 0.12s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .provider-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; color: rgba(255,255,255,0.7); transition: background 0.1s; }
        .provider-opt:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .provider-opt.active { background: rgba(124,58,237,0.2); color: #c084fc; }

        .btn-del { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); color: #f87171; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-del:hover { background: rgba(239,68,68,0.18); }

        /* Fields */
        .fd-field { margin-bottom: 16px; }
        .fd-label { display: block; font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.42); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 7px; }
        .fd-input { width: 100%; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.12s; }
        .fd-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .fd-textarea { width: 100%; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; resize: vertical; transition: border-color 0.12s; }
        .fd-textarea:focus { border-color: rgba(59,130,246,0.5); }
        .fd-textarea.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
        .fd-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .fd-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .status-btns { display: flex; gap: 7px; flex-wrap: wrap; }
        .status-btn { padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.42); cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .status-btn:not(.active):hover { background: rgba(255,255,255,0.07); }

        /* CVSS bar */
        .cvss-bar-wrap { margin-top: 8px; }
        .cvss-bar-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
        .cvss-bar-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
        .cvss-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; }
        .cvss-rating { font-size: 11px; color: rgba(255,255,255,0.4); }
        .cvss-link { font-size: 11px; color: #60a5fa; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .cvss-link:hover { color: #93c5fd; }

        /* Section */
        .section-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 18px 0; }
        .section-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); margin: 0 0 14px; }

        .btn-save { width: 100%; padding: 12px; border-radius: 9px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 8px; transition: all 0.12s; }
        .btn-save:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .unsaved-banner { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2); border-radius: 9px; margin-top: 16px; font-size: 12px; color: #fde047; }
        .spin { animation: spin 1s linear infinite; }
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
          <div className="fd-actions">
            {/* AI button + provider */}
            <div className="ai-group">
              <button
                onClick={handleAIRegenerate}
                disabled={generating}
                className={`btn-regen${aiStatus === 'success' ? ' success' : ''}`}
              >
                {generating ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                {generating ? 'Generando…' : aiStatus === 'success' ? '✓ IA' : 'Re-generar IA'}
              </button>
              <div style={{ position: 'relative' }}>
                <button className="provider-btn-sm" onClick={() => setProviderOpen(o => !o)}>
                  {selectedProvider.icon}
                  <ChevronDown size={10} />
                </button>
                {providerOpen && (
                  <div className="provider-dropdown">
                    {AI_PROVIDERS.map(p => (
                      <div
                        key={p.value}
                        className={`provider-opt${p.value === aiProvider ? ' active' : ''}`}
                        onClick={() => { setAiProvider(p.value as 'anthropic' | 'openai'); setProviderOpen(false); setAiStatus('idle') }}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

        <div className="section-sep" />

        {/* Identificadores */}
        <p className="section-label">Identificadores y métricas</p>
        <div className="fd-3col">
          <div className="fd-field" style={{ marginBottom: 0 }}>
            <label className="fd-label">CVE ID</label>
            <input
              value={finding.cve_id ?? ''}
              onChange={e => update('cve_id', e.target.value)}
              placeholder="CVE-2024-XXXXX"
              className="fd-input"
            />
          </div>
          <div className="fd-field" style={{ marginBottom: 0 }}>
            <label className="fd-label">CWE ID</label>
            <input
              value={(finding as { cwe_id?: string }).cwe_id ?? ''}
              onChange={e => update('cwe_id' as keyof Finding, e.target.value as unknown as Finding[keyof Finding])}
              placeholder="CWE-89"
              className="fd-input"
            />
          </div>
          <div className="fd-field" style={{ marginBottom: 0 }}>
            <label className="fd-label">CVSS Score</label>
            <input
              type="number"
              step="0.1" min="0" max="10"
              value={finding.cvss_score ?? ''}
              onChange={e => update('cvss_score', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.0–10.0"
              className="fd-input"
            />
          </div>
        </div>

        {/* CVSS Vector + visual bar */}
        <div className="fd-field">
          <label className="fd-label">CVSS Vector</label>
          <input
            value={(finding as { cvss_vector?: string }).cvss_vector ?? ''}
            onChange={e => update('cvss_vector' as keyof Finding, e.target.value as unknown as Finding[keyof Finding])}
            placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
            className="fd-input"
          />
          {cvssNum > 0 && (
            <div className="cvss-bar-wrap">
              <div className="cvss-bar-track">
                <div
                  className="cvss-bar-fill"
                  style={{
                    width: `${(cvssNum / 10) * 100}%`,
                    background: cvssNum >= 9 ? '#ef4444' : cvssNum >= 7 ? '#f97316' : cvssNum >= 4 ? '#eab308' : '#60a5fa',
                  }}
                />
              </div>
              <div className="cvss-meta">
                <span className="cvss-rating">{cvssToSeverity(cvssNum)} · CVSS {cvssNum.toFixed(1)}</span>
                {(finding as { cvss_vector?: string }).cvss_vector && (
                  <a
                    href={`https://www.first.org/cvss/calculator/3.1#${(finding as { cvss_vector?: string }).cvss_vector}`}
                    target="_blank"
                    rel="noreferrer"
                    className="cvss-link"
                  >
                    Ver calculadora <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="section-sep" />

        {/* Contenido técnico */}
        <p className="section-label">Contenido técnico</p>

        <div className="fd-field">
          <label className="fd-label">Descripción</label>
          <textarea rows={5} value={finding.description ?? ''} onChange={e => update('description', e.target.value)} className="fd-textarea" />
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
          <div className="unsaved-banner">
            <span>Hay cambios sin guardar</span>
            <button onClick={handleSave} disabled={saving} className="btn-save" style={{ width: 'auto', padding: '7px 20px', marginTop: 0 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
