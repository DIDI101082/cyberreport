'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FileText, Presentation, Loader2, Download } from 'lucide-react'
import Link from 'next/link'

export default function ReportPage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<{ name: string; organization: { name: string } | null } | null>(null)
  const [format, setFormat] = useState<'pdf' | 'pptx'>('pdf')
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase
      .from('projects')
      .select('name, target_frameworks, organization:organizations(name)')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const orgRaw = data.organization
          const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name: string } | null
          setProject({ name: data.name as string, organization: org })
          setFrameworks((data.target_frameworks as string[]) ?? [])
        }
      })
  }, [params.id])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const endpoint = format === 'pdf' ? '/api/reports/pdf' : '/api/reports/pptx'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: params.id, frameworks }),
      })
      if (!res.ok) throw new Error('Error generando reporte')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cyberreport_${params.id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error al generar el reporte: ' + (err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const ALL_FRAMEWORKS = ['ISO 27001', 'PCI-DSS v4.0', 'NIST CSF 2.0']
  function toggleFw(fw: string) {
    setFrameworks(f => f.includes(fw) ? f.filter(x => x !== fw) : [...f, fw])
  }

  if (!project) return (
    <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
      <Loader2 size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <>
      <style>{`
        .rp-wrap { padding: 24px 28px; max-width: 480px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .rp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color 0.12s; }
        .rp-back:hover { color: rgba(255,255,255,0.8); }
        .rp-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .rp-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 24px; }
        .rp-section-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 12px; display: block; }
        .fmt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .fmt-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 16px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .fmt-card:hover { background: rgba(255,255,255,0.06); }
        .fmt-card.pdf-active { border-color: rgba(59,130,246,0.5); background: rgba(37,99,235,0.12); }
        .fmt-card.pptx-active { border-color: rgba(167,139,250,0.5); background: rgba(124,58,237,0.12); }
        .fmt-name { font-size: 14px; font-weight: 700; }
        .fmt-desc { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
        .fw-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
        .fw-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.12s; }
        .fw-row:hover { background: rgba(255,255,255,0.05); }
        .fw-row input { accent-color: #6366f1; width: 15px; height: 15px; }
        .fw-row-name { font-size: 13px; color: rgba(255,255,255,0.75); }
        .btn-generate { width: 100%; padding: 13px; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 9px; border: none; transition: all 0.15s; }
        .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-generate.pdf { background: rgba(37,99,235,0.9); }
        .btn-generate.pdf:not(:disabled):hover { background: rgba(37,99,235,1); }
        .btn-generate.pptx { background: rgba(124,58,237,0.9); }
        .btn-generate.pptx:not(:disabled):hover { background: rgba(124,58,237,1); }
      `}</style>

      <div className="rp-wrap">
        <Link href={`/projects/${params.id}`} className="rp-back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <h1 className="rp-title">Generar reporte</h1>
        <p className="rp-sub">{project.name}</p>

        {/* Formato */}
        <label className="rp-section-label">Formato de exportación</label>
        <div className="fmt-grid">
          <button
            onClick={() => setFormat('pdf')}
            className={`fmt-card${format === 'pdf' ? ' pdf-active' : ''}`}
          >
            <FileText size={28} color={format === 'pdf' ? '#60a5fa' : 'rgba(255,255,255,0.25)'} />
            <span className="fmt-name" style={{ color: format === 'pdf' ? '#93c5fd' : 'rgba(255,255,255,0.7)' }}>PDF</span>
            <p className="fmt-desc">Informe técnico completo</p>
          </button>
          <button
            onClick={() => setFormat('pptx')}
            className={`fmt-card${format === 'pptx' ? ' pptx-active' : ''}`}
          >
            <Presentation size={28} color={format === 'pptx' ? '#c084fc' : 'rgba(255,255,255,0.25)'} />
            <span className="fmt-name" style={{ color: format === 'pptx' ? '#d8b4fe' : 'rgba(255,255,255,0.7)' }}>PowerPoint</span>
            <p className="fmt-desc">Presentación ejecutiva</p>
          </button>
        </div>

        {/* Frameworks */}
        <label className="rp-section-label">Marcos normativos a incluir</label>
        <div className="fw-list">
          {ALL_FRAMEWORKS.map(fw => (
            <label key={fw} className="fw-row">
              <input
                type="checkbox"
                checked={frameworks.includes(fw)}
                onChange={() => toggleFw(fw)}
              />
              <span className="fw-row-name">{fw}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`btn-generate ${format}`}
        >
          {generating
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <Download size={16} />}
          {generating ? 'Generando…' : `Descargar ${format.toUpperCase()}`}
        </button>
      </div>
    </>
  )
}
