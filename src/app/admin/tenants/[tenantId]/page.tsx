'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, FolderOpen, Building2, AlertCircle, Check, X } from 'lucide-react'

interface TenantUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'agency'
  is_active: boolean
  created_at: string
}

const PLAN_CFG = {
  starter:      { label: 'Starter',      color: 'rgba(255,255,255,.45)', bg: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)' },
  professional: { label: 'Professional', color: '#60a5fa',               bg: 'rgba(37,99,235,.12)',   border: 'rgba(59,130,246,.25)'  },
  agency:       { label: 'Agency',       color: '#c084fc',               bg: 'rgba(124,58,237,.12)',  border: 'rgba(167,139,250,.25)' },
}

const ROLES = ['member', 'viewer', 'admin', 'super_admin']

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const router = useRouter()

  const [tenant,  setTenant]  = useState<Tenant | null>(null)
  const [users,   setUsers]   = useState<TenantUser[]>([])
  const [projCnt, setProjCnt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Edit tenant form
  const [editing,  setEditing]  = useState(false)
  const [editForm, setEditForm] = useState({ name: '', plan: 'starter', is_active: true })
  const [saving,   setSaving]   = useState(false)

  // User role edit
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [userRole,    setUserRole]    = useState('')

  async function load() {
    setLoading(true)
    const res  = await fetch(`/api/admin/tenants/${tenantId}`)
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setLoading(false); return }
    setTenant(json.tenant)
    setUsers(json.users ?? [])
    setProjCnt(json.project_count ?? 0)
    setEditForm({ name: json.tenant.name, plan: json.tenant.plan, is_active: json.tenant.is_active })
    setLoading(false)
  }

  useEffect(() => { load() }, [tenantId])

  async function handleSaveTenant(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    setEditing(false)
    load()
  }

  async function handleSaveRole(userId: string) {
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: userRole }),
    })
    setEditingUser(null)
    load()
  }

  async function handleToggleUser(userId: string, currentActive: boolean) {
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    })
    load()
  }

  if (loading) return <div style={{ padding: 32, color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Cargando…</div>
  if (error)   return (
    <div style={{ padding: 32, color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertCircle size={15} /> {error}
    </div>
  )
  if (!tenant) return null

  const plan = PLAN_CFG[tenant.plan] ?? PLAN_CFG.starter

  return (
    <>
      <style>{`
        .td { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; max-width: 900px; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,.35); text-decoration: none; margin-bottom: 20px; }
        .back-link:hover { color: rgba(255,255,255,.65); }
        .td-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .td-name { font-size: 20px; font-weight: 700; margin: 0 0 6px; display: flex; align-items: center; gap: 10px; }
        .td-slug { font-size: 12px; color: rgba(255,255,255,.3); font-family: monospace; margin: 0; }
        .btn-sm { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid; }
        .btn-edit { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.65); }
        .btn-edit:hover { background: rgba(255,255,255,.1); color: #fff; }
        .btn-primary { background: rgba(37,99,235,.85); border-color: rgba(59,130,246,.4); color: #fff; }
        .btn-primary:hover { background: rgba(37,99,235,1); }
        .btn-danger { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #f87171; }
        .btn-danger:hover { background: rgba(239,68,68,.2); }

        /* Stats row */
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
        .stat-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(37,99,235,.12); flex-shrink: 0; }
        .stat-info { flex: 1; }
        .stat-val { font-size: 22px; font-weight: 800; color: #fff; margin: 0; }
        .stat-lbl { font-size: 11px; color: rgba(255,255,255,.3); margin: 0; }

        /* Edit form */
        .edit-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 14px; padding: 20px; margin-bottom: 24px; }
        .edit-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.75); margin: 0 0 16px; }
        .edit-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.3); }
        .form-input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 7px 11px; font-size: 13px; color: #fff; font-family: inherit; outline: none; }
        .form-input:focus { border-color: rgba(59,130,246,.5); }
        .form-input option { background: #131f35; }
        .form-footer { display: flex; gap: 8px; margin-top: 4px; }

        /* Users table */
        .section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.8); margin: 0 0 12px; }
        .users-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
        .users-hdr { display: grid; grid-template-columns: 1fr 1fr 120px 80px 80px; gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .hdr-cell { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.25); }
        .user-row { display: grid; grid-template-columns: 1fr 1fr 120px 80px 80px; gap: 12px; align-items: center; padding: 11px 18px; border-bottom: 1px solid rgba(255,255,255,.05); }
        .user-row:last-child { border-bottom: none; }
        .user-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.8); margin: 0; }
        .user-email { font-size: 11px; color: rgba(255,255,255,.3); margin: 0; font-family: monospace; }
        .role-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.07); color: rgba(255,255,255,.55); white-space: nowrap; }
        .role-badge.super_admin { color: #c084fc; background: rgba(124,58,237,.12); border-color: rgba(167,139,250,.25); }
        .role-badge.admin { color: #60a5fa; background: rgba(37,99,235,.12); border-color: rgba(59,130,246,.25); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; }
        .role-select { background: rgba(255,255,255,.06); border: 1px solid rgba(59,130,246,.5); border-radius: 7px; padding: 4px 8px; font-size: 12px; color: #fff; font-family: inherit; outline: none; }
        .role-select option { background: #131f35; }
        .icon-btn { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: none; cursor: pointer; color: rgba(255,255,255,.4); flex-shrink: 0; }
        .icon-btn:hover { background: rgba(255,255,255,.08); color: rgba(255,255,255,.8); }
        .icon-btn.danger:hover { background: rgba(239,68,68,.15); color: #f87171; border-color: rgba(239,68,68,.3); }
        .icon-btn.success:hover { background: rgba(74,222,128,.15); color: #4ade80; border-color: rgba(74,222,128,.3); }
        .actions { display: flex; gap: 5px; align-items: center; }
        .empty-state { padding: 40px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }
      `}</style>

      <div className="td">
        <Link href="/admin" className="back-link">
          <ArrowLeft size={12} /> Volver a tenants
        </Link>

        <div className="td-header">
          <div>
            <h1 className="td-name">
              <Building2 size={18} color="#60a5fa" />
              {tenant.name}
              <span
                className="plan-badge"
                style={{ color: plan.color, background: plan.bg, borderColor: plan.border, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, border: '1px solid', display: 'inline-flex' }}
              >
                {plan.label}
              </span>
            </h1>
            <p className="td-slug">{tenant.slug}</p>
          </div>
          <button className="btn-sm btn-edit" onClick={() => setEditing(e => !e)}>
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon"><Users size={15} color="#60a5fa" /></div>
            <div className="stat-info">
              <p className="stat-val">{users.length}</p>
              <p className="stat-lbl">Usuarios</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FolderOpen size={15} color="#c084fc" /></div>
            <div className="stat-info">
              <p className="stat-val">{projCnt}</p>
              <p className="stat-lbl">Proyectos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: tenant.is_active ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)' }}>
              {tenant.is_active
                ? <Check size={15} color="#4ade80" />
                : <X size={15} color="#f87171" />
              }
            </div>
            <div className="stat-info">
              <p className="stat-val" style={{ fontSize: 15, fontWeight: 700, color: tenant.is_active ? '#4ade80' : '#f87171' }}>
                {tenant.is_active ? 'Activo' : 'Suspendido'}
              </p>
              <p className="stat-lbl">Estado del tenant</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="edit-panel">
            <p className="edit-title">Editar tenant</p>
            <form onSubmit={handleSaveTenant}>
              <div className="edit-row">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: 200 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select className="form-input" value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="agency">Agency</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={String(editForm.is_active)} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                    <option value="true">Activo</option>
                    <option value="false">Suspendido</option>
                  </select>
                </div>
                <div className="form-footer">
                  <button type="submit" className="btn-sm btn-primary" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Users table */}
        <p className="section-title">Usuarios del tenant</p>
        <div className="users-panel">
          <div className="users-hdr">
            <span className="hdr-cell">Usuario</span>
            <span className="hdr-cell">Email</span>
            <span className="hdr-cell">Rol</span>
            <span className="hdr-cell">Estado</span>
            <span className="hdr-cell">Acciones</span>
          </div>

          {users.length === 0 ? (
            <div className="empty-state">Sin usuarios en este tenant.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="user-row">
                <div>
                  <p className="user-name">{u.full_name ?? '—'}</p>
                </div>
                <div>
                  <p className="user-email">{u.email ?? '—'}</p>
                </div>
                <div>
                  {editingUser === u.id ? (
                    <select
                      className="role-select"
                      value={userRole}
                      onChange={e => setUserRole(e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="status-dot" style={{ background: u.is_active ? '#4ade80' : '#f87171' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="actions">
                  {editingUser === u.id ? (
                    <>
                      <button className="icon-btn success" onClick={() => handleSaveRole(u.id)} title="Guardar">
                        <Check size={12} />
                      </button>
                      <button className="icon-btn" onClick={() => setEditingUser(null)} title="Cancelar">
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-btn"
                        title="Cambiar rol"
                        onClick={() => { setEditingUser(u.id); setUserRole(u.role) }}
                        style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}
                      >
                        rol
                      </button>
                      <button
                        className={`icon-btn ${u.is_active ? 'danger' : 'success'}`}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggleUser(u.id, u.is_active)}
                      >
                        {u.is_active ? <X size={11} /> : <Check size={11} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
