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

type ImportSource = 'zap' | 'burp' | 'nessus' | 'nmap' | 'qualys'

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: '#6b7280',
}

function text(el: Element | null, tag: string): string {
  return el?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}
function attr(el: Element | null, name: string): string {
  return el?.getAttribute(name)?.trim() ?? ''
}

/* ─── ZAP ─── */
const SEV_MAP_ZAP: Record<string, string> = {
  '0': 'info', '1': 'low', '2': 'medium', '3': 'high', '4': 'critical',
}
function parseZAP(xml: string): ParsedFinding[] {
  const doc    = new DOMParser().parseFromString(xml, 'application/xml')
  const alerts = Array.from(doc.getElementsByTagName('alertitem'))
  return alerts.map(a => {
    const risk = text(a, 'riskcode')
    const cwe  = text(a, 'cweid')
    return {
      title:             text(a, 'alert') || text(a, 'name') || 'Sin título',
      severity:          SEV_MAP_ZAP[risk] ?? 'info',
      description:       text(a, 'desc') || text(a, 'description'),
      recommendation:    text(a, 'solution'),
      affected_endpoint: text(a, 'uri') || text(a, 'url'),
      cve_id:            '',
      cwe_id:            cwe ? `CWE-${cwe}` : '',
      tool_source:       'zap',
    }
  }).filter(f => f.title !== 'Sin título' || f.description)
}

/* ─── Burp Suite ─── */
const SEV_MAP_BURP: Record<string, string> = {
  information: 'info', low: 'low', medium: 'medium', high: 'high', critical: 'critical',
}
function parseBurp(xml: string): ParsedFinding[] {
  const doc    = new DOMParser().parseFromString(xml, 'application/xml')
  const issues = Array.from(doc.getElementsByTagName('issue'))
  return issues.map(i => {
    const sevRaw = text(i, 'severity').toLowerCase()
    const host   = text(i, 'host')
    const path   = text(i, 'path')
    return {
      title:             text(i, 'name') || 'Sin título',
      severity:          SEV_MAP_BURP[sevRaw] ?? 'info',
      description:       text(i, 'issueDetail') || text(i, 'issueBackground'),
      recommendation:    text(i, 'remediationDetail') || text(i, 'remediationBackground'),
      affected_endpoint: host && path ? `${host}${path}` : host || path,
      cve_id:            '',
      cwe_id:            '',
      tool_source:       'burp',
    }
  }).filter(f => f.title !== 'Sin título' || f.description)
}

/* ─── Nessus ─── */
// Risk factor → severity
const SEV_MAP_NESSUS: Record<string, string> = {
  'none': 'info', 'low': 'low', 'medium': 'medium', 'high': 'high', 'critical': 'critical',
}
function parseNessus(xml: string): ParsedFinding[] {
  const doc      = new DOMParser().parseFromString(xml, 'application/xml')
  const items    = Array.from(doc.getElementsByTagName('ReportItem'))
  const findings: ParsedFinding[] = []

  for (const item of items) {
    const riskFactor = item.getElementsByTagName('risk_factor')[0]?.textContent?.trim().toLowerCase() ?? 'none'
    if (riskFactor === 'none') continue                         // skip purely informational

    const pluginName  = attr(item, 'pluginName') || text(item, 'pluginName') || 'Sin título'
    const host        = attr(item.parentElement, 'name') || ''
    const port        = attr(item, 'port') || ''
    const protocol    = attr(item, 'protocol') || ''
    const description = text(item, 'description') || text(item, 'synopsis')
    const solution    = text(item, 'solution')
    const cve         = Array.from(item.getElementsByTagName('cve')).map(c => c.textContent?.trim()).filter(Boolean).join(', ')
    const cwe         = text(item, 'cwe') || ''

    findings.push({
      title:             pluginName,
      severity:          SEV_MAP_NESSUS[riskFactor] ?? 'info',
      description,
      recommendation:    solution,
      affected_endpoint: port ? `${host}:${port}/${protocol}` : host,
      cve_id:            cve,
      cwe_id:            cwe ? `CWE-${cwe}` : '',
      tool_source:       'nessus',
    })
  }
  return findings
}

/* ─── Nmap ─── */
// Nmap itself doesn't assign risk levels; we map based on service/state heuristics.
// Script output and open ports → findings.
function parseNmap(xml: string): ParsedFinding[] {
  const doc     = new DOMParser().parseFromString(xml, 'application/xml')
  const hosts   = Array.from(doc.getElementsByTagName('host'))
  const findings: ParsedFinding[] = []

  // Known high-risk ports: severity mapping
  const HIGH_RISK: Record<number, { severity: string; title: string }> = {
    21:   { severity: 'high',   title: 'Puerto FTP abierto (21)' },
    22:   { severity: 'low',    title: 'Puerto SSH abierto (22)' },
    23:   { severity: 'critical', title: 'Puerto Telnet abierto (23) — protocolo inseguro' },
    25:   { severity: 'medium', title: 'Puerto SMTP abierto (25)' },
    53:   { severity: 'low',    title: 'Puerto DNS abierto (53)' },
    80:   { severity: 'info',   title: 'Puerto HTTP abierto (80)' },
    110:  { severity: 'medium', title: 'Puerto POP3 abierto (110)' },
    135:  { severity: 'high',   title: 'Puerto RPC/DCOM abierto (135)' },
    139:  { severity: 'high',   title: 'Puerto NetBIOS abierto (139)' },
    143:  { severity: 'medium', title: 'Puerto IMAP abierto (143)' },
    161:  { severity: 'high',   title: 'Puerto SNMP abierto (161)' },
    389:  { severity: 'medium', title: 'Puerto LDAP abierto (389)' },
    443:  { severity: 'info',   title: 'Puerto HTTPS abierto (443)' },
    445:  { severity: 'critical', title: 'Puerto SMB abierto (445) — riesgo ransomware/EternalBlue' },
    1433: { severity: 'critical', title: 'Puerto MSSQL expuesto (1433)' },
    1521: { severity: 'critical', title: 'Puerto Oracle DB expuesto (1521)' },
    2049: { severity: 'high',   title: 'Puerto NFS abierto (2049)' },
    3306: { severity: 'critical', title: 'Puerto MySQL expuesto (3306)' },
    3389: { severity: 'high',   title: 'Puerto RDP abierto (3389)' },
    5432: { severity: 'critical', title: 'Puerto PostgreSQL expuesto (5432)' },
    5900: { severity: 'high',   title: 'Puerto VNC abierto (5900)' },
    6379: { severity: 'critical', title: 'Puerto Redis expuesto (6379)' },
    8080: { severity: 'low',    title: 'Puerto HTTP alternativo abierto (8080)' },
    8443: { severity: 'info',   title: 'Puerto HTTPS alternativo abierto (8443)' },
    27017:{ severity: 'critical', title: 'Puerto MongoDB expuesto (27017)' },
  }

  for (const host of hosts) {
    const addrEl  = host.getElementsByTagName('address')[0]
    const ip      = attr(addrEl, 'addr') || 'desconocido'
    const hostnameEl = host.getElementsByTagName('hostname')[0]
    const hostname   = attr(hostnameEl, 'name') || ip

    const ports = Array.from(host.getElementsByTagName('port'))
    for (const port of ports) {
      const portId  = parseInt(attr(port, 'portid'), 10)
      const stateEl = port.getElementsByTagName('state')[0]
      const state   = attr(stateEl, 'state')
      if (state !== 'open') continue

      const serviceEl  = port.getElementsByTagName('service')[0]
      const serviceName = attr(serviceEl, 'name') || 'unknown'
      const product     = attr(serviceEl, 'product')
      const version     = attr(serviceEl, 'version')

      // Script output for extra context
      const scripts  = Array.from(port.getElementsByTagName('script'))
      const scriptOut = scripts.map(s => `${attr(s, 'id')}: ${attr(s, 'output')}`).join('\n')

      const known = HIGH_RISK[portId]
      const sev   = known?.severity ?? (portId < 1024 ? 'medium' : 'info')
      const title = known?.title ?? `Puerto ${portId}/${serviceName} abierto`

      const desc = [
        `Host: ${hostname} (${ip})`,
        `Puerto: ${portId}/${attr(port, 'protocol')} — ${serviceName}`,
        product && `Servicio: ${product}${version ? ` ${version}` : ''}`,
        scriptOut && `\nScripts Nmap:\n${scriptOut}`,
      ].filter(Boolean).join('\n')

      findings.push({
        title,
        severity: sev,
        description:    desc,
        recommendation: known
          ? `Evaluar la exposición del puerto ${portId}. Si no es necesario, cerrarlo con firewall o desactivar el servicio.`
          : `Revisar si el puerto ${portId} debe estar expuesto en ${hostname}.`,
        affected_endpoint: `${hostname}:${portId}`,
        cve_id:  '',
        cwe_id:  '',
        tool_source: 'nmap',
      })
    }

    // Also add script-level findings not tied to a specific port (hostscript)
    const hostScripts = Array.from(host.getElementsByTagName('hostscript'))
    for (const hs of hostScripts) {
      const scripts = Array.from(hs.getElementsByTagName('script'))
      for (const s of scripts) {
        const sid = attr(s, 'id')
        const out = attr(s, 'output')
        if (!sid || !out) continue
        findings.push({
          title:             `Nmap script: ${sid}`,
          severity:          'info',
          description:       `Host: ${hostname} (${ip})\n${out}`,
          recommendation:    'Revisar el resultado del script y evaluar impacto.',
          affected_endpoint: hostname,
          cve_id:  '',
          cwe_id:  '',
          tool_source: 'nmap',
        })
      }
    }
  }

  return findings.filter(f => f.severity !== 'info' || f.description)
}

/* ─── Qualys ─── */
// Qualys VMPC export: <QID>, <SEVERITY>, <TITLE>, <DIAGNOSIS>, <SOLUTION>, <CVE_LIST>
const SEV_MAP_QUALYS: Record<string, string> = {
  '1': 'info', '2': 'low', '3': 'medium', '4': 'high', '5': 'critical',
}
function parseQualys(xml: string): ParsedFinding[] {
  const doc     = new DOMParser().parseFromString(xml, 'application/xml')
  const findings: ParsedFinding[] = []

  // Try VMPC format: <VULN> or <VULNERABILITY> elements
  const vulns = Array.from(doc.getElementsByTagName('VULN'))
    .concat(Array.from(doc.getElementsByTagName('VULNERABILITY')))

  for (const v of vulns) {
    const sevRaw = text(v, 'SEVERITY') || text(v, 'SEVERITY_LEVEL') || '1'
    const sev    = SEV_MAP_QUALYS[sevRaw] ?? 'info'
    const title  = text(v, 'TITLE') || text(v, 'VULN_TITLE') || 'Sin título'
    if (sev === 'info') continue   // skip informational by default

    const cveList = Array.from(v.getElementsByTagName('CVE_ID')).map(c => c.textContent?.trim()).filter(Boolean).join(', ')
    const host    = text(v.closest?.('[TAG=HOST]') ?? v, 'IP') || text(v, 'HOST_IP') || ''
    const port    = text(v, 'PORT') || ''

    findings.push({
      title,
      severity:          sev,
      description:       text(v, 'DIAGNOSIS') || text(v, 'DESCRIPTION'),
      recommendation:    text(v, 'SOLUTION') || text(v, 'SOLUTION_COMMENT'),
      affected_endpoint: port ? `${host}:${port}` : host,
      cve_id:            cveList,
      cwe_id:            '',
      tool_source:       'qualys',
    })
  }

  // Also try Qualys WebApp Scanning format: <vulnerability> elements
  if (!findings.length) {
    const waVulns = Array.from(doc.getElementsByTagName('vulnerability'))
    for (const v of waVulns) {
      const sevRaw = text(v, 'severity') || '1'
      const sev    = SEV_MAP_QUALYS[sevRaw] ?? 'info'
      const title  = text(v, 'name') || text(v, 'title') || 'Sin título'
      if (sev === 'info') continue
      findings.push({
        title,
        severity:          sev,
        description:       text(v, 'description') || text(v, 'details'),
        recommendation:    text(v, 'solution'),
        affected_endpoint: text(v, 'url') || text(v, 'uri') || '',
        cve_id:            Array.from(v.getElementsByTagName('cve')).map(c => c.textContent?.trim()).filter(Boolean).join(', '),
        cwe_id:            '',
        tool_source:       'qualys',
      })
    }
  }

  return findings.filter(f => f.title !== 'Sin título' || f.description)
}

/* ─── Source config ─── */
const SOURCES: { id: ImportSource; label: string; icon: string; hint: string; accept: string }[] = [
  {
    id: 'zap', label: 'OWASP ZAP', icon: '🛡️',
    hint: 'Reports → Generate Report → XML',
    accept: '.xml',
  },
  {
    id: 'burp', label: 'Burp Suite', icon: '🔴',
    hint: 'Dashboard → Issues → Save selected items → XML',
    accept: '.xml',
  },
  {
    id: 'nessus', label: 'Nessus', icon: '🟠',
    hint: 'My Scans → Export → Nessus (.nessus) o XML',
    accept: '.nessus,.xml',
  },
  {
    id: 'nmap', label: 'Nmap', icon: '🗺️',
    hint: 'nmap -sV -oX output.xml <target>',
    accept: '.xml',
  },
  {
    id: 'qualys', label: 'Qualys', icon: '🔵',
    hint: 'Reports → Download → XML (VMPC o WebApp Scanning)',
    accept: '.xml',
  },
]

function parse(source: ImportSource, xml: string): ParsedFinding[] {
  switch (source) {
    case 'zap':    return parseZAP(xml)
    case 'burp':   return parseBurp(xml)
    case 'nessus': return parseNessus(xml)
    case 'nmap':   return parseNmap(xml)
    case 'qualys': return parseQualys(xml)
  }
}

export default function ImportPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
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
        const xml  = e.target?.result as string
        const list = parse(source, xml)
        if (!list.length) throw new Error('No se encontraron hallazgos en el archivo. Verificá el formato y que el escaneo haya detectado vulnerabilidades.')
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

  const srcCfg = SOURCES.find(s => s.id === source)!

  return (
    <>
      <style>{`
        .imp { padding: 24px 28px; max-width: 820px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
        .sub { font-size: 12px; color: rgba(255,255,255,.35); margin: 0 0 22px; }

        /* Source selector */
        .src-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .src-tab { padding: 8px 16px; border-radius: 9px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.45); transition: all .12s; white-space: nowrap; }
        .src-tab.active { background: rgba(37,99,235,.2); border-color: rgba(59,130,246,.35); color: #93c5fd; }
        .src-tab:hover:not(.active) { background: rgba(255,255,255,.07); color: rgba(255,255,255,.7); }

        /* Drop zone */
        .dropzone { border: 2px dashed rgba(255,255,255,.12); border-radius: 14px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all .15s; background: rgba(255,255,255,.03); }
        .dropzone:hover, .dropzone.over { border-color: rgba(59,130,246,.4); background: rgba(37,99,235,.06); }
        .drop-icon { margin: 0 auto 14px; opacity: .3; }
        .drop-title { font-size: 15px; font-weight: 600; color: rgba(255,255,255,.7); margin-bottom: 6px; }
        .drop-sub { font-size: 12.5px; color: rgba(255,255,255,.3); }
        .drop-hint { font-size: 11.5px; color: rgba(96,165,250,.6); margin-top: 8px; font-family: monospace; }
        .drop-btn { display: inline-block; margin-top: 16px; padding: 8px 18px; background: rgba(37,99,235,.3); border: 1px solid rgba(59,130,246,.3); border-radius: 9px; font-size: 13px; color: #93c5fd; font-weight: 600; cursor: pointer; }

        /* Parsed state */
        .parse-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .parse-info { font-size: 13px; color: rgba(255,255,255,.65); }
        .parse-file { font-size: 11px; color: rgba(255,255,255,.3); margin-top: 2px; }
        .sel-controls { display: flex; gap: 8px; align-items: center; }
        .sel-btn { font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 7px; cursor: pointer; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); }
        .sel-btn:hover { background: rgba(255,255,255,.09); }

        /* Finding rows */
        .f-list { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; margin-bottom: 16px; max-height: 480px; overflow-y: auto; }
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
        .f-cve { font-size: 10px; color: rgba(250,204,21,.6); }

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
        .btn-go { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all .12s; cursor: pointer; border: 1px solid; }
        .btn-primary { background: rgba(37,99,235,.8); border-color: rgba(59,130,246,.3); color: #fff; }
        .btn-ghost { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); color: rgba(255,255,255,.6); }

        /* Error */
        .err-card { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 12px; padding: 16px 20px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
        .err-text { font-size: 13px; color: #fca5a5; }
      `}</style>

      <div className="imp">
        <Link href={`/projects/${params.id}`} className="back">
          <ArrowLeft size={14} /> Proyecto
        </Link>
        <h1 className="title">Importar hallazgos</h1>
        <p className="sub">Importa desde ZAP, Burp Suite, Nessus, Nmap o Qualys</p>

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
                  {SOURCES.map(s => (
                    <button
                      key={s.id}
                      className={`src-tab${source === s.id ? ' active' : ''}`}
                      onClick={() => setSource(s.id)}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>

                <div
                  className="dropzone"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over') }}
                  onDragLeave={e => e.currentTarget.classList.remove('over')}
                  onDrop={e => { e.currentTarget.classList.remove('over'); onDrop(e) }}
                >
                  <FileCode2 size={40} className="drop-icon" />
                  <p className="drop-title">Arrastra tu archivo aquí</p>
                  <p className="drop-sub">{srcCfg.icon} {srcCfg.label}</p>
                  <p className="drop-hint">📋 {srcCfg.hint}</p>
                  <span className="drop-btn">Seleccionar archivo</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={srcCfg.accept}
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
                      Exportá desde {srcCfg.label}: {srcCfg.hint}
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
                    <p className="parse-file">📄 {fileName} · {srcCfg.icon} {srcCfg.label}</p>
                  </div>
                  <div className="sel-controls">
                    <button className="sel-btn" onClick={() => setSelected(new Set(findings.map((_, i) => i)))}>
                      Seleccionar todo
                    </button>
                    <button className="sel-btn" onClick={() => setSelected(new Set())}>
                      Deseleccionar
                    </button>
                    <button className="sel-btn" onClick={reset}>
                      <X size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Cancelar
                    </button>
                  </div>
                </div>

                <div className="f-list">
                  {findings.map((f, i) => {
                    const isSelected = selected.has(i)
                    const color      = SEV_COLORS[f.severity] ?? '#6b7280'
                    return (
                      <div
                        key={i}
                        className={`f-row${!isSelected ? ' deselected' : ''}`}
                        onClick={() => toggleSelect(i)}
                      >
                        <div className={`f-chk${isSelected ? ' checked' : ''}`}>
                          {isSelected && <CheckCircle2 size={11} color="#fff" />}
                        </div>
                        <div className="f-body">
                          <p className="f-title">{f.title}</p>
                          <div className="f-meta">
                            <span className="sev-pill" style={{ background: `${color}22`, color }}>
                              {f.severity}
                            </span>
                            {f.affected_endpoint && (
                              <span className="f-ep">{f.affected_endpoint}</span>
                            )}
                            {f.cve_id && (
                              <span className="f-cve">{f.cve_id}</span>
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
                  disabled={status === 'importing' || selected.size === 0}
                >
                  <Upload size={16} />
                  {status === 'importing'
                    ? 'Importando…'
                    : `Importar ${selected.size} hallazgo${selected.size !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
