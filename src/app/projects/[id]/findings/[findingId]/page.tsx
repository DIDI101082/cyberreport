'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2, Clock,
  ExternalLink, Copy, ChevronDown, ChevronUp, Edit2, Save, X,
  FileText, Target, Zap, Lock,
} from 'lucide-react'
import { getAutoControls } from '@/lib/compliance/frameworks'

// ── Types ────────────────────────────────────────────────────────────────────
interface Finding {
  id: string
  title: string
  severity: string
  status: string
  category: string | null
  cvss_score: number | null
  cvss_vector: string | null
  cve_id: string | null
  cwe_id: string | null
  description: string | null
  impact: string | null
  recommendation: string | null
  evidence: string | null
  affected_components: string | null
  created_at: string
  updated_at: string | null
  project_id: string
}

interface Project {
  id: string
  name: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SEV_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Crítico',  color: '#fca5a5', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)' },
  high:     { label: 'Alto',     color: '#fdba74', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)' },
  medium:   { label: 'Medio',    color: '#fde047', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)' },
  low:      { label: 'Bajo',     color: '#93c5fd', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)' },
  info:     { label: 'Info',     color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:           { label: 'Abierto',         color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: <AlertTriangle size={12} /> },
  in_review:      { label: 'En revisión',     color: '#facc15', bg: 'rgba(250,204,21,0.12)',  icon: <Clock size={12} /> },
  resolved:       { label: 'Resuelto',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: <CheckCircle2 size={12} /> },
  accepted:       { label: 'Aceptado',        color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', icon: <Shield size={12} /> },
  false_positive: { label: 'Falso positivo',  color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', icon: <X size={12} /> },
}

const CAT_LABELS: Record<string, string> = {
  web: 'Web (OWASP)', infrastructure: 'Infraestructura', network: 'Red',
  social: 'Ingeniería Social', physical: 'Físico', other: 'Otro',
}

const FW_COLORS: Record<string, string> = {
  iso27001: '#60a5fa',
  pci_dss:  '#f97316',
  nist_csf: '#a78bfa',
}

const FW_NAMES: Record<string, string> = {
  iso27001: 'ISO 27001',
  pci_dss:  'PCI DSS',
  nist_csf: 'NIST CSF',
}

function cvssColor(score: number | null): string {
  if (score == null) return 'rgba(255,255,255,0.3)'
  if (score >= 9)   return '#ef4444'
  if (score >= 7)   return '#f97316'
  if (score >= 4)   return '#eab308'
  return '#60a5fa'
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FindingDetailPage() {
  const params = useParams<{ id: string; findingId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [finding, setFinding] = useState<Finding | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    description: true, evidence: true, remediation: true, compliance: true,
  })

  const load = useCallback(async () => {
    const [projRes, findRes] = await Promise.all([
      supabase.from('projects').select('id, name').eq('id', params.id).single(),
      supabase.from('findings').select('*').eq('id', params.findingId).single(),
    ])
    setProject(projRes.data as Project)
    setFinding(findRes.data as Finding)
    setLoading(false)
  }, [params.id, params.findingId])

  useEffect(() => { load() }, [load])

  async function updateStatus(newStatus: string) {
    if (!finding) return
    setSaving(true)
    const { error } = await supabase
      .from('findings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', finding.id)
    if (!error) {
      setFinding(f => f ? { ...f, status: newStatus } : f)
    }
    setSaving(false)
    setEditingStatus(false)
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  function toggleSection(key: string) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  }

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
      Cargando hallazgo…
    </div>
  )

  if (!finding) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>
      Hallazgo no encontrado.{' '}
      <Link href={`/projects/${params.id}/findings`} style={{ color: '#60a5fa' }}>Volver a hallazgos</Link>
    </div>
  )

  const sev     = SEV_CONFIG[finding.severity]    ?? SEV_CONFIG.info
  const status  = STATUS_CONFIG[finding.status]   ?? STATUS_CONFIG.open
  const controls = getAutoControls(finding.cwe_id, finding.category ?? 'other')

  // Group controls by framework
  const byFw = controls.reduce<Record<string, typeof controls>>((acc, c) => {
    if (!acc[c.framework]) acc[c.framework] = []
    acc[c.framework].push(c)
    return acc
  }, {})

  const affectedList = finding.affected_components
    ? finding.affected_components.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  const evidenceList = finding.evidence
    ? finding.evidence.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .fd-wrap { padding: 24px 28px; max-width: 860px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }

        /* Nav */
        .fd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color .12s; }
        .fd-back:hover { color: rgba(255,255,255,.75); }
        .fd-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,.3); margin-bottom: 20px; flex-wrap: wrap; }
        .fd-breadcrumb a { color: rgba(255,255,255,.4); text-decoration: none; }
        .fd-breadcrumb a:hover { color: rgba(255,255,255,.7); }
        .fd-breadcrumb .sep { color: rgba(255,255,255,.15); }

        /* Header */
        .fd-header { margin-bottom: 24px; }
        .fd-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .sev-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .12s; }
        .status-badge:hover { opacity: .8; }
        .cat-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; background: rgba(255,255,255,.07); color: rgba(255,255,255,.45); }
        .fd-title { font-size: 22px; font-weight: 800; margin: 0 0 8px; line-height: 1.3; }
        .fd-meta { display: flex; gap: 14px; flex-wrap: wrap; }
        .fd-meta-item { font-size: 11.5px; color: rgba(255,255,255,.35); display: flex; align-items: center; gap: 4px; }

        /* Status dropdown */
        .status-dropdown { position: relative; display: inline-block; }
        .status-menu { position: absolute; top: calc(100% + 6px); left: 0; background: #0f1c30; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 5px; z-index: 50; min-width: 170px; box-shadow: 0 8px 32px rgba(0,0,0,.5); }
        .status-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px; font-size: 12px; cursor: pointer; transition: background .1s; color: rgba(255,255,255,.75); }
        .status-opt:hover { background: rgba(255,255,255,.06); }
        .status-opt.active { background: rgba(255,255,255,.05); font-weight: 600; }

        /* Score row */
        .fd-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .score-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 14px 16px; }
        .score-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin-bottom: 6px; }
        .score-value { font-size: 20px; font-weight: 800; font-family: monospace; }
        .score-sub { font-size: 10px; color: rgba(255,255,255,.25); margin-top: 2px; word-break: break-all; }

        /* Sections */
        .fd-section { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; margin-bottom: 14px; overflow: hidden; }
        .fd-section-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; transition: background .1s; }
        .fd-section-hdr:hover { background: rgba(255,255,255,.02); }
        .fd-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,.85); }
        .fd-section-body { padding: 0 18px 18px; }
        .fd-text { font-size: 13.5px; color: rgba(255,255,255,.7); line-height: 1.7; white-space: pre-wrap; }
        .fd-divider { height: 1px; background: rgba(255,255,255,.06); margin: 0; }

        /* Evidence list */
        .evidence-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,.04); border-radius: 8px; margin-bottom: 6px; font-size: 12.5px; font-family: monospace; color: rgba(255,255,255,.65); word-break: break-all; }
        .evidence-copy { background: none; border: none; color: rgba(255,255,255,.25); cursor: pointer; padding: 0; transition: color .1s; flex-shrink: 0; margin-left: auto; }
        .evidence-copy:hover { color: rgba(255,255,255,.6); }
        .evidence-copy.ok { color: #4ade80; }

        /* Affected components */
        .affected-item { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 6px; font-size: 12px; font-family: monospace; color: rgba(255,255,255,.6); margin: 0 5px 5px 0; }

        /* Identifiers */
        .id-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .id-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 7px; font-size: 12px; font-family: monospace; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: rgba(255,255,255,.7); }
        .id-chip a { color: #60a5fa; text-decoration: none; }
        .id-chip a:hover { color: #93c5fd; }

        /* Compliance controls */
        .fw-block { margin-bottom: 14px; }
        .fw-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .ctrl-item { display: flex; gap: 12px; padding: 10px 12px; background: rgba(255,255,255,.03); border-radius: 9px; margin-bottom: 6px; border-left: 3px solid; }
        .ctrl-id { font-size: 11px; font-weight: 700; font-family: monospace; white-space: nowrap; min-width: 56px; }
        .ctrl-info { flex: 1; }
        .ctrl-title { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.8); margin-bottom: 2px; }
        .ctrl-desc { font-size: 11.5px; color: rgba(255,255,255,.4); line-height: 1.5; }
        .no-controls { font-size: 12.5px; color: rgba(255,255,255,.3); padding: 12px 0; }

        /* Actions */
        .fd-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .btn-action { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; text-decoration: none; transition: all .12s; }
        .btn-edit { background: rgba(255,255,255,.07); color: rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.1); }
        .btn-edit:hover { background: rgba(255,255,255,.1); }
        .btn-compliance { background: rgba(96,165,250,.12); color: #93c5fd; border: 1px solid rgba(96,165,250,.25); }
        .btn-compliance:hover { background: rgba(96,165,250,.18); }

        /* Empty state */
        .fd-empty-section { font-size: 12.5px; color: rgba(255,255,255,.25); font-style: italic; padding: 4px 0; }

        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="fd-wrap">
        {/* Breadcrumb */}
        <nav className="fd-breadcrumb">
          <Link href={`/projects/${params.id}`}>{project?.name ?? 'Proyecto'}</Link>
          <span className="sep">/</span>
          <Link href={`/projects/${params.id}/findings`}>Hallazgos</Link>
          <span className="sep">/</span>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>{finding.title}</span>
        </nav>

        {/* Header */}
        <div className="fd-header">
          <div className="fd-badges">
            {/* Severity */}
            <span className="sev-badge" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
              <AlertTriangle size={11} /> {sev.label}
            </span>

            {/* Status (clickable dropdown) */}
            <div className="status-dropdown">
              <button
                className="status-badge"
                style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}33` }}
                onClick={() => setEditingStatus(v => !v)}
              >
                {status.icon} {status.label} <ChevronDown size={11} />
              </button>
              {editingStatus && (
                <div className="status-menu">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div
                      key={key}
                      className={`status-opt${finding.status === key ? ' active' : ''}`}
                      onClick={() => updateStatus(key)}
                    >
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      {cfg.label}
                      {saving && finding.status !== key && <span style={{ fontSize: 10, opacity: .4 }}>…</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {finding.category && (
              <span className="cat-badge">{CAT_LABELS[finding.category] ?? finding.category}</span>
            )}
          </div>

          <h1 className="fd-title">{finding.title}</h1>

          <div className="fd-meta">
            <span className="fd-meta-item">
              <Clock size={11} />
              Creado {new Date(finding.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {finding.updated_at && (
              <span className="fd-meta-item">
                <Save size={11} />
                Actualizado {new Date(finding.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Score row */}
        <div className="fd-scores">
          {/* CVSS Score */}
          <div className="score-card">
            <div className="score-label">CVSS Score</div>
            <div className="score-value" style={{ color: cvssColor(finding.cvss_score) }}>
              {finding.cvss_score != null ? finding.cvss_score.toFixed(1) : '—'}
            </div>
            {finding.cvss_vector && (
              <div className="score-sub">{finding.cvss_vector}</div>
            )}
          </div>

          {/* CVE */}
          {finding.cve_id && (
            <div className="score-card">
              <div className="score-label">CVE</div>
              <div className="score-value" style={{ fontSize: 14, color: '#93c5fd' }}>{finding.cve_id}</div>
              <div className="score-sub">
                <a href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  NVD <ExternalLink size={9} />
                </a>
              </div>
            </div>
          )}

          {/* CWE */}
          {finding.cwe_id && (
            <div className="score-card">
              <div className="score-label">CWE</div>
              <div className="score-value" style={{ fontSize: 14, color: '#c084fc' }}>{finding.cwe_id}</div>
              <div className="score-sub">
                <a href={`https://cwe.mitre.org/data/definitions/${finding.cwe_id.replace(/\D/g,'')}.html`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  MITRE <ExternalLink size={9} />
                </a>
              </div>
            </div>
          )}

          {/* Controls count */}
          <div className="score-card">
            <div className="score-label">Controles</div>
            <div className="score-value" style={{ color: controls.length > 0 ? '#4ade80' : 'rgba(255,255,255,.3)' }}>
              {controls.length}
            </div>
            <div className="score-sub">{controls.length > 0 ? 'marcos normativos' : 'sin mapeo'}</div>
          </div>
        </div>

        {/* Affected components */}
        {affectedList.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(255,255,255,.3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={11} /> Componentes afectados
            </div>
            <div>
              {affectedList.map((comp, i) => (
                <span key={i} className="affected-item">
                  <Target size={10} style={{ opacity: .4 }} /> {comp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section: Descripción técnica */}
        <div className="fd-section">
          <div className="fd-section-hdr" onClick={() => toggleSection('description')}>
            <div className="fd-section-title">
              <FileText size={14} color="rgba(255,255,255,.5)" /> Descripción técnica e impacto
            </div>
            {expandedSections.description ? <ChevronUp size={14} color="rgba(255,255,255,.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,.3)" />}
          </div>
          {expandedSections.description && (
            <div className="fd-section-body">
              {finding.description ? (
                <p className="fd-text">{finding.description}</p>
              ) : (
                <p className="fd-empty-section">Sin descripción técnica registrada.</p>
              )}
              {finding.impact && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '14px 0' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(255,255,255,.3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={11} /> Impacto
                  </div>
                  <p className="fd-text">{finding.impact}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Section: Evidencia */}
        <div className="fd-section">
          <div className="fd-section-hdr" onClick={() => toggleSection('evidence')}>
            <div className="fd-section-title">
              <Shield size={14} color="rgba(255,255,255,.5)" /> Evidencia
            </div>
            {expandedSections.evidence ? <ChevronUp size={14} color="rgba(255,255,255,.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,.3)" />}
          </div>
          {expandedSections.evidence && (
            <div className="fd-section-body">
              {evidenceList.length === 0 ? (
                <p className="fd-empty-section">Sin evidencia registrada.</p>
              ) : (
                evidenceList.map((ev, i) => (
                  <div key={i} className="evidence-item">
                    <span style={{ flex: 1 }}>{ev}</span>
                    <button
                      className={`evidence-copy${copied === `ev-${i}` ? ' ok' : ''}`}
                      onClick={() => copyToClipboard(ev, `ev-${i}`)}
                      title="Copiar"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Section: Remediación */}
        <div className="fd-section">
          <div className="fd-section-hdr" onClick={() => toggleSection('remediation')}>
            <div className="fd-section-title">
              <CheckCircle2 size={14} color="rgba(255,255,255,.5)" /> Remediación recomendada
            </div>
            {expandedSections.remediation ? <ChevronUp size={14} color="rgba(255,255,255,.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,.3)" />}
          </div>
          {expandedSections.remediation && (
            <div className="fd-section-body">
              {finding.recommendation ? (
                <p className="fd-text">{finding.recommendation}</p>
              ) : (
                <p className="fd-empty-section">Sin recomendación registrada.</p>
              )}
            </div>
          )}
        </div>

        {/* Section: Controles de cumplimiento */}
        <div className="fd-section">
          <div className="fd-section-hdr" onClick={() => toggleSection('compliance')}>
            <div className="fd-section-title">
              <Lock size={14} color="rgba(255,255,255,.5)" /> Controles normativos mapeados
              {controls.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'rgba(96,165,250,.15)', color: '#93c5fd' }}>
                  {controls.length}
                </span>
              )}
            </div>
            {expandedSections.compliance ? <ChevronUp size={14} color="rgba(255,255,255,.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,.3)" />}
          </div>
          {expandedSections.compliance && (
            <div className="fd-section-body">
              {controls.length === 0 ? (
                <p className="no-controls">No se encontraron controles mapeados para este hallazgo. Asegurate de que tenga un CWE o categoría asignada.</p>
              ) : (
                Object.entries(byFw).map(([fw, ctrls]) => (
                  <div key={fw} className="fw-block">
                    <div className="fw-label" style={{ color: FW_COLORS[fw] ?? '#60a5fa' }}>
                      {FW_NAMES[fw] ?? fw} — {ctrls.length} control{ctrls.length !== 1 ? 'es' : ''}
                    </div>
                    {ctrls.map(({ control }) => (
                      <div
                        key={control.id}
                        className="ctrl-item"
                        style={{ borderLeftColor: FW_COLORS[fw] ?? '#60a5fa' }}
                      >
                        <div className="ctrl-id" style={{ color: FW_COLORS[fw] ?? '#60a5fa' }}>{control.id}</div>
                        <div className="ctrl-info">
                          <div className="ctrl-title">{control.title}</div>
                          <div className="ctrl-desc">{control.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}

              {controls.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Link
                    href={`/projects/${params.id}/compliance`}
                    className="btn-action btn-compliance"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Lock size={12} /> Ver módulo de Cumplimiento
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="fd-actions">
          <Link
            href={`/projects/${params.id}/findings/${params.findingId}/edit`}
            className="btn-action btn-edit"
          >
            <Edit2 size={13} /> Editar hallazgo
          </Link>
          <Link href={`/projects/${params.id}/findings`} className="btn-action btn-edit">
            <ArrowLeft size={13} /> Volver a hallazgos
          </Link>
        </div>
      </div>
    </>
  )
}
