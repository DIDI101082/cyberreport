'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, FolderOpen, Plus, ChevronRight, Shield, TrendingUp, AlertCircle } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'agency'
  is_active: boolean
  created_at: string
  user_count: number
  project_count: number
}

const PLAN_CFG = {
  starter:      { label: 'Starter',      color: 'rgba(255,255,255,.45)', bg: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)' },
  professional: { label: 'Professional', color: '#60a5fa',               bg: 'rgba(37,99,235,.12)',   border: 'rgba(59,130,246,.25)'  },
  agency:       { label: 'Agency',       color: '#c084fc',               bg: 'rgba(124,58,237,.12)',  border: 'rgba(167,139,250,.25)' },
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form,    setForm]    = useState({ name: '', slug: '', plan: 'starter' })
  const [saving,  setSaving]  = useState(false)

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/admin/tenants')
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Error')
    else setTenants(json.tenants ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowNew(false); setForm({ name: '', slug: '', plan: 'starter' }); load() }
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  const totalUsers    = tenants.reduce((s, t) => s + t.user_count, 0)
  const totalProjects = tenants.reduce((s, t) => s + t.project_count, 0)
  const activeCount   = tenants.filter(t => t.is_active).length

  return (
    <>
      <style>{`
        .adm { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; max-width: 1000px; }
        .adm-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .adm-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
        .adm-sub { font-size: 13px; color: rgba(255,255,255,.4); margin: 0; }
        .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; font-family: inherit; transition: all .15s; }
        .btn-primary:hover { background: rgba(37,99,235,1); }

        /* Stats */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 16px 18px; }
        .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); margin: 0 0 8px; }
        .stat-value { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 2px; }
        .stat-hint { font-size: 11px; color: rgba(255,255,255,.3); margin: 0; }

        /* Search */
        .search-row { display: flex; gap: 10px; margin-bottom: 16px; }
        .search-input { flex: 1; padding: 9px 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 9px; color: #fff; font-size: 13px; font-family: inherit; outline: none; }
        .search-input:focus { border-color: rgba(96,165,250,.4); }
        .search-input::placeholder { color: rgba(255,255,255,.25); }

        /* Tenants list */
        .list-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
        .list-hdr { display: grid; grid-template-columns: 1fr 100px 80px 80px 100px 36px; gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .hdr-cell { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); }
        .tenant-row { display: grid; grid-template-columns: 1fr 100px 80px 80px 100px 36px; gap: 12px; align-items: center; padding: 13px 18px; border-bottom: 1px solid rgba(255,255,255,.05); transition: background .1s; }
        .tenant-row:last-child { border-bottom: none; }
        .tenant-row:hover { background: rgba(255,255,255,.025); }
        .tenant-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.85); margin: 0 0 2px; }
        .tenant-slug { font-size: 11px; color: rgba(255,255,255,.3); font-family: monospace; margin: 0; }
        .plan-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; border: 1px solid; white-space: nowrap; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .cell-num { font-size: 13px; color: rgba(255,255,255,.65); display: flex; align-items: center; gap: 5px; }
        .cell-action { display: flex; align-items: center; justify-content: center; }
        .empty-state { padding: 48px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }

        /* Modal */
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
        .modal-box { background: #131f35; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; width: 100%; max-width: 400px; padding: 24px; }
        .modal-title { font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 20px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
        .form-input { width: 100%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; }
        .form-input:focus { border-color: rgba(59,130,246,.5); }
        .form-input option { background: #131f35; }
        .form-footer { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.6); font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; }
        .btn-cancel:hover { background: rgba(255,255,255,.1); }
        .btn-save { flex: 1; padding: 10px; background: rgba(37,99,235,.85); border: 1px solid rgba(59,130,246,.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; }
        .btn-save:disabled { opacity: .5; cursor: not-allowed; }

        .err-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.25); border-radius: 10px; font-size: 13px; color: #f87171; margin-bottom: 20px; }
      `}</style>

      <div className="adm">
        <div className="adm-header">
          <div>
            <h1 className="adm-title">
              <Shield size={18} style={{ display: 'inline', marginRight: 8, color: '#60a5fa' }} />
              Super Admin
            </h1>
            <p className="adm-sub">Gestión global de tenants y suscripciones</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nuevo tenant
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {[
            { label: 'Tenants',  value: tenants.length, hint: `${activeCount} activos`, icon: Building2 },
            { label: 'Usuarios', value: totalUsers,      hint: 'en todos los tenants', icon: Users },
            { label: 'Proyectos',value: totalProjects,   hint: 'en total', icon: FolderOpen },
            { label: 'Activos',  value: activeCount,     hint: `${tenants.length - activeCount} suspendidos`, icon: TrendingUp },
          ].map(({ label, value, hint }) => (
            <div key={label} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{loading ? '…' : value}</p>
              <p className="stat-hint">{hint}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="err-banner">
            <AlertCircle size={15} /> {error}
            {error.includes('permisos') && ' — Esta sección es solo para super_admin.'}
          </div>
        )}

        {/* Search */}
        <div className="search-row">
          <input
            className="search-input"
            placeholder="Buscar tenant por nombre o slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="list-panel">
          <div className="list-hdr">
            <span className="hdr-cell">Tenant</span>
            <span className="hdr-cell">Plan</span>
            <span className="hdr-cell">Usuarios</span>
            <span className="hdr-cell">Proyectos</span>
            <span className="hdr-cell">Estado</span>
            <span className="hdr-cell"></span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando tenants…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {search ? 'Sin resultados para tu búsqueda.' : 'No hay tenants registrados.'}
            </div>
          ) : (
            filtered.map(t => {
              const plan = PLAN_CFG[t.plan] ?? PLAN_CFG.starter
              return (
                <div key={t.id} className="tenant-row">
                  <div>
                    <p className="tenant-name">{t.name}</p>
                    <p className="tenant-slug">{t.slug}</p>
                  </div>
                  <div>
                    <span
                      className="plan-badge"
                      style={{ color: plan.color, background: plan.bg, borderColor: plan.border }}
                    >
                      {plan.label}
                    </span>
                  </div>
                  <div className="cell-num">
                    <Users size={12} color="rgba(255,255,255,.3)" />
                    {t.user_count}
                  </div>
                  <div className="cell-num">
                    <FolderOpen size={12} color="rgba(255,255,255,.3)" />
                    {t.project_count}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      className="status-dot"
                      style={{ background: t.is_active ? '#4ade80' : '#f87171' }}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                      {t.is_active ? 'Activo' : 'Suspendido'}
                    </span>
                  </div>
                  <div className="cell-action">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* New tenant modal */}
      {showNew && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}>
          <div className="modal-box">
            <h2 className="modal-title">Nuevo tenant</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  required
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') }))}
                  placeholder="Empresa S.A."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Slug *</label>
                <input
                  required
                  className="form-input"
                  style={{ fontFamily: 'monospace' }}
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  placeholder="empresa-sa"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select className="form-input" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="agency">Agency</option>
                </select>
              </div>
              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowNew(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Creando…' : 'Crear tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
