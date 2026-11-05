'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, FileText, Plus, Paperclip,
} from 'lucide-react'

interface Retest {
  id: string
  finding_id: string
  result: 'pass' | 'fail' | 'partial'
  notes: string | null
  retested_by: string | null
  retested_at: string
}

interface Finding {
  id: string
  title: string
  severity: string
  status: string
  project_id: string
}

const RESULT_CFG = {
  pass:    { label: 'Verificado — Resuelto', color: '#4ade80', bg: 'rgba(74,222,128,.12)', border: 'rgba(74,222,128,.3)',  icon: <CheckCircle2 size={14} /> },
  fail:    { label: 'Falla — Persiste',      color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.3)', icon: <XCircle size={14} /> },
  partial: { label: 'Parcialmente resuelto', color: '#facc15', bg: 'rgba(250,204,21,.12)', border: 'rgba(250,204,21,.3)',  icon: <AlertTriangle size={14} /> },
}

const STATUS_MAP: Record<string, string> = {
  pass:    'resolved',
  fail:    'open',
  partial: 'in_review',
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: 'rgba(255,255,255,.4)',
}

export default function RetestPage() {
  const params   = useParams<{ id: string; findingId: string }>()
  const supabase = createClient()

  const [finding,      setFinding]      = useState<Finding | null>(null)
  const [retests,      setRetests]      = useState<Retest[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [result,       setResult]       = useState<'pass'|'fail'|'partial'>('fail')
  const [notes,        setNotes]        = useState('')
  const [retestedBy,   setRetestedBy]   = useState('')
  const [updateStatus, setUpdateStatus] = useState(true)

  const load = useCallback(async () => {
    const [fRes, rRes] = await Promise.all([
      supabase.from('findings').select('id, title, severity, status, project_id').eq('id', params.findingId).single(),
      supabase.from('finding_retests').select('*').eq('finding_id', params.findingId).order('retested_at', { ascending: false }),
    ])
    setFinding(fRes.data as Finding)
    setRetests((rRes.data ?? []) as Retest[])
    setLoading(false)
  }, [params.findingId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finding) return
    setSaving(true)

    const { error } = await supabase.from('finding_retests').insert({
      finding_id:  finding.id,
      result,
      notes:       notes.trim() || null,
      retested_by: retestedBy.trim() || null,
    })

    if (!error && updateStatus) {
      await supabase.from('findings').update({
        status:     STATUS_MAP[result],
        updated_at: new Date().toISOString(),
      }).eq('id', finding.id)
      setFinding(f => f ? { ...f, status: STATUS_MAP[result] } : f)
    }

    if (!error) {
      const { data } = await supabase.from('finding_retests').select('*').eq('finding_id', params.findingId).order('retested_at', { ascending: false })
      setRetests((data ?? []) as Retest[])
      setNotes('')
      setRetestedBy('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontFamily: 'system-ui' }}>Cargando…</div>
  )
  if (!finding) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.4)', fontFamily: 'system-ui' }}>
      Hallazgo no encontrado. <Link href={`/projects/${params.id}/findings`} style={{ color: '#60a5fa' }}>Volver</Link>
    </div>
  )

  return (
    <>
      <style>{`
        .rt { padding: 24px 28px; max-width: 720px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .rt-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
        .rt-sub { font-size: 12px; color: rgba(255,255,255,.3); margin: 0 0 24px; }

        .finding-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; margin-bottom: 24px; max-width: 100%; }
        .finding-pill-sev { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
        .finding-pill-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .form-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 22px; margin-bottom: 24px; }
        .form-title { font-size: 14px; font-weight: 700; margin: 0 0 18px; color: rgba(255,255,255,.85); display: flex; align-items: center; gap: 8px; }
        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,.45); margin-bottom: 7px; }

        .result-opts { display: flex; gap: 8px; flex-wrap: wrap; }
        .result-opt { flex: 1; min-width: 130px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); cursor: pointer; transition: all .12s; display: flex; align-items: center; gap: 9px; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.45); }
        .result-opt.selected { color: var(--rc); border-color: var(--rb); background: var(--rbg); }
        .result-opt:hover:not(.selected) { background: rgba(255,255,255,.07); }

        .rt-input { width: 100%; padding: 10px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06); color: #fff; font-size: 13px; font-family: inherit; outline: none; transition: border-color .12s; box-sizing: border-box; }
        .rt-input::placeholder { color: rgba(255,255,255,.25); }
        .rt-input:focus { border-color: rgba(96,165,250,.5); }
        textarea.rt-input { resize: vertical; min-height: 90px; line-height: 1.6; }

        .check-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 9px; cursor: pointer; }
        .check-box { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(255,255,255,.04); transition: all .1s; }
        .check-box.on { background: rgba(37,99,235,.8); border-color: #3b82f6; }
        .check-text { font-size: 13px; color: rgba(255,255,255,.65); }

        .submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 10px; background: rgba(16,185,129,.8); border: 1px solid rgba(16,185,129,.3); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .12s; margin-top: 4px; font-family: inherit; }
        .submit-btn:hover:not(:disabled) { background: rgba(16,185,129,1); }
        .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

        .success-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.25); border-radius: 10px; font-size: 13px; color: #4ade80; margin-bottom: 16px; }

        .hist-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
        .hist-empty { font-size: 13px; color: rgba(255,255,255,.25); font-style: italic; padding: 16px 0; }
        .hist-item { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; padding: 14px 16px; margin-bottom: 8px; border-left: 3px solid; }
        .hist-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .hist-result { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 5px; }
        .hist-date { font-size: 11px; color: rgba(255,255,255,.3); margin-left: auto; }
        .hist-by { font-size: 11px; color: rgba(255,255,255,.35); display: flex; align-items: center; gap: 4px; }
        .hist-notes { font-size: 12.5px; color: rgba(255,255,255,.55); line-height: 1.5; margin-top: 8px; white-space: pre-wrap; }
      `}</style>

      <div className="rt">
        <Link href={`/projects/${params.id}/findings`} className="back">
          <ArrowLeft size={14} /> Volver a hallazgos
        </Link>

        <h1 className="rt-title">Retesting</h1>
        <p className="rt-sub">Registrá el resultado de la verificación del hallazgo</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <div className="finding-pill" style={{ marginBottom: 0 }}>
            <span
              className="finding-pill-sev"
              style={{ background: `${SEV_COLORS[finding.severity] ?? '#6b7280'}22`, color: SEV_COLORS[finding.severity] ?? '#6b7280' }}
            >
              {finding.severity}
            </span>
            <span className="finding-pill-title">{finding.title}</span>
          </div>
          <Link
            href={`/projects/${params.id}/findings/${params.findingId}/evidence`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.25)',
              borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: '#93c5fd',
              textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all .12s',
            }}
          >
            <Paperclip size={13} /> Ver evidencias
          </Link>
        </div>

        {success && (
          <div className="success-banner">
            <CheckCircle2 size={15} /> Retest registrado correctamente
          </div>
        )}

        <div className="form-card">
          <p className="form-title">
            <Plus size={15} color="rgba(255,255,255,.4)" /> Nuevo retest
          </p>
          <form onSubmit={handleSubmit}>
            {/* Resultado */}
            <div className="field">
              <label className="field-label">Resultado de la verificación</label>
              <div className="result-opts">
                {(Object.entries(RESULT_CFG) as [keyof typeof RESULT_CFG, (typeof RESULT_CFG)[keyof typeof RESULT_CFG]][]).map(([key, cfg]) => (
                  <div
                    key={key}
                    className={`result-opt${result === key ? ' selected' : ''}`}
                    style={{ '--rc': cfg.color, '--rb': cfg.border, '--rbg': cfg.bg } as React.CSSProperties}
                    onClick={() => setResult(key)}
                  >
                    <span style={{ color: result === key ? cfg.color : 'rgba(255,255,255,.3)' }}>{cfg.icon}</span>
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Responsable */}
            <div className="field">
              <label className="field-label">
                <User size={11} style={{ display: 'inline', marginRight: 4 }} />
                Responsable del retest
              </label>
              <input
                type="text"
                className="rt-input"
                placeholder="Nombre del pentester"
                value={retestedBy}
                onChange={e => setRetestedBy(e.target.value)}
              />
            </div>

            {/* Notas */}
            <div className="field">
              <label className="field-label">
                <FileText size={11} style={{ display: 'inline', marginRight: 4 }} />
                Notas / Evidencia
              </label>
              <textarea
                className="rt-input"
                placeholder="Describí qué se probó, cómo, y cuál fue el resultado. Podés incluir URLs, payloads, o pasos de reproducción."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Actualizar status */}
            <div className="field">
              <div className="check-row" onClick={() => setUpdateStatus(v => !v)}>
                <div className={`check-box${updateStatus ? ' on' : ''}`}>
                  {updateStatus && <CheckCircle2 size={11} color="#fff" />}
                </div>
                <span className="check-text">
                  Actualizar estado del hallazgo automáticamente
                  {' '}→{' '}
                  <strong style={{ color: RESULT_CFG[result].color }}>
                    {result === 'pass' ? 'Resuelto' : result === 'fail' ? 'Abierto' : 'En revisión'}
                  </strong>
                </span>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={saving}>
              <RefreshCw size={15} />
              {saving ? 'Guardando…' : 'Registrar retest'}
            </button>
          </form>
        </div>

        {/* Historial */}
        <div>
          <p className="hist-title">
            <Clock size={12} /> Historial ({retests.length})
          </p>
          {retests.length === 0 ? (
            <p className="hist-empty">Sin retests previos para este hallazgo.</p>
          ) : (
            retests.map(r => {
              const cfg = RESULT_CFG[r.result]
              return (
                <div key={r.id} className="hist-item" style={{ borderLeftColor: cfg.border }}>
                  <div className="hist-head">
                    <span className="hist-result" style={{ color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {r.retested_by && (
                      <span className="hist-by">
                        <User size={10} /> {r.retested_by}
                      </span>
                    )}
                    <span className="hist-date">
                      {new Date(r.retested_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {r.notes && <p className="hist-notes">{r.notes}</p>}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
