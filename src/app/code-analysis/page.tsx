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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Code2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Code Security Analyzer</h1>
          <p className="text-gray-500 text-sm">Análisis de seguridad con IA — más proactivo que SonarQube</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Panel izquierdo: configuración + upload */}
        <div className="col-span-1 space-y-4">

          {/* Frameworks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Marcos a verificar</p>
            <div className="space-y-1.5">
              {FRAMEWORKS.map(fw => (
                <label key={fw} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFrameworks.includes(fw)}
                    onChange={() => setSelectedFrameworks(prev =>
                      prev.includes(fw) ? prev.filter(x => x !== fw) : [...prev, fw]
                    )}
                    className="w-3.5 h-3.5 rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{fw}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`bg-white rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Arrastrá archivos o hacé click</p>
            <p className="text-xs text-gray-400 mt-1">.ts .tsx .js .jsx .py .php .java .go...</p>
          </div>

          {/* Lista de archivos */}
          {files.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{files.length} archivo{files.length > 1 ? 's' : ''}</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {files.map(f => (
                  <div key={f.path} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-600 truncate">{f.path}</span>
                    </div>
                    <button onClick={() => setFiles(p => p.filter(x => x.path !== f.path))} className="text-gray-300 hover:text-red-400 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!files.length || analyzing}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analizando con IA…' : 'Analizar código'}
          </button>

          {analyzing && (
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-700 font-medium">Análisis estático → IA profunda → Generando fixes…</p>
              <div className="mt-2 flex gap-1 justify-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: resultados */}
        <div className="col-span-2 space-y-4">
          {!session ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Subí archivos de código para iniciar el análisis</p>
            </div>
          ) : (
            <>
              {/* Health Score Dashboard */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Salud del código</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-5xl font-black ${getGradeColor(session.health_score.grade)}`}>
                        {session.health_score.grade}
                      </span>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{session.health_score.overall}<span className="text-base text-gray-400 font-normal">/100</span></p>
                        <p className="text-sm text-gray-500">{getScoreLabel(session.health_score.overall)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{session.files_analyzed} archivos</p>
                    <p>{session.lines_analyzed.toLocaleString()} líneas</p>
                    <p>{(session.duration_ms / 1000).toFixed(1)}s</p>
                  </div>
                </div>

                {/* 3 subscores */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Seguridad', score: session.health_score.security },
                    { label: 'Compliance', score: session.health_score.compliance },
                    { label: 'Calidad', score: session.health_score.quality },
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-1">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                          <circle
                            cx="32" cy="32" r="26"
                            stroke={score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="6" fill="none"
                            strokeDasharray={`${(score / 100) * 163.4} 163.4`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                          {score}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdown por severidad */}
                <div className="flex gap-3">
                  {(['critical','high','medium','low','info'] as IssueSeverity[]).map(s => {
                    const count = session.health_score.breakdown[s]
                    const cfg = SEVERITY_CONFIG[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(prev => prev === s ? 'all' : s)}
                        className={`flex-1 text-center py-2 rounded-lg border text-xs font-medium transition-colors ${
                          severityFilter === s ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-lg font-bold">{count}</p>
                        <p>{cfg.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Positivos */}
              {positives.length > 0 && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-800">Aspectos bien implementados</p>
                  </div>
                  <ul className="space-y-1">
                    {positives.map((p, i) => (
                      <li key={i} className="text-xs text-green-700">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Filtros por categoría */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    categoryFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Todas
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(prev => prev === cat ? 'all' : cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      categoryFilter === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>

              {/* Lista de issues */}
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No se encontraron issues con el filtro actual</p>
                  </div>
                )}
                {filtered.map(issue => {
                  const isOpen = expandedIssue === issue.id
                  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG]
                  const fix = fixes[issue.id]

                  return (
                    <div key={issue.id} className={`bg-white rounded-xl border transition-all ${isOpen ? 'border-indigo-200 shadow-sm' : 'border-gray-200'}`}>
                      {/* Issue header */}
                      <button
                        className="w-full flex items-start gap-3 p-4 text-left"
                        onClick={() => setExpandedIssue(prev => prev === issue.id ? null : issue.id)}
                      >
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {issue.file_path}:{issue.line_start}
                            {issue.line_end && issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}
                            {' · '}{CATEGORY_LABELS[issue.category] ?? issue.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Compliance badges */}
                          {issue.compliance_refs.slice(0, 2).map(ref => (
                            <span key={ref.id} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono">
                              {ref.id}
                            </span>
                          ))}
                          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      {/* Issue detail */}
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                          <p className="text-sm text-gray-700">{issue.description}</p>

                          {/* Code snippet */}
                          <div className="bg-gray-900 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
                              <span className="text-xs text-gray-400 font-mono">{issue.file_path}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(issue.code_snippet)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <pre className="p-3 text-xs text-green-300 font-mono overflow-x-auto">
                              {issue.code_snippet}
                            </pre>
                          </div>

                          {/* Fix explanation */}
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5" /> Cómo corregirlo
                            </p>
                            <p className="text-xs text-blue-700">{issue.fix_explanation}</p>
                          </div>

                          {/* Compliance refs */}
                          {issue.compliance_refs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {issue.compliance_refs.map(ref => (
                                <a
                                  key={ref.id}
                                  href={ref.url ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors"
                                >
                                  {ref.framework} {ref.id} — {ref.label}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* AI Fix */}
                          {!fix ? (
                            <button
                              onClick={() => handleGetFix(issue)}
                              disabled={fixLoading === issue.id}
                              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
                            >
                              {fixLoading === issue.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              {fixLoading === issue.id ? 'Generando fix…' : 'Generar fix con IA'}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-green-900 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-green-800">
                                  <span className="text-xs text-green-300 font-mono font-semibold">✓ Código corregido</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(String(fix.fixed_snippet ?? ''))}
                                    className="text-green-400 hover:text-white"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <pre className="p-3 text-xs text-green-200 font-mono overflow-x-auto">
                                  {String(fix.fixed_snippet ?? '')}
                                </pre>
                              </div>

                              {fix.explanation && (
                                <p className="text-xs text-gray-600">{String(fix.explanation)}</p>
                              )}

                              {fix.security_notes && fix.security_notes.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Notas de seguridad:</p>
                                  {fix.security_notes.map((note, i) => (
                                    <p key={i} className="text-xs text-gray-600">• {note}</p>
                                  ))}
                                </div>
                              )}

                              {fix.test_cases && fix.test_cases.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Casos de prueba:</p>
                                  {fix.test_cases.map((tc, i) => (
                                    <p key={i} className="text-xs text-gray-500 font-mono">• {tc}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex gap-4 text-xs text-gray-400">
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
