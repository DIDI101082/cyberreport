'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { detectAndParse } from '@/lib/importers/nessus'
import type { ParsedFinding } from '@/lib/importers/nessus'
import { ArrowLeft, Upload, FileSearch, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,0.4)'
}
const SEV_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)', high: 'rgba(249,115,22,0.1)', medium: 'rgba(234,179,8,0.1)',
  low: 'rgba(96,165,250,0.1)', info: 'rgba(255,255,255,0.04)'
}
const TOOL_ICON: Record<string, string> = { nessus: '🔍', zap: '⚡', burp: '🔥' }

export default function ImportPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dragOver,   setDragOver]   = useState(false)
  const [scanning,   setScanning]   = useState(false)
  const [scanner,    setScanner]    = useState('')
  const [findings,   setFindings]   = useState<ParsedFinding[]>([])
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [importing,  setImporting]  = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  function processFile(file: File) {
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.nessus')) {
      setError('Formato no soportado. Usá archivos .xml o .nessus')
      return
    }
    setScanning(true)
    setError('')
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { scanner: sc, findings: f } = detectAndParse(text)
      setScanner(sc)
      setFindings(f)
      setSelected(new Set(f.map((_, i) => i)))
      setScanning(false)
      if (f.length === 0) setError(`No se encontraron hallazgos en el archivo. ¿Es un reporte de ${sc}?`)
    }
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function toggleSelect(i: number) {
    setSelected(s => {
      const n = new Set(s)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  function toggleAll() {
    if (selected.size === findings.length) setSelected(new Set())
    else setSelected(new Set(findings.map((_, i) => i)))
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    const toInsert = [...selected].map(i => ({
      project_id:        params.id,
      title:             findings[i].title,
      description:       findings[i].description,
      recommendation:    findings[i].recommendation,
      severity:          findings[i].severity,
      cvss_score:        findings[i].cvss_score,
      cve_id:            findings[i].cve_id || null,
      affected_endpoint: findings[i].affected_endpoint,
      evidence:          findings[i].evidence,
      category:          findings[i].category,
      tool_source:       findings[i].tool_source,
      status:            'open',
      ai_generated:      false,
    }))

    const { error: err } = await supabase.from('findings').insert(toInsert)
    if (err) {
      setError('Error importando: ' + err.message)
      setImporting(false)
    } else {
      setDone(true)
      setTimeout(() => router.push(`/projects/${params.id}`), 2000)
    }
  }

  const bySeverity = ['critical','high','medium','low','info'].map(s => ({
    s, count: findings.filter(f => f.severity === s).length
  })).filter(x => x.count > 0)

  return (
    <>
      <style>{`
        .imp-wrap { padding: 24px 28px; max-width: 820px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .imp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color 0.12s; }
        .imp-back:hover { color: rgba(255,255,255,0.8); }
        .imp-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
        .imp-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 24px; }
        .dropzone { border: 2px dashed rgba(255,255,255,0.12); border-radius: 14px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.15s; background: rgba(255,255,255,0.02); }
        .dropzone.over { border-color: rgba(59,130,246,0.5); background: rgba(37,99,235,0.08); }
        .dropzone:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.03); }
        .dz-icon { width: 52px; height: 52px; background: rgba(37,99,235,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .dz-title { font-size: 15px; font-weight: 600; margin: 0 0 6px; }
        .dz-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 20px; }
        .dz-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: rgba(37,99,235,0.85); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .dz-formats { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
        .dz-tag { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }
        .scan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: gap; }
        .scan-info { display: flex; align-items: center; gap: 12px; }
        .scan-badge { display: flex; align-items: center; gap: 7px; padding: 6px 12px; background: rgba(37,99,235,0.15); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; font-size: 13px; font-weight: 600; color: #93c5fd; }
        .sev-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .sev-chip { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .findings-table { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; }
        .ft-header { display: grid; grid-template-columns: 32px 1fr 90px 90px 160px; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.04); font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; }
        .ft-row { display: grid; grid-template-columns: 32px 1fr 90px 90px 160px; gap: 12px; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.05); align-items: center; cursor: pointer; transition: background 0.1s; }
        .ft-row:hover { background: rgba(255,255,255,0.02); }
        .ft-row.sel { background: rgba(37,99,235,0.06); }
        .ft-check { width: 16px; height: 16px; accent-color: #6366f1; cursor: pointer; }
        .ft-name { font-size: 13px; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ft-host { font-size: 11px; color: rgba(255,255,255,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sev-pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .tool-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
        .imp-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; gap: 12px; flex-wrap: wrap; }
        .sel-count { font-size: 13px; color: rgba(255,255,255,0.5); }
        .btn-import { display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; background: rgba(37,99,235,0.9); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-import:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-import:not(:disabled):hover { background: rgba(37,99,235,1); }
        .btn-toggle-all { padding: 7px 13px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .err-box { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; color: #fca5a5; font-size: 13px; margin-bottom: 16px; }
        .done-box { display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); border-radius: 12px; color: #86efac; font-size: 14px; font-weight: 600; }
      `}</style>

      <div className="imp-wrap">
        <Link href={`/projects/${params.id}`} className="imp-back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <h1 className="imp-title">Importar hallazgos</h1>
        <p className="imp-sub">Soporta reportes de Nessus, OWASP ZAP y Burp Suite en formato XML</p>

        {done ? (
          <div className="done-box">
            <CheckCircle2 size={22} color="#4ade80" />
            Se importaron {selected.size} hallazgos correctamente. Redirigiendo…
          </div>
        ) : findings.length === 0 ? (
          <>
            {error && (
              <div className="err-box">
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            <div
              className={`dropzone${dragOver ? ' over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xml,.nessus" style={{ display: 'none' }} onChange={onFileChange} />
              <div className="dz-icon">
                {scanning
                  ? <Loader2 size={24} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
                  : <FileSearch size={24} color="#60a5fa" />
                }
              </div>
              <p className="dz-title">{scanning ? 'Analizando archivo…' : 'Arrastrá tu reporte aquí'}</p>
              <p className="dz-sub">{scanning ? 'Detectando escáner y parseando hallazgos' : 'o hacé click para seleccionar un archivo'}</p>
              {!scanning && (
                <>
                  <button className="dz-btn" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                    <Upload size={14} /> Seleccionar archivo
                  </button>
                  <div className="dz-formats">
                    <span className="dz-tag">🔍 Nessus .nessus/.xml</span>
                    <span className="dz-tag">⚡ OWASP ZAP .xml</span>
                    <span className="dz-tag">🔥 Burp Suite .xml</span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {error && (
              <div className="err-box">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <div className="scan-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div className="scan-info">
                <div className="scan-badge">
                  <FileSearch size={14} /> {scanner} — {findings.length} hallazgos encontrados
                </div>
              </div>
              <button className="btn-toggle-all" onClick={toggleAll}>
                {selected.size === findings.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="sev-summary">
              {bySeverity.map(({ s, count }) => (
                <span key={s} className="sev-chip" style={{ background: SEV_BG[s], color: SEV_COLOR[s] }}>
                  {count} {s}
                </span>
              ))}
            </div>

            <div className="findings-table">
              <div className="ft-header">
                <span></span>
                <span>Hallazgo</span>
                <span>Severidad</span>
                <span>CVSS</span>
                <span>Host / URL</span>
              </div>
              {findings.map((f, i) => (
                <div
                  key={i}
                  className={`ft-row${selected.has(i) ? ' sel' : ''}`}
                  onClick={() => toggleSelect(i)}
                >
                  <input
                    type="checkbox"
                    className="ft-check"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <div className="ft-name">{f.title}</div>
                    <div className="ft-host">
                      <span className="tool-pill">{TOOL_ICON[f.tool_source] ?? '🔧'} {f.tool_source}</span>
                    </div>
                  </div>
                  <div>
                    <span className="sev-pill" style={{ background: SEV_BG[f.severity], color: SEV_COLOR[f.severity] }}>
                      {f.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: f.cvss_score ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                    {f.cvss_score?.toFixed(1) ?? '—'}
                  </div>
                  <div className="ft-host" style={{ fontSize: 12 }}>{f.affected_endpoint || '—'}</div>
                </div>
              ))}
            </div>

            <div className="imp-footer">
              <span className="sel-count">{selected.size} de {findings.length} seleccionados para importar</span>
              <div style={{ display:'flex', gap:10 }}>
                <button
                  className="btn-toggle-all"
                  onClick={() => { setFindings([]); setScanner(''); setSelected(new Set()); setError('') }}
                >
                  Cargar otro archivo
                </button>
                <button
                  className="btn-import"
                  disabled={selected.size === 0 || importing}
                  onClick={handleImport}
                >
                  {importing
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando…</>
                    : <><CheckCircle2 size={14} /> Importar {selected.size} hallazgos</>
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
