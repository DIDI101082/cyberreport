'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileCode2, X } from 'lucide-react'

interface ParsedFinding {
  title: string
  severity: string
  description: string
  recommendation: string
  affected_endpoint: string
  cve_id: string
  cwe_id: string
  tool_source: string
}

type ImportSource = 'zap' | 'burp'

const SEV_MAP_ZAP: Record<string, string> = {
  '0': 'info', '1': 'low', '2': 'medium', '3': 'high', '4': 'critical',
}
const SEV_MAP_BURP: Record<string, string> = {
  information: 'info', low: 'low', medium: 'medium', high: 'high', critical: 'critical',
}
const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: '#6b7280',
}

function text(el: Element | null, tag: string): string {
  return el?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}

function parseZAP(xml: string): ParsedFinding[] {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(xml, 'application/xml')
  const alerts = Array.from(doc.getElementsByTagName('alertitem'))
  return alerts.map(a => {
    const risk = text(a, 'riskcode')
    const sev  = SEV_MAP_ZAP[risk] ?? 'info'
    const cwe  = text(a, 'cweid')
    return {
      title:             text(a, 'alert') || text(a, 'name') || 'Sin título',
      severity:          sev,
      description:       text(a, 'desc') || text(a, 'description'),
      recommendation:    text(a, 'solution'),
      affected_endpoint: text(a, 'uri') || text(a, 'url'),
      cve_id:            '',
      cwe_id:            cwe ? `CWE-${cwe}` : '',
      tool_source:       'zap',
    }
  }).filter(f => f.title !== 'Sin título' || f.description)
}

function parseBurp(xml: string): ParsedFinding[] {
  const parser  = new DOMParser()
  const doc     = parser.parseFromString(xml, 'application/xml')
  const issues  = Array.from(doc.getElementsByTagName('issue'))
  return issues.map(i => {
    const sevRaw = text(i, 'severity').toLowerCase()
    const sev    = SEV_MAP_BURP[sevRaw] ?? 'info'
    // Burp uses <serialNumber> for issue type, <name> for title
    const host   = text(i, 'host')
    const path   = text(i, 'path')
    return {
      title:             text(i, 'name') || 'Sin título',
      severity:          sev,
      description:       text(i, 'issueDetail') || text(i, 'issueBackground'),
      recommendation:    text(i, 'remediationDetail') || text(i, 'remediationBackground'),
      affected_endpoint: host && path ? `${host}${path}` : host || path,
      cve_id:            '',
      cwe_id:            '',
      tool_source:       'burp',
    }
  }).filter(f => f.title !== 'Sin título' || f.description)
}

export default function ImportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [source,   setSource]   = useState<ImportSource>('zap')
  const [findings, setFindings] = useState<ParsedFinding[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [status,   setStatus]   = useState<'idle'|'parsed'|'importing'|'done'|'error'>('idle')
  const [errMsg,   setErrMsg]   = useState('')
  const [fileName, setFileName] = useState('')
  const [imported, setImported] = useState(0)

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const xml   = e.target?.result as string
        const list  = source === 'zap' ? parseZAP(xml) : parseBurp(xml)
        if (!list.length) throw new Error('No se encontraron hallazgos en el archivo')
        setFindings(list)
        setSelected(new Set(list.map((_, i) => i)))
        setStatus('parsed')
      } catch (err: unknown) {
        setErrMsg(err instanceof Error ? err.message : 'Error al parsear el archivo')
        setStatus('error')
      }
    }
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function doImport() {
    setStatus('importing')
    const toImport = findings.filter((_, i) => selected.has(i))
    let count = 0
    for (const f of toImport) {
      const res = await fetch(`/api/projects/${params.id}/findings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      if (res.ok) count++
    }
    setImported(count)
    setStatus('done')
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  function reset() {
    setFindings([]); setSelected(new Set()); setStatus('idle')
    setFileName(''); setErrMsg(''); setImported(0)
  }

  return (
    <>
      <style>{`
        .imp { padding: 24px 28px; max-width: 820px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
        .sub { font-size: 12px; color: rgba(255,255,255,.35); margin: 0 0 22px; }

        /* Source selector */
        .src-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .src-tab { padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.45); transition: all .12s; }
        .src-tab.active { background: rgba(37,99,235,.2); border-color: rgba(59,130,246,.35); color: #93c5fd; }

        /* Drop zone */
        .dropzone { border: 2px dashed rgba(255,255,255,.12); border-radius: 14px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all .15s; background: rgba(255,255,255,.03); }
        .dropzone:hover, .dropzone.over { border-color: rgba(59,130,246,.4); background: rgba(37,99,235,.06); }
        .drop-icon { margin: 0 auto 14px; opacity: .3; }
        .drop-title { font-size: 15px; font-weight: 600; color: rgba(255,255,255,.7); margin-bottom: 6px; }
        .drop-sub { font-size: 12.5px; color: rgba(255,255,255,.3); }
        .drop-btn { display: inline-block; margin-top: 16px; padding: 8px 18px; background: rgba(37,99,235,.3); border: 1px solid rgba(59,130,246,.3); border-radius: 9px; font-size: 13px; color: #93c5fd; font-weight: 600; cursor: pointer; }

        /* Parsed state */
        .parse-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .parse-info { font-size: 13px; color: rgba(255,255,255,.65); }
        .parse-file { font-size: 11px; color: rgba(255,255,255,.3); margin-top: 2px; }
        .sel-controls { display: flex; gap: 8px; align-items: center; }
        .sel-btn { font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 7px; cursor: pointer; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); }
        .sel-btn:hover { background: rgba(255,255,255,.09); }

        /* Finding rows */
        .f-list { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
        .f-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.05); cursor: pointer; transition: background .1s; }
        .f-row:last-child { border-bottom: none; }
        .f-row:hover { background: rgba(255,255,255,.03); }
        .f-row.deselected { opacity: .4; }
        .f-chk { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(255,255,255,.25); margin-top: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.04); transition: all .1s; }
        .f-chk.checked { background: rgba(37,99,235,.8); border-color: #3b82f6; }
        .f-body { flex: 1; min-width: 0; }
        .f-title { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.82); margin-bottom: 4px; }
        .f-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .sev-pill { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
        .f-ep { font-size: 11px; color: rgba(255,255,255,.3); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }

        /* Import button */
        .imp-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; border-radius: 11px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.3); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .12s; }
        .imp-btn:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .imp-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* Done state */
        .done-card { background: rgba(74,222,128,.07); border: 1px solid rgba(74,222,128,.2); border-radius: 14px; padding: 32px; text-align: center; }
        .done-icon { margin: 0 auto 14px; }
        .done-title { font-size: 18px; font-weight: 800; color: #4ade80; margin-bottom: 8px; }
        .done-sub { font-size: 13px; color: rgba(255,255,255,.45); margin-bottom: 18px; }
        .done-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .btn-go { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all .12s; }
        .btn-primary { background: rgba(37,99,235,.8); border: 1px solid rgba(59,130,246,.3); color: #fff; }
        .btn-ghost { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.6); }

        /* Error */
        .err-card { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 12px; padding: 16px 20px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
        .err-text { font-size: 13px; color: #fca5a5; }
      `}</style>

      <div className="imp">
        <Link href={`/projects/${params.id}`} className="back">
          <ArrowLeft size={14} /> Proyecto
        </Link>
        <h1 className="title">Importar hallazgos</h1>
        <p className="sub">Importa hallazgos desde un reporte XML de OWASP ZAP o Burp Suite Pro</p>

        {status === 'done' ? (
          <div className="done-card">
            <CheckCircle2 size={44} color="#4ade80" className="done-icon" />
            <h2 className="done-title">{imported} hallazgo{imported !== 1 ? 's' : ''} importado{imported !== 1 ? 's' : ''}</h2>
            <p className="done-sub">Los hallazgos se añadieron correctamente al proyecto.</p>
            <div className="done-btns">
              <Link href={`/projects/${params.id}/findings`} className="btn-go btn-primary">Ver hallazgos</Link>
              <button className="btn-go btn-ghost" onClick={reset}>Importar más</button>
            </div>
          </div>
        ) : (
          <>
            {/* Source selector */}
            {status === 'idle' && (
              <>
                <div className="src-tabs">
                  <button className={`src-tab${source === 'zap' ? ' active' : ''}`} onClick={() => setSource('zap')}>
                    🛡️ OWASP ZAP
                  </button>
                  <button className={`src-tab${source === 'burp' ? ' active' : ''}`} onClick={() => setSource('burp')}>
                    🔴 Burp Suite
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  className="dropzone"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over') }}
                  onDragLeave={e => e.currentTarget.classList.remove('over')}
                  onDrop={e => { e.currentTarget.classList.remove('over'); onDrop(e) }}
                >
                  <FileCode2 size={40} className="drop-icon" />
                  <p className="drop-title">Arrastra tu archivo XML aquí</p>
                  <p className="drop-sub">
                    {source === 'zap'
                      ? 'Exporta desde ZAP: Reports → Generate Report → XML'
                      : 'Exporta desde Burp: Dashboard → Issues → Save selected items → XML'}
                  </p>
                  <span className="drop-btn">Seleccionar archivo</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                  />
                </div>
              </>
            )}

            {/* Error */}
            {status === 'error' && (
              <>
                <div className="err-card">
                  <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="err-text">{errMsg}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                      Asegúrate de exportar el archivo en formato XML desde {source === 'zap' ? 'OWASP ZAP' : 'Burp Suite'}.
                    </p>
                  </div>
                </div>
                <button className="imp-btn" style={{ marginTop: 0 }} onClick={reset}>
                  Intentar de nuevo
                </button>
              </>
            )}

            {/* Parsed — show findings to select */}
            {(status === 'parsed' || status === 'importing') && (
              <>
                <div className="parse-header">
                  <div>
                    <p className="parse-info">
                      Se encontraron <strong>{findings.length}</strong> hallazgos en el archivo
                    </p>
                    <p className="parse-file">📄 {fileName}</p>
                  </div>
                  <div className="sel-controls">
                    <button className="sel-btn" onClick={() => setSelected(new Set(findings.map((_, i) => i)))}>
                      Seleccionar todo
                    </button>
                    <button className="sel-btn" onClick={() => setSelected(new Set())}>
                      Ninguno
                    </button>
                    <button className="sel-btn" onClick={reset}>
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div className="f-list">
                  {findings.map((f, i) => {
                    const isSelected = selected.has(i)
                    return (
                      <div
                        key={i}
                        className={`f-row${!isSelected ? ' deselected' : ''}`}
                        onClick={() => toggleSelect(i)}
                      >
                        <div className={`f-chk${isSelected ? ' checked' : ''}`}>
                          {isSelected && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                        </div>
                        <div className="f-body">
                          <p className="f-title">{f.title}</p>
                          <div className="f-meta">
                            <span
                              className="sev-pill"
                              style={{ background: `${SEV_COLORS[f.severity]}18`, color: SEV_COLORS[f.severity] }}
                            >
                              {f.severity.toUpperCase()}
                            </span>
                            {f.cwe_id && (
                              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>
                                {f.cwe_id}
                              </span>
                            )}
                            {f.affected_endpoint && (
                              <span className="f-ep">{f.affected_endpoint}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  className="imp-btn"
                  onClick={doImport}
                  disabled={selected.size === 0 || status === 'importing'}
                >
                  {status === 'importing' ? (
                    <>Importando…</>
                  ) : (
                    <>
                      <Upload size={15} />
                      Importar {selected.size} hallazgo{selected.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
