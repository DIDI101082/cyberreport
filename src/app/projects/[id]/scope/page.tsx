'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Globe, Server, Link2, Network, Tag,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react'

type ScopeType = 'ip' | 'domain' | 'url' | 'range' | 'other'

interface ScopeItem {
  id: string
  type: ScopeType
  value: string
  notes: string | null
  in_scope: boolean
  created_at: string
}

const TYPE_CONFIG: Record<ScopeType, { label: string; icon: React.ReactNode; color: string }> = {
  ip:     { label: 'IP',      icon: <Server  size={13} />, color: '#60a5fa' },
  domain: { label: 'Dominio', icon: <Globe   size={13} />, color: '#a78bfa' },
  url:    { label: 'URL',     icon: <Link2   size={13} />, color: '#34d399' },
  range:  { label: 'Rango',   icon: <Network size={13} />, color: '#fb923c' },
  other:  { label: 'Otro',    icon: <Tag     size={13} />, color: 'rgba(255,255,255,.4)' },
}

const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: 'ip',     label: 'Dirección IP' },
  { value: 'domain', label: 'Dominio' },
  { value: 'url',    label: 'URL' },
  { value: 'range',  label: 'Rango CIDR' },
  { value: 'other',  label: 'Otro' },
]

export default function ScopePage() {
  const params = useParams<{ id: string }>()

  const [items, setItems] = useState<ScopeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addType, setAddType] = useState<ScopeType>('domain')
  const [addValue, setAddValue] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addInScope, setAddInScope] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${params.id}/scope`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.scope ?? [])
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addValue.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch(`/api/projects/${params.id}/scope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: addType, value: addValue, notes: addNotes, in_scope: addInScope }),
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => [...prev, data.item])
      setAddValue('')
      setAddNotes('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al agregar')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/projects/${params.id}/scope?itemId=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
    setDeletingId(null)
  }

  async function handleToggle(item: ScopeItem) {
    const res = await fetch(`/api/projects/${params.id}/scope`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, in_scope: !item.in_scope }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, in_scope: !i.in_scope } : i))
    }
  }

  const inScope  = items.filter(i => i.in_scope)
  const outScope = items.filter(i => !i.in_scope)

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .sc { padding: 24px 28px; max-width: 740px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .sc-hdr { margin-bottom: 24px; }
        .sc-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
        .sc-sub { font-size: 13px; color: rgba(255,255,255,.35); margin: 0; }
        .sc-stats { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .sc-stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 12px 16px; min-width: 90px; }
        .sc-stat-num { font-size: 22px; font-weight: 800; margin: 0 0 2px; }
        .sc-stat-lbl { font-size: 11px; color: rgba(255,255,255,.35); margin: 0; }

        /* Add form */
        .add-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 13px; padding: 18px; margin-bottom: 24px; }
        .add-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.75); margin: 0 0 14px; display: flex; align-items: center; gap: 7px; }
        .add-row { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
        .add-select { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 9px 10px; font-size: 13px; color: #fff; font-family: inherit; outline: none; cursor: pointer; }
        .add-select option { background: #131f35; }
        .add-input { flex: 1; min-width: 200px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; transition: border-color .12s; }
        .add-input:focus { border-color: rgba(59,130,246,.5); }
        .add-input::placeholder { color: rgba(255,255,255,.25); }
        .add-notes { width: 100%; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #fff; font-family: inherit; outline: none; resize: none; margin-top: 8px; box-sizing: border-box; }
        .add-notes::placeholder { color: rgba(255,255,255,.25); }
        .add-bottom { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .scope-toggle { display: flex; gap: 5px; }
        .scope-btn { font-size: 11.5px; font-weight: 600; padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.4); cursor: pointer; font-family: inherit; transition: all .12s; }
        .scope-btn.in { background: rgba(74,222,128,.12); border-color: rgba(74,222,128,.3); color: #4ade80; }
        .scope-btn.out { background: rgba(248,113,113,.12); border-color: rgba(248,113,113,.3); color: #f87171; }
        .btn-add { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; background: rgba(37,99,235,.8); border: 1px solid rgba(59,130,246,.35); color: #fff; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all .12s; margin-left: auto; }
        .btn-add:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .btn-add:disabled { opacity: .5; cursor: not-allowed; }
        .add-err { font-size: 12px; color: #f87171; margin-top: 6px; }

        /* Items */
        .sc-section { margin-bottom: 20px; }
        .sc-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
        .sc-panel { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 11px; overflow: hidden; }
        .sc-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.05); }
        .sc-item:last-child { border-bottom: none; }
        .sc-type-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 5px; background: rgba(255,255,255,.06); white-space: nowrap; flex-shrink: 0; }
        .sc-value { font-size: 13px; font-weight: 500; font-family: 'SF Mono','Fira Code',monospace; color: rgba(255,255,255,.85); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sc-notes { font-size: 11.5px; color: rgba(255,255,255,.35); flex-shrink: 0; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sc-toggle-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,.3); padding: 4px; border-radius: 5px; transition: color .12s; flex-shrink: 0; display: flex; }
        .sc-toggle-btn:hover { color: rgba(255,255,255,.7); }
        .sc-del-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,.2); padding: 4px; border-radius: 5px; transition: color .12s; flex-shrink: 0; display: flex; }
        .sc-del-btn:hover { color: #f87171; }
        .sc-empty { padding: 32px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }
        .sc-loading { padding: 48px; text-align: center; color: rgba(255,255,255,.3); }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="sc">
        <Link href={`/projects/${params.id}`} className="back">
          <ArrowLeft size={14} /> Volver al proyecto
        </Link>

        <div className="sc-hdr">
          <h1 className="sc-title">Alcance del proyecto</h1>
          <p className="sc-sub">IPs, dominios, URLs y rangos que están dentro o fuera del scope</p>
        </div>

        {/* Stats */}
        <div className="sc-stats">
          <div className="sc-stat">
            <p className="sc-stat-num">{items.length}</p>
            <p className="sc-stat-lbl">Total</p>
          </div>
          <div className="sc-stat">
            <p className="sc-stat-num" style={{ color: '#4ade80' }}>{inScope.length}</p>
            <p className="sc-stat-lbl">En scope</p>
          </div>
          <div className="sc-stat">
            <p className="sc-stat-num" style={{ color: '#f87171' }}>{outScope.length}</p>
            <p className="sc-stat-lbl">Fuera de scope</p>
          </div>
        </div>

        {/* Add form */}
        <div className="add-card">
          <p className="add-title">
            <Plus size={14} color="rgba(255,255,255,.4)" />
            Agregar elemento al alcance
          </p>
          <form onSubmit={handleAdd}>
            <div className="add-row">
              <select
                className="add-select"
                value={addType}
                onChange={e => setAddType(e.target.value as ScopeType)}
              >
                {SCOPE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                required
                className="add-input"
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                placeholder={
                  addType === 'ip'     ? '192.168.1.100' :
                  addType === 'domain' ? 'app.ejemplo.com' :
                  addType === 'url'    ? 'https://app.ejemplo.com/api' :
                  addType === 'range'  ? '10.0.0.0/24' :
                  'Descripción'
                }
              />
            </div>
            <textarea
              className="add-notes"
              rows={2}
              value={addNotes}
              onChange={e => setAddNotes(e.target.value)}
              placeholder="Notas opcionales (ej: servidor de producción, incluye subdominios…)"
            />
            <div className="add-bottom">
              <div className="scope-toggle">
                <button
                  type="button"
                  className={`scope-btn${addInScope ? ' in' : ''}`}
                  onClick={() => setAddInScope(true)}
                >
                  ✓ En scope
                </button>
                <button
                  type="button"
                  className={`scope-btn${!addInScope ? ' out' : ''}`}
                  onClick={() => setAddInScope(false)}
                >
                  ✕ Fuera de scope
                </button>
              </div>
              <button type="submit" className="btn-add" disabled={adding || !addValue.trim()}>
                {adding ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                {adding ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
            {error && <p className="add-err">{error}</p>}
          </form>
        </div>

        {loading ? (
          <div className="sc-loading">
            <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
          </div>
        ) : (
          <>
            {/* In-scope items */}
            <div className="sc-section">
              <p className="sc-section-title">
                <CheckCircle2 size={12} color="#4ade80" />
                En scope ({inScope.length})
              </p>
              {inScope.length === 0 ? (
                <div className="sc-panel">
                  <div className="sc-empty">No hay elementos en scope todavía.</div>
                </div>
              ) : (
                <div className="sc-panel">
                  {inScope.map(item => {
                    const cfg = TYPE_CONFIG[item.type]
                    return (
                      <div key={item.id} className="sc-item">
                        <span className="sc-type-chip" style={{ color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="sc-value">{item.value}</span>
                        {item.notes && <span className="sc-notes" title={item.notes}>{item.notes}</span>}
                        <button
                          type="button"
                          className="sc-toggle-btn"
                          title="Mover fuera de scope"
                          onClick={() => handleToggle(item)}
                        >
                          <XCircle size={15} />
                        </button>
                        <button
                          type="button"
                          className="sc-del-btn"
                          title="Eliminar"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          {deletingId === item.id
                            ? <Loader2 size={14} className="spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Out-of-scope items */}
            {outScope.length > 0 && (
              <div className="sc-section">
                <p className="sc-section-title">
                  <XCircle size={12} color="#f87171" />
                  Fuera de scope ({outScope.length})
                </p>
                <div className="sc-panel">
                  {outScope.map(item => {
                    const cfg = TYPE_CONFIG[item.type]
                    return (
                      <div key={item.id} className="sc-item" style={{ opacity: 0.6 }}>
                        <span className="sc-type-chip" style={{ color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="sc-value">{item.value}</span>
                        {item.notes && <span className="sc-notes" title={item.notes}>{item.notes}</span>}
                        <button
                          type="button"
                          className="sc-toggle-btn"
                          title="Mover a en-scope"
                          onClick={() => handleToggle(item)}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="sc-del-btn"
                          title="Eliminar"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          {deletingId === item.id
                            ? <Loader2 size={14} className="spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
