'use client'

import { useEffect, useState } from 'react'
import { Users, Check, X, AlertCircle } from 'lucide-react'

interface OrgUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

const ROLES = ['viewer', 'member', 'admin']

const ROLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  super_admin: { color: '#c084fc', bg: 'rgba(124,58,237,.12)', border: 'rgba(167,139,250,.25)' },
  admin:       { color: '#60a5fa', bg: 'rgba(37,99,235,.12)',  border: 'rgba(59,130,246,.25)' },
  member:      { color: 'rgba(255,255,255,.65)', bg: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)' },
  viewer:      { color: 'rgba(255,255,255,.35)', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)' },
}

export default function SettingsUsersPage() {
  const [users,       setUsers]       = useState<OrgUser[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [userRole,    setUserRole]    = useState('')
  const [saving,      setSaving]      = useState(false)

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/settings/users')
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Error')
    else setUsers(json.users ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveRole(userId: string) {
    setSaving(true)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: userRole }),
    })
    setSaving(false)
    setEditingUser(null)
    load()
  }

  async function handleToggle(userId: string, current: boolean) {
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    load()
  }

  const activeCount = users.filter(u => u.is_active).length

  return (
    <>
      <style>{`
        .su { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; max-width: 860px; }
        .su-header { margin-bottom: 24px; }
        .su-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; display: flex; align-items: center; gap: 9px; }
        .su-sub { font-size: 13px; color: rgba(255,255,255,.35); margin: 0; }
        .su-stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .su-stat { font-size: 12px; color: rgba(255,255,255,.4); }
        .su-stat strong { color: rgba(255,255,255,.8); font-size: 15px; font-weight: 700; margin-right: 4px; }

        .err-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.25); border-radius: 10px; font-size: 13px; color: #f87171; margin-bottom: 20px; }

        /* Table */
        .users-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
        .users-hdr { display: grid; grid-template-columns: 1fr 1fr 130px 90px 90px; gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .hdr-cell { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.25); }
        .user-row { display: grid; grid-template-columns: 1fr 1fr 130px 90px 90px; gap: 12px; align-items: center; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,.05); }
        .user-row:last-child { border-bottom: none; }
        .user-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.8); margin: 0 0 1px; }
        .user-id { font-size: 10px; color: rgba(255,255,255,.2); font-family: monospace; margin: 0; }
        .user-email { font-size: 12px; color: rgba(255,255,255,.4); font-family: monospace; }
        .role-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; border: 1px solid; white-space: nowrap; }
        .role-select { background: rgba(255,255,255,.06); border: 1px solid rgba(59,130,246,.5); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: #fff; font-family: inherit; outline: none; }
        .role-select option { background: #131f35; }
        .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,.4); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .actions { display: flex; gap: 6px; align-items: center; }
        .icon-btn { display: flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); cursor: pointer; font-size: 11px; font-weight: 600; color: rgba(255,255,255,.4); font-family: inherit; gap: 4px; white-space: nowrap; }
        .icon-btn:hover { background: rgba(255,255,255,.09); color: rgba(255,255,255,.8); }
        .icon-btn.danger:hover { background: rgba(239,68,68,.12); color: #f87171; border-color: rgba(239,68,68,.3); }
        .icon-btn.success:hover { background: rgba(74,222,128,.12); color: #4ade80; border-color: rgba(74,222,128,.3); }
        .icon-btn:disabled { opacity: .5; cursor: not-allowed; }
        .empty-state { padding: 48px; text-align: center; color: rgba(255,255,255,.2); font-size: 13px; }

        /* Settings nav */
        .settings-nav { display: flex; gap: 2px; margin-bottom: 24px; }
        .snav-link { padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.4); text-decoration: none; }
        .snav-link:hover { color: rgba(255,255,255,.75); background: rgba(255,255,255,.05); }
        .snav-link.active { color: #fff; background: rgba(37,99,235,.25); }
      `}</style>

      <div className="su">
        <div className="su-header">
          <h1 className="su-title">
            <Users size={18} color="#60a5fa" />
            Gestión de Usuarios
          </h1>
          <p className="su-sub">Administrá los miembros de tu organización</p>
        </div>

        {/* Settings nav */}
        <div className="settings-nav">
          <a href="/settings" className="snav-link">General</a>
          <a href="/settings/users" className="snav-link active">Usuarios</a>
          <a href="/settings/organization" className="snav-link">Organización</a>
        </div>

        {error && (
          <div className="err-banner">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {!error && (
          <div className="su-stats">
            <div className="su-stat"><strong>{users.length}</strong>usuarios totales</div>
            <div className="su-stat"><strong>{activeCount}</strong>activos</div>
            <div className="su-stat"><strong>{users.length - activeCount}</strong>inactivos</div>
          </div>
        )}

        <div className="users-panel">
          <div className="users-hdr">
            <span className="hdr-cell">Nombre</span>
            <span className="hdr-cell">Email</span>
            <span className="hdr-cell">Rol</span>
            <span className="hdr-cell">Estado</span>
            <span className="hdr-cell">Acciones</span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando usuarios…</div>
          ) : users.length === 0 ? (
            <div className="empty-state">No hay usuarios en tu organización.</div>
          ) : (
            users.map(u => {
              const roleCfg = ROLE_CFG[u.role] ?? ROLE_CFG.member
              return (
                <div key={u.id} className="user-row">
                  <div>
                    <p className="user-name">{u.full_name ?? 'Sin nombre'}</p>
                    <p className="user-id">{u.id.slice(0, 8)}…</p>
                  </div>
                  <div className="user-email">{u.email ?? '—'}</div>
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
                      <span
                        className="role-badge"
                        style={{ color: roleCfg.color, background: roleCfg.bg, borderColor: roleCfg.border }}
                      >
                        {u.role}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="status-pill">
                      <span className="status-dot" style={{ background: u.is_active ? '#4ade80' : '#f87171' }} />
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                  <div className="actions">
                    {editingUser === u.id ? (
                      <>
                        <button className="icon-btn success" disabled={saving} onClick={() => handleSaveRole(u.id)}>
                          <Check size={11} /> {saving ? '…' : 'OK'}
                        </button>
                        <button className="icon-btn" onClick={() => setEditingUser(null)}>
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="icon-btn"
                          onClick={() => { setEditingUser(u.id); setUserRole(u.role) }}
                        >
                          Rol
                        </button>
                        <button
                          className={`icon-btn ${u.is_active ? 'danger' : 'success'}`}
                          onClick={() => handleToggle(u.id, u.is_active)}
                        >
                          {u.is_active ? <><X size={10} /> Deactivar</> : <><Check size={10} /> Activar</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
