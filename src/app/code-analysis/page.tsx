'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Code2, Upload, Sparkles, Shield, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Copy, Loader2, FileCode, X, Info
} from 'lucide-react'
import type { AnalysisSession, CodeIssue, IssueSeverity } from '@/types/code-analysis'
import { getGradeColor, getGradeBg, getScoreLabel } from '@/lib/code-analysis/scorer'
import { SEVERITY_CONFIG } from '@/lib/utils/severity'

const CATEGORY_LABELS: Record<string, string> = {
  injection: 'Inyección', xss: 'XSS', auth: 'Autenticación', secrets: 'Secretos',
  crypto: 'Criptografía', path_traversal: 'Path Traversal', deserialization: 'Deserialización',
  dependency: 'Dependencias', access_control: 'Control de Acceso', logging: 'Logging',
  ssrf: 'SSRF', xxe: 'XXE', compliance: 'Compliance', best_practice: 'Buenas Prácticas',
}

const FRAMEWORKS = ['OWASP', 'ISO27001', 'PCI-DSS', 'NIST', 'CWE']

export default function CodeAnalysisPage() {
  const [files, setFiles] = useState<{ path: string; content: string }[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [session, setSession] = useState<AnalysisSession | null>(null)
  const [summary, setSummary] = useState('')
  const [positives, setPositives] = useState<string[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['OWASP', 'ISO27001', 'PCI-DSS'])
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [fixLoading, setFixLoading] = useState<string | null>(null)
  interface AiFix {
    fixed_snippet?: string
    explanation?: string
    security_notes?: string[]
    test_cases?: string[]
  }
  const [fixes, setFixes] = useState<Record<string, AiFix>>({})
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const onDrop = useCallback((accepted: File[]) => {
    accepted.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const content = e.target?.result as string
        setFiles(prev => {
          if (prev.find(f => f.path === file.name)) return prev
          return [...prev, { path: file.name, content }]
        })
      }
      reader.readAsText(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.ts', '.tsx', '.js', '.jsx', '.py', '.php', '.java', '.go', '.rb', '.cs', '.cpp', '.c'],
    },
    multiple: true,
  })

  async function handleAnalyze() {
    if (!files.length) return
    setAnalyzing(true)
    setSession(null)
    setSummary('')
    setPositives([])
    setFixes({})
    setExpandedIssue(null)

    try {
      const res = await fetch('/api/code-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, frameworks: selectedFrameworks }),
      })
      const data = await res.json()
      setSession(data.session)
      setSummary(data.summary ?? '')
      setPositives(data.positive_findings ?? [])
    } catch {
      alert('Error al analizar el código')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleGetFix(issue: CodeIssue) {
    setFixLoading(issue.id)
    try {
      const fileContent = files.find(f => f.path === issue.file_path)?.content
      const res = await fetch('/api/code-analysis/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, fullCode: fileContent, filePath: issue.file_path }),
      })
      const data = await res.json()
      setFixes(prev => ({ ...prev, [issue.id]: data }))
    } catch {
      alert('Error al generar fix')
    } finally {
      setFixLoading(null)
    }
  }

  // Filtrar issues
  const allIssues = session?.issues ?? []
  const filtered = allIssues.filter(i =>
    (severityFilter === 'all' || i.severity === severityFilter) &&
    (categoryFilter === 'all' || i.category === categoryFilter)
  )

  const categories = [...new Set(allIssues.map(i => i.category))]

  return (
    <>
      <style>{`
        .ca-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .ca-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .ca-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(99,102,241,0.2); border: 1px solid rgba(129,140,248,0.2); display: flex; align-items: center; justify-content: center; }
        .ca-title { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 2px; }
        .ca-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
        .ca-grid { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
        .ca-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
        .ca-panel-body { padding: 14px; }
        .ca-section-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; }
        .ca-fw-label { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0; font-size: 13px; color: rgba(255,255,255,0.6); }
        .ca-fw-label:hover { color: rgba(255,255,255,0.9); }
        .ca-fw-label input { accent-color: #6366f1; }
        .ca-dropzone { border: 2px dashed rgba(255,255,255,0.12); border-radius: 12px; padding: 24px 16px; text-align: center; cursor: pointer; transition: all 0.15s; margin: 12px 0; }
        .ca-dropzone.active { border-color: rgba(99,102,241,0.6); background: rgba(99,102,241,0.08); }
        .ca-dropzone:hover { border-color: rgba(255,255,255,0.2); }
        .ca-file-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
        .ca-file-name { font-size: 11px; color: rgba(255,255,255,0.5); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .ca-file-rm { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.2); padding: 0; display: flex; align-items: center; }
        .ca-file-rm:hover { color: #f87171; }
        .ca-btn { width: 100%; padding: 10px; border-radius: 10px; background: rgba(99,102,241,0.85); border: 1px solid rgba(129,140,248,0.3); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; }
        .ca-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ca-btn:not(:disabled):hover { background: rgba(99,102,241,1); }
        .ca-empty { padding: 60px 20px; text-align: center; }
        .ca-empty-text { font-size: 13px; color: rgba(255,255,255,0.3); margin: 12px 0 0; }
        .ca-score-header { padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; }
        .ca-grade { font-size: 52px; font-weight: 900; line-height: 1; }
        .ca-score-num { font-size: 26px; font-weight: 700; color: #fff; }
        .ca-score-label { font-size: 12px; color: rgba(255,255,255,0.4); }
        .ca-subscores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .ca-subscore { text-align: center; }
        .ca-breakdown { display: flex; gap: 8px; padding: 12px 18px; flex-wrap: wrap; }
        .ca-sev-btn { flex: 1; padding: 8px 6px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); transition: all 0.12s; }
        .ca-sev-btn:hover { background: rgba(255,255,255,0.07); }
        .ca-positives { margin: 0 0 12px; padding: 12px 14px; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.15); border-radius: 10px; }
        .ca-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .ca-filter-btn { padding: 4px 12px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.5); cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .ca-filter-btn.active { background: rgba(99,102,241,0.3); border-color: rgba(129,140,248,0.4); color: #c7d2fe; }
        .ca-issue { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 11px; margin-bottom: 8px; overflow: hidden; }
        .ca-issue.open { border-color: rgba(99,102,241,0.35); }
        .ca-issue-btn { width: 100%; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; text-align: left; background: none; border: none; cursor: pointer; font-family: inherit; color: #fff; }
        .ca-issue-title { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); margin: 0 0 3px; }
        .ca-issue-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; font-family: monospace; }
        .ca-detail { padding: 0 14px 14px; border-top: 1px solid rgba(255,255,255,0.06); }
        .ca-code { background: rgba(0,0,0,0.5); border-radius: 9px; overflow: hidden; margin: 10px 0; }
        .ca-code-header { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: rgba(0,0,0,0.3); }
        .ca-code-name { font-size: 11px; color: rgba(255,255,255,0.35); font-family: monospace; }
        .ca-code-copy { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 0; display: flex; align-items: center; }
        .ca-code-copy:hover { color: #fff; }
        .ca-how-to { background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.15); border-radius: 9px; padding: 10px 12px; margin: 10px 0; }
        .ca-how-label { font-size: 11px; font-weight: 600; color: #60a5fa; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
        .ca-how-text { font-size: 12px; color: rgba(255,255,255,0.6); margin: 0; }
        .ca-compliance-ref { font-size: 11px; padding: 3px 8px; background: rgba(124,58,237,0.15); border: 1px solid rgba(167,139,250,0.2); border-radius: 6px; color: #c084fc; font-family: monospace; }
        .ca-fix-btn { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #818cf8; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
        .ca-fix-btn:disabled { opacity: 0.5; }
        .ca-meta-row { display: flex; gap: 16px; font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 10px; }
        .analyzing-box { background: rgba(99,102,241,0.08); border: 1px solid rgba(129,140,248,0.15); border-radius: 10px; padding: 14px; text-align: center; margin-top: 10px; }
        .bounce-dot { width: 7px; height: 7px; border-radius: 50%; background: #818cf8; display: inline-block; animation: bounce 0.8s infinite; }
      `}</style>

      <div className="ca-wrap">
        <div className="ca-header">
          <div className="ca-icon">
            <Code2 size={18} color="#818cf8" />
          </div>
          <div>
            <h1 className="ca-title">Code Security Analyzer</h1>
            <p className="ca-sub">Análisis de seguridad con IA — más proactivo que SonarQube</p>
          </div>
        </div>

        <div className="ca-grid">
          {/* Panel izquierdo */}
          <div>
            <div className="ca-panel">
              <div className="ca-panel-body">
                <p className="ca-section-label">Marcos a verificar</p>
                {FRAMEWORKS.map(fw => (
                  <label key={fw} className="ca-fw-label">
                    <input
                      type="checkbox"
                      checked={selectedFrameworks.includes(fw)}
                      onChange={() => setSelectedFrameworks(prev =>
                        prev.includes(fw) ? prev.filter(x => x !== fw) : [...prev, fw]
                      )}
                    />
                    {fw}
                  </label>
                ))}

                <div
                  {...getRootProps()}
                  className={`ca-dropzone${isDragActive ? ' active' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload size={24} color="rgba(255,255,255,0.2)" />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '8px 0 3px', fontWeight: 500 }}>
                    Arrastrá o hacé click
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                    .ts .js .py .php .java .go…
                  </p>
                </div>

                {files.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p className="ca-section-label" style={{ marginBottom: 8 }}>{files.length} archivo{files.length > 1 ? 's' : ''}</p>
                    <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                      {files.map(f => (
                        <div key={f.path} className="ca-file-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <FileCode size={11} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                            <span className="ca-file-name">{f.path}</span>
                          </div>
                          <button className="ca-file-rm" onClick={() => setFiles(p => p.filter(x => x.path !== f.path))}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleAnalyze} disabled={!files.length || analyzing} className="ca-btn">
                  {analyzing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  {analyzing ? 'Analizando…' : 'Analizar código'}
                </button>

                {analyzing && (
                  <div className="analyzing-box">
                    <p style={{ fontSize: 11, color: '#c7d2fe', margin: '0 0 8px', fontWeight: 500 }}>
                      Análisis estático → IA profunda → Fixes…
                    </p>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {[0,1,2].map(i => (
                        <div key={i} className="bounce-dot" style={{ animationDelay: `${i*0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho */}
          <div>
            {!session ? (
              <div className="ca-panel">
                <div className="ca-empty">
                  <Shield size={36} color="rgba(255,255,255,0.08)" />
                  <p className="ca-empty-text">Subí archivos de código para iniciar el análisis</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Score card */}
                <div className="ca-panel">
                  <div className="ca-score-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="ca-grade" style={{ color: getGradeColor(session.health_score.grade) }}>
                        {session.health_score.grade}
                      </span>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px', fontWeight: 600 }}>Salud del código</p>
                        <p className="ca-score-num">{session.health_score.overall}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/100</span></p>
                        <p className="ca-score-label">{getScoreLabel(session.health_score.overall)}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      <p style={{ margin: '0 0 2px' }}>{session.files_analyzed} archivos</p>
                      <p style={{ margin: '0 0 2px' }}>{session.lines_analyzed.toLocaleString()} líneas</p>
                      <p style={{ margin: 0 }}>{(session.duration_ms / 1000).toFixed(1)}s</p>
                    </div>
                  </div>

                  <div className="ca-subscores">
                    {[
                      { label: 'Seguridad', score: session.health_score.security },
                      { label: 'Compliance', score: session.health_score.compliance },
                      { label: 'Calidad', score: session.health_score.quality },
                    ].map(({ label, score }) => (
                      <div key={label} className="ca-subscore">
                        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 6px' }}>
                          <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
                            <circle
                              cx="28" cy="28" r="22"
                              stroke={score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="5" fill="none"
                              strokeDasharray={`${(score / 100) * 138.2} 138.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{score}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="ca-breakdown">
                    {(['critical','high','medium','low','info'] as IssueSeverity[]).map(s => {
                      const count = session.health_score.breakdown[s]
                      const cfg = SEVERITY_CONFIG[s]
                      const isActive = severityFilter === s
                      return (
                        <button
                          key={s}
                          onClick={() => setSeverityFilter(prev => prev === s ? 'all' : s)}
                          className="ca-sev-btn"
                          style={isActive ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : {}}
                        >
                          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: 'inherit' }}>{count}</p>
                          <p style={{ margin: 0 }}>{cfg.label}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Positivos */}
                {positives.length > 0 && (
                  <div className="ca-positives">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CheckCircle size={14} color="#4ade80" />
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', margin: 0 }}>Aspectos bien implementados</p>
                    </div>
                    {positives.map((p, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 3px' }}>• {p}</p>
                    ))}
                  </div>
                )}

                {/* Filtros categoría */}
                <div className="ca-filters">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`ca-filter-btn${categoryFilter === 'all' ? ' active' : ''}`}
                  >
                    Todas
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(prev => prev === cat ? 'all' : cat)}
                      className={`ca-filter-btn${categoryFilter === cat ? ' active' : ''}`}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>

                {/* Issues */}
                {filtered.length === 0 ? (
                  <div className="ca-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <CheckCircle size={28} color="#4ade80" />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>Sin issues con el filtro actual</p>
                  </div>
                ) : filtered.map(issue => {
                  const isOpen = expandedIssue === issue.id
                  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG]
                  const fix = fixes[issue.id]

                  return (
                    <div key={issue.id} className={`ca-issue${isOpen ? ' open' : ''}`}>
                      <button
                        className="ca-issue-btn"
                        onClick={() => setExpandedIssue(prev => prev === issue.id ? null : issue.id)}
                      >
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, flexShrink: 0, marginTop: 2, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="ca-issue-title">{issue.title}</p>
                          <p className="ca-issue-meta">
                            {issue.file_path}:{issue.line_start}
                            {issue.line_end && issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}{' · '}
                            {CATEGORY_LABELS[issue.category] ?? issue.category}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {issue.compliance_refs.slice(0, 2).map(ref => (
                            <span key={ref.id} className="ca-compliance-ref">{ref.id}</span>
                          ))}
                          {isOpen ? <ChevronDown size={14} color="rgba(255,255,255,0.3)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.3)" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="ca-detail">
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 10 }}>{issue.description}</p>

                          <div className="ca-code">
                            <div className="ca-code-header">
                              <span className="ca-code-name">{issue.file_path}</span>
                              <button className="ca-code-copy" onClick={() => navigator.clipboard.writeText(issue.code_snippet)}>
                                <Copy size={12} />
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '10px 14px', fontSize: 12, color: '#86efac', fontFamily: 'monospace', overflowX: 'auto' }}>
                              {issue.code_snippet}
                            </pre>
                          </div>

                          <div className="ca-how-to">
                            <p className="ca-how-label"><Info size={12} />Cómo corregirlo</p>
                            <p className="ca-how-text">{issue.fix_explanation}</p>
                          </div>

                          {issue.compliance_refs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                              {issue.compliance_refs.map(ref => (
                                <a key={ref.id} href={ref.url ?? '#'} target="_blank" rel="noopener noreferrer" className="ca-compliance-ref" style={{ textDecoration: 'none' }}>
                                  {ref.framework} {ref.id} — {ref.label}
                                </a>
                              ))}
                            </div>
                          )}

                          {!fix ? (
                            <button onClick={() => handleGetFix(issue)} disabled={fixLoading === issue.id} className="ca-fix-btn">
                              {fixLoading === issue.id
                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Sparkles size={13} />}
                              {fixLoading === issue.id ? 'Generando fix…' : 'Generar fix con IA'}
                            </button>
                          ) : (
                            <div>
                              <div className="ca-code" style={{ border: '1px solid rgba(74,222,128,0.2)' }}>
                                <div className="ca-code-header" style={{ background: 'rgba(74,222,128,0.1)' }}>
                                  <span style={{ fontSize: 11, color: '#4ade80', fontFamily: 'monospace', fontWeight: 600 }}>✓ Código corregido</span>
                                  <button className="ca-code-copy" onClick={() => navigator.clipboard.writeText(String(fix.fixed_snippet ?? ''))}>
                                    <Copy size={12} />
                                  </button>
                                </div>
                                <pre style={{ margin: 0, padding: '10px 14px', fontSize: 12, color: '#bbf7d0', fontFamily: 'monospace', overflowX: 'auto' }}>
                                  {String(fix.fixed_snippet ?? '')}
                                </pre>
                              </div>
                              {fix.explanation && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>{String(fix.explanation)}</p>}
                            </div>
                          )}

                          <div className="ca-meta-row">
                            <span>Confianza IA: {Math.round(issue.ai_confidence * 100)}%</span>
                            <span>Falso positivo: {Math.round(issue.false_positive_probability * 100)}%</span>
                            <span>Esfuerzo: {issue.effort_to_fix}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
