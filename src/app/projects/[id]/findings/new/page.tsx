'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Loader2, ChevronDown, BookOpen, X, Search } from 'lucide-react'
import Link from 'next/link'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER, SEVERITY_CONFIG } from '@/lib/utils/severity'
import { FINDING_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates/findings'
import CvssCalculator from '@/components/ui/CvssCalculator'

const CATEGORIES = [
  { value: 'web',            label: 'Web (OWASP)' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'network',        label: 'Red' },
  { value: 'social',         label: 'Ingeniería Social' },
  { value: 'physical',       label: 'Físico' },
  { value: 'other',          label: 'Otro' },
]

const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)', icon: '🟣' },
  { value: 'openai',    label: 'GPT-4o (OpenAI)',    icon: '🟢' },
]

const SEV_ACTIVE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.18)',   color: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
  high:     { bg: 'rgba(249,115,22,0.15)',  color: '#fdba74', border: 'rgba(249,115,22,0.35)' },
  medium:   { bg: 'rgba(234,179,8,0.15)',   color: '#fde047', border: 'rgba(234,179,8,0.35)' },
  low:      { bg: 'rgba(96,165,250,0.15)',  color: '#93c5fd', border: 'rgba(96,165,250,0.35)' },
  info:     { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.2)' },
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,.4)',
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
    cvss_vector: '',
    cwe_id: '',
    description: '',
    impact: '',
    recommendation: '',
    evidence: '',
    affected_components: '',
    status: 'open',
  })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [providerOpen, setProviderOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Template picker state
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateCat, setTemplateCat] = useState('all')

  const filteredTemplates = FINDING_TEMPLATES.filter(t => {
    const matchCat = templateCat === 'all' || t.tags.includes(templateCat)
    const q = templateSearch.toLowerCase()
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q))
    return matchCat && matchQ
  })

  function applyTemplate(templateId: string) {
    const t = FINDING_TEMPLATES.find(x => x.id === templateId)
    if (!t) return
    setForm(f => ({
      ...f,
      title:          t.title,
      severity:       t.severity,
      category:       t.category,
      cwe_id:         t.cwe_id ?? '',
      description:    t.description,
      impact:         t.impact,
      recommendation: t.recommendation,
    }))
    setShowTemplates(false)
    setTemplateSearch('')
    setTemplateCat('all')
  }

  async function handleAIGenerate() {
    if (!form.title) { alert('Ingresá el título del hallazgo primero'); return }
    setGenerating(true)
    setAiStatus('idle')
    try {
      const res = await fetch('/api/ai/generate-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          severity: form.severity,
          category: form.category,
          provider: aiProvider,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error ?? 'Error en API'
        if (res.status === 503) {
          alert(`API key no configurada: ${msg}\n\nAgregá la variable de entorno en Vercel → Settings → Environment Variables`)
        } else {
          alert('Error al generar con IA: ' + msg)
        }
        setAiStatus('error')
        return
      }
      setForm(f => ({
        ...f,
        description:    data.description    ?? f.description,
        impact:         data.impact         ?? f.impact,
        recommendation: data.recommendation ?? f.recommendation,
      }))
      setAiStatus('success')
    } catch {
      alert('Error de red al contactar la API de IA.')
      setAiStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
    if (!tenantId) {
      alert('Error de sesión. Recargá la página.')
      setSaving(false)
      return
    }

    const payload = {
      ...form,
      project_id: params.id,
      tenant_id: tenantId,
      cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null,
      cvss_vector: form.cvss_vector || null,
      cwe_id: form.cwe_id || null,
      affected_components: form.affected_components
        ? form.affected_components.split('\n').filter(Boolean)
        : [],
    }
    const { data, error } = await supabase.from('findings').insert(payload).select('id').single()
    if (!error && data) {
      router.push(`/projects/${params.id}`)
    } else {
      alert('Error: ' + error?.message)
      setSaving(false)
    }
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === aiProvider)!

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .nf-wrap { padding: 24px 28px; max-width: 740px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .nf-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color 0.12s; }
        .nf-back:hover { color: rgba(255,255,255,0.8); }
        .nf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
        .nf-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }

        /* Button row */
        .btn-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        /* Template button */
        .btn-template { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; transition: all 0.14s; white-space: nowrap; }
        .btn-template:hover { background: rgba(16,185,129,0.22); }

        /* AI button group */
        .ai-group { display: flex; align-items: center; gap: 0; }
        .btn-ai { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; background: rgba(124,58,237,0.22); border: 1px solid rgba(167,139,250,0.32); border-right: none; color: #c084fc; font-size: 13px; font-weight: 600; border-radius: 9px 0 0 9px; cursor: pointer; font-family: inherit; transition: all 0.14s; white-space: nowrap; }
        .btn-ai:hover:not(:disabled) { background: rgba(124,58,237,0.38); }
        .btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ai.success { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.35); color: #86efac; }
        .btn-ai.error { background: rgba(239,68,68,0.13); border-color: rgba(239,68,68,0.3); color: #fca5a5; }
        .provider-btn { display: inline-flex; align-items: center; gap: 4px; padding: 9px 10px; background: rgba(124,58,237,0.15); border: 1px solid rgba(167,139,250,0.32); color: rgba(167,139,250,0.8); font-size: 12px; font-weight: 600; border-radius: 0 9px 9px 0; cursor: pointer; font-family: inherit; transition: all 0.14s; position: relative; }
        .provider-btn:hover { background: rgba(124,58,237,0.28); }
        .provider-dropdown { position: absolute; top: calc(100% + 5px); right: 0; min-width: 180px; background: #131f35; border: 1px solid rgba(167,139,250,0.25); border-radius: 9px; padding: 5px; z-index: 50; animation: fadeIn 0.12s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .provider-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.75); transition: background 0.1s; }
        .provider-opt:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .provider-opt.active { background: rgba(124,58,237,0.2); color: #c084fc; }

        /* Fields */
        .nf-field { margin-bottom: 16px; }
        .nf-label { display: block; font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.42); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 7px; }
        .nf-input { width: 100%; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.12s; }
        .nf-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .nf-input option { background: #131f35; }
        .nf-textarea { width: 100%; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; resize: vertical; transition: border-color 0.12s; }
        .nf-textarea:focus { border-color: rgba(59,130,246,0.5); }
        .nf-textarea.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
        .nf-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .nf-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .sev-btn { width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.42); cursor: pointer; font-family: inherit; text-align: left; transition: all 0.12s; margin-bottom: 5px; }
        .sev-btn:last-child { margin-bottom: 0; }
        .sev-btn:not(.active):hover { background: rgba(255,255,255,0.07); }
        .ai-section { background: rgba(124,58,237,0.06); border: 1px solid rgba(167,139,250,0.15); border-radius: 11px; padding: 16px; margin-bottom: 16px; }
        .ai-section-label { font-size: 11px; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 14px; display: flex; align-items: center; gap: 7px; }
        .ai-hint { font-size: 11.5px; color: rgba(167,139,250,0.55); margin-left: auto; font-weight: 400; text-transform: none; letter-spacing: 0; }
        .section-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 18px 0; }
        .nf-footer { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 11px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .btn-submit { flex: 2; padding: 11px; border-radius: 9px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-submit:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        .field-hint { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 4px; }

        /* Template modal overlay */
        .tm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px 16px; backdrop-filter: blur(4px); }
        .tm-modal { background: #0d1829; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 100%; max-width: 680px; max-height: calc(100vh - 80px); display: flex; flex-direction: column; animation: slideUp 0.18s ease; box-shadow: 0 24px 60px rgba(0,0,0,0.6); overflow: hidden; }
        .tm-header { padding: 18px 20px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .tm-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0; flex: 1; }
        .tm-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; border-radius: 6px; transition: color 0.12s; display: flex; }
        .tm-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.07); }
        .tm-search-row { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
        .tm-search { flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 8px 12px 8px 34px; font-size: 13px; color: #fff; font-family: inherit; outline: none; transition: border-color 0.12s; }
        .tm-search:focus { border-color: rgba(59,130,246,0.5); }
        .tm-search::placeholder { color: rgba(255,255,255,0.3); }
        .tm-search-wrap { position: relative; flex: 1; }
        .tm-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); pointer-events: none; }
        .tm-cats { display: flex; gap: 6px; overflow-x: auto; padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
        .tm-cats::-webkit-scrollbar { height: 3px; }
        .tm-cats::-webkit-scrollbar-track { background: transparent; }
        .tm-cats::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .tm-cat { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); cursor: pointer; white-space: nowrap; transition: all 0.12s; }
        .tm-cat:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .tm-cat.active { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
        .tm-list { overflow-y: auto; padding: 10px; flex: 1; }
        .tm-item { padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); margin-bottom: 6px; cursor: pointer; transition: all 0.12s; }
        .tm-item:last-child { margin-bottom: 0; }
        .tm-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); }
        .tm-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap; }
        .tm-item-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); flex: 1; min-width: 0; }
        .tm-sev { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
        .tm-cwe { font-size: 10.5px; color: rgba(255,255,255,0.3); font-family: 'SF Mono', monospace; }
        .tm-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .tm-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
        .tm-tag { font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }
        .tm-empty { padding: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }
        .tm-count { font-size: 11.5px; color: rgba(255,255,255,0.3); padding: 8px 20px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
      `}</style>

      {/* Template picker modal */}
      {showTemplates && (
        <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) setShowTemplates(false) }}>
          <div className="tm-modal">
            <div className="tm-header">
              <BookOpen size={16} color="#34d399" />
              <h2 className="tm-title">Biblioteca de vulnerabilidades</h2>
              <button className="tm-close" onClick={() => setShowTemplates(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tm-search-row">
              <div className="tm-search-wrap">
                <Search size={14} className="tm-search-icon" />
                <input
                  autoFocus
                  className="tm-search"
                  placeholder="Buscar por nombre o tag (ej: SQLi, XSS, OWASP…)"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="tm-cats">
              {TEMPLATE_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={`tm-cat${templateCat === c.value ? ' active' : ''}`}
                  onClick={() => setTemplateCat(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="tm-list">
              {filteredTemplates.length === 0 ? (
                <div className="tm-empty">No se encontraron templates con esa búsqueda.</div>
              ) : (
                filteredTemplates.map(t => {
                  const sevColor = SEV_COLORS[t.severity] ?? '#fff'
                  return (
                    <div key={t.id} className="tm-item" onClick={() => applyTemplate(t.id)}>
                      <div className="tm-item-top">
                        <span className="tm-item-title">{t.title}</span>
                        <span
                          className="tm-sev"
                          style={{ background: `${sevColor}22`, color: sevColor }}
                        >
                          {t.severity.charAt(0).toUpperCase() + t.severity.slice(1)}
                        </span>
                        {t.cwe_id && <span className="tm-cwe">{t.cwe_id}</span>}
                      </div>
                      <p className="tm-desc">{t.description}</p>
                      <div className="tm-tags">
                        {t.tags.map(tag => (
                          <span key={tag} className="tm-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="tm-count">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} · Click para aplicar al formulario
            </div>
          </div>
        </div>
      )}

      <div className="nf-wrap">
        <Link href={`/projects/${params.id}`} className="nf-back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <div className="nf-header">
          <h1 className="nf-title">Nuevo hallazgo</h1>

          <div className="btn-row">
            {/* Template picker */}
            <button type="button" className="btn-template" onClick={() => setShowTemplates(true)}>
              <BookOpen size={13} />
              Usar template
            </button>

            {/* AI button + provider selector */}
            <div className="ai-group">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={generating}
                className={`btn-ai${aiStatus === 'success' ? ' success' : aiStatus === 'error' ? ' error' : ''}`}
              >
                {generating
                  ? <Loader2 size={13} className="spin" />
                  : <Sparkles size={13} />}
                {generating ? 'Generando…' : aiStatus === 'success' ? '✓ Generado' : 'Generar con IA'}
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="provider-btn"
                  onClick={() => setProviderOpen(o => !o)}
                >
                  {selectedProvider.icon}
                  <ChevronDown size={11} />
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
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Título */}
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

            {/* Categoría + IDs */}
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
                <label className="nf-label">CWE ID</label>
                <input value={form.cwe_id} onChange={e => setForm(f => ({ ...f, cwe_id: e.target.value }))} placeholder="CWE-89" className="nf-input" />
              </div>
            </div>
          </div>

          {/* CVSS */}
          <div className="nf-3col">
            <div className="nf-field" style={{ marginBottom: 0 }}>
              <label className="nf-label">CVSS Score</label>
              <input type="number" step="0.1" min="0" max="10" value={form.cvss_score} onChange={e => setForm(f => ({ ...f, cvss_score: e.target.value }))} placeholder="0.0–10.0" className="nf-input" />
            </div>
            <div className="nf-field" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label className="nf-label">CVSS Vector</label>
              <input value={form.cvss_vector} onChange={e => setForm(f => ({ ...f, cvss_vector: e.target.value }))} placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" className="nf-input" />
            </div>
          </div>

          {/* CVSS Calculator */}
          <div className="nf-field" style={{ marginBottom: 16 }}>
            <CvssCalculator
              initialVector={form.cvss_vector || undefined}
              onApply={(score, vector) => {
                setForm(f => ({ ...f, cvss_score: score.toFixed(1), cvss_vector: vector }))
              }}
            />
          </div>

          <div className="section-sep" />

          {/* AI-generated content */}
          <div className="ai-section">
            <p className="ai-section-label">
              <Sparkles size={12} />
              Contenido técnico
              <span className="ai-hint">Generado con IA o desde template · editable</span>
            </p>
            <div className="nf-field">
              <label className="nf-label">Descripción</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción técnica detallada del hallazgo…" className="nf-textarea" />
            </div>
            <div className="nf-field">
              <label className="nf-label">Impacto</label>
              <textarea rows={3} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} placeholder="Impacto potencial para el negocio y los sistemas…" className="nf-textarea" />
            </div>
            <div className="nf-field" style={{ marginBottom: 0 }}>
              <label className="nf-label">Recomendación</label>
              <textarea rows={3} value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} placeholder="Pasos concretos para remediar la vulnerabilidad…" className="nf-textarea" />
            </div>
          </div>

          {/* Evidencia */}
          <div className="nf-field">
            <label className="nf-label">Evidencia / POC</label>
            <textarea rows={3} value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="URLs, comandos, capturas de pantalla…" className="nf-textarea mono" />
          </div>

          {/* Componentes */}
          <div className="nf-field">
            <label className="nf-label">Componentes afectados</label>
            <textarea rows={2} value={form.affected_components} onChange={e => setForm(f => ({ ...f, affected_components: e.target.value }))} placeholder={"https://app.ejemplo.com/api/login\n192.168.1.10"} className="nf-textarea mono" />
            <p className="field-hint">Uno por línea</p>
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
