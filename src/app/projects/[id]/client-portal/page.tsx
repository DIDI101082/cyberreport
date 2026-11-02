'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Copy, Link2, Eye, RefreshCw, CheckCircle2 } from 'lucide-react'

interface ClientToken {
  id: string
  token: string
  label: string
  expires_at: string | null
  created_at: string
  views: number
}

export default function ClientPortalPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [projectName, setProjectName] = useState('')
  const [tokens, setTokens] = useState<ClientToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [expires, setExpires] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', id).single()
    if (proj) setProjectName(proj.name)

    const { data } = await supabase
      .from('client_tokens')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    setTokens((data ?? []) as ClientToken[])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function createToken() {
    setCreating(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('client_tokens').insert({
      project_id: id,
      token,
      label: label.trim() || 'Acceso cliente',
      expires_at: expires || null,
      views: 0,
    })
    if (!error) {
      setLabel('')
      setExpires('')
      await load()
    }
    setCreating(false)
  }

  async function revokeToken(tokenId: string) {
    await supabase.from('client_tokens').delete().eq('id', tokenId)
    await load()
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/client/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <style>{`
        .cp-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .cp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .cp-back:hover { color: rgba(255,255,255,0.8); }
        .cp-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
        .cp-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin: 0 0 24px; }
        .info-box { background: rgba(37,99,235,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 11px; padding: 14px 16px; margin-bottom: 24px; display: flex; gap: 12px; align-items: flex-start; }
        .info-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0; }
        .create-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .create-title { font-size: 14px; font-weight: 600; margin: 0 0 14px; }
        .create-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .field-lbl { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0 0 6px; font-weight: 500; }
        .field-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 13px; border-radius: 9px; padding: 8px 12px; width: 100%; }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .create-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; transition: all 0.12s; }
        .create-btn:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tokens-list { display: flex; flex-direction: column; gap: 10px; }
        .token-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 16px 18px; display: flex; align-items: center; gap: 16px; }
        .token-icon { width: 38px; height: 38px; border-radius: 9px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .token-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 3px; }
        .token-url { font-size: 11px; font-family: monospace; color: rgba(255,255,255,0.35); margin: 0 0 3px; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .token-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
        .token-actions { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
        .tok-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid; transition: all 0.1s; text-decoration: none; }
        .tok-copy { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.65); }
        .tok-copy:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .tok-revoke { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.2); color: #f87171; }
        .tok-revoke:hover { background: rgba(239,68,68,0.12); }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-text { font-size: 13px; color: rgba(255,255,255,0.3); margin: 10px 0 0; }
      `}</style>

      <div className="cp-wrap">
        <Link href={`/projects/${id}`} className="cp-back">
          <ArrowLeft size={14} /> {projectName || 'Proyecto'}
        </Link>

        <h1 className="cp-title">Portal del Cliente</h1>
        <p className="cp-sub">Genera enlaces seguros de solo lectura para tus clientes</p>

        <div className="info-box">
          <Link2 size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
          <p className="info-text">
            Los enlaces de cliente permiten acceso de <strong>solo lectura</strong> al resumen del proyecto sin requerir inicio de sesión.
            Cada token tiene un identificador único y puede tener fecha de expiración.
            El cliente verá los hallazgos sin poder editarlos ni acceder a otros proyectos.
          </p>
        </div>

        {/* Crear token */}
        <div className="create-card">
          <p className="create-title">Crear nuevo enlace de acceso</p>
          <div className="create-fields">
            <div>
              <p className="field-lbl">Etiqueta (cliente)</p>
              <input
                className="field-input"
                placeholder="Ej: Acme Corp — Q4 2025"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
            <div>
              <p className="field-lbl">Expiración (opcional)</p>
              <input
                type="date"
                className="field-input"
                value={expires}
                onChange={e => setExpires(e.target.value)}
              />
            </div>
          </div>
          <button className="create-btn" onClick={createToken} disabled={creating}>
            <Link2 size={14} />
            {creating ? 'Generando…' : 'Generar enlace'}
          </button>
        </div>

        {/* Lista de tokens */}
        {loading ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Cargando…</p>
        ) : tokens.length === 0 ? (
          <div className="empty-state">
            <Eye size={36} color="rgba(255,255,255,0.08)" />
            <p className="empty-text">No hay enlaces activos.</p>
            <p className="empty-text">Crea el primero para compartir el proyecto con tu cliente.</p>
          </div>
        ) : (
          <div className="tokens-list">
            {tokens.map(t => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/client/${t.token}` : `/client/${t.token}`
              const expired = t.expires_at ? new Date(t.expires_at) < new Date() : false
              return (
                <div key={t.id} className="token-card" style={expired ? { opacity: 0.5 } : {}}>
                  <div className="token-icon">
                    <Eye size={16} color="#34d399" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="token-label">
                      {t.label}
                      {expired && <span style={{ marginLeft: 8, fontSize: 11, color: '#f87171', fontWeight: 600 }}>EXPIRADO</span>}
                    </p>
                    <p className="token-url">/client/{t.token}</p>
                    <p className="token-meta">
                      Creado {new Date(t.created_at).toLocaleDateString('es')}
                      {t.expires_at && ` · Expira ${new Date(t.expires_at).toLocaleDateString('es')}`}
                      {` · ${t.views ?? 0} visitas`}
                    </p>
                  </div>
                  <div className="token-actions">
                    <button className="tok-btn tok-copy" onClick={() => copyLink(t.token)}>
                      {copied === t.token ? <CheckCircle2 size={13} color="#4ade80" /> : <Copy size={13} />}
                      {copied === t.token ? 'Copiado' : 'Copiar URL'}
                    </button>
                    <a
                      href={`/client/${t.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tok-btn tok-copy"
                    >
                      <Eye size={13} />
                      Vista previa
                    </a>
                    <button className="tok-btn tok-revoke" onClick={() => revokeToken(t.id)}>
                      Revocar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
