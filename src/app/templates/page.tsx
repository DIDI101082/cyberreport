'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Search, ArrowRight, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { FINDING_TEMPLATES, TEMPLATE_CATEGORIES, type FindingTemplate } from '@/lib/templates/findings'

const SEV_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
  high:     { color: '#fdba74', bg: 'rgba(249,115,22,0.13)' },
  medium:   { color: '#fde047', bg: 'rgba(234,179,8,0.13)' },
  low:      { color: '#93c5fd', bg: 'rgba(96,165,250,0.13)' },
  info:     { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' },
}

function TemplateCard({ t }: { t: FindingTemplate }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEV_COLORS[t.severity] ?? SEV_COLORS.info

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
    >
      {/* Header */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
              background: sev.bg, color: sev.color,
            }}>
              {t.severity.charAt(0).toUpperCase() + t.severity.slice(1)}
            </span>
            {t.cwe_id && (
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                {t.cwe_id}
              </span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
            {t.title}
          </h3>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, flexShrink: 0,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Tags */}
      <div style={{ padding: '0 18px 14px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {t.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 10.5, padding: '2px 7px', borderRadius: 4,
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)' }}>Descripción</p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{t.description}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(239,68,68,0.6)' }}>Impacto</p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{t.impact}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(74,222,128,0.6)' }}>Recomendación</p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{t.recommendation}</p>
          </div>
          <div style={{ paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
              Usá este template desde el formulario de nuevo hallazgo
            </span>
            <ArrowRight size={12} color="rgba(255,255,255,0.25)" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = FINDING_TEMPLATES.filter(t => {
    const matchCat = category === 'all' || t.tags.includes(category)
    const q = search.toLowerCase()
    const matchQ = !q ||
      t.title.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q)
    return matchCat && matchQ
  })

  const countBySev = {
    critical: FINDING_TEMPLATES.filter(t => t.severity === 'critical').length,
    high:     FINDING_TEMPLATES.filter(t => t.severity === 'high').length,
    medium:   FINDING_TEMPLATES.filter(t => t.severity === 'medium').length,
    low:      FINDING_TEMPLATES.filter(t => t.severity === 'low').length,
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .tpl-page { padding: 28px 32px; max-width: 900px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .tpl-header { margin-bottom: 24px; }
        .tpl-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; display: flex; align-items: center; gap: 10px; }
        .tpl-subtitle { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
        .tpl-stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0; }
        .tpl-stat { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 9px; border: 1px solid; font-size: 12.5px; font-weight: 700; }
        .tpl-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
        .tpl-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .tpl-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); pointer-events: none; }
        .tpl-search { width: 100%; padding: 9px 12px 9px 34px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: #fff; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.12s; }
        .tpl-search:focus { border-color: rgba(59,130,246,0.5); }
        .tpl-search::placeholder { color: rgba(255,255,255,0.28); }
        .tpl-cats { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .tpl-cats::-webkit-scrollbar { height: 3px; }
        .tpl-cats::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .tpl-cat { font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); cursor: pointer; white-space: nowrap; transition: all 0.12s; font-family: inherit; }
        .tpl-cat:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .tpl-cat.active { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
        .tpl-grid { display: flex; flex-direction: column; gap: 10px; animation: fadeIn 0.18s ease; }
        .tpl-count { font-size: 12px; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
        .tpl-empty { text-align: center; padding: 48px; color: rgba(255,255,255,0.3); font-size: 13px; }
        .tpl-hint { margin-top: 28px; display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15); border-radius: 10px; font-size: 12.5px; color: rgba(255,255,255,0.45); }
      `}</style>

      <div className="tpl-page">
        {/* Header */}
        <div className="tpl-header">
          <h1 className="tpl-title">
            <BookOpen size={20} color="#34d399" />
            Biblioteca de vulnerabilidades
          </h1>
          <p className="tpl-subtitle">
            {FINDING_TEMPLATES.length} templates listos para usar · OWASP Top 10 + Infraestructura
          </p>
        </div>

        {/* Stats */}
        <div className="tpl-stats">
          {[
            { label: 'Crítico', count: countBySev.critical, color: '#fca5a5', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)' },
            { label: 'Alto',    count: countBySev.high,     color: '#fdba74', bg: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.25)' },
            { label: 'Medio',   count: countBySev.medium,   color: '#fde047', bg: 'rgba(234,179,8,0.13)',  border: 'rgba(234,179,8,0.25)' },
            { label: 'Bajo',    count: countBySev.low,      color: '#93c5fd', bg: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.25)' },
          ].map(s => (
            <div key={s.label} className="tpl-stat" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
              <Shield size={13} />
              {s.count} {s.label}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="tpl-controls">
          <div className="tpl-search-wrap">
            <Search size={14} className="tpl-search-icon" />
            <input
              type="text"
              className="tpl-search"
              placeholder="Buscar por nombre, tag o descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="tpl-cats" style={{ marginBottom: 20 }}>
          {TEMPLATE_CATEGORIES.map(c => (
            <button
              key={c.value}
              className={`tpl-cat${category === c.value ? ' active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="tpl-count">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
          {search || category !== 'all' ? ' encontrados' : ' disponibles'}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="tpl-empty">No hay templates que coincidan con tu búsqueda.</div>
        ) : (
          <div className="tpl-grid">
            {filtered.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        )}

        {/* Hint */}
        <div className="tpl-hint">
          <BookOpen size={15} color="#34d399" style={{ flexShrink: 0 }} />
          <span>
            Para usar un template, abrí un proyecto y hacé clic en{' '}
            <strong style={{ color: '#34d399' }}>Nuevo hallazgo → Usar template</strong>.
            Los campos de descripción, impacto y recomendación se pre-completan automáticamente.
          </span>
        </div>
      </div>
    </>
  )
}
