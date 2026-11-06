'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, X, Globe } from 'lucide-react'
import type { Organization } from '@/types'

export default function OrganizationsPage() {
  const supabase = createClient()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact_email: '', industry: '', contact_name: '' })
  const [saving, setSaving] = useState(false)

  async function getTenantId() {
    const { data, error } = await supabase.rpc('get_my_tenant_id')
    if (error || !data) return null
    return data as string
  }

  async function fetchOrgs() {
    const tenantId = await getTenantId()
    if (!tenantId) return
    const { data } = await supabase.from('organizations').select('*').eq('tenant_id', tenantId).order('name')
    if (data) setOrgs(data)
  }

  useEffect(() => { fetchOrgs() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const tenantId = await getTenantId()
    await supabase.from('organizations').insert({ ...form, tenant_id: tenantId })
    setForm({ name: '', contact_email: '', industry: '', contact_name: '' })
    setShowForm(false)
    setSaving(false)
    fetchOrgs()
  }

  return (
    <>
      <style>{`
        .pg-wrap { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .pg-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .pg-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pg-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
        .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-primary:hover { background: rgba(37,99,235,1); }
        .list-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
        .org-row { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .org-row:last-child { border-bottom: none; }
        .org-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(124,58,237,0.2); border: 1px solid rgba(167,139,250,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .org-name { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9); margin: 0 0 3px; }
        .org-meta { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0; }
        .empty-box { padding: 64px 20px; text-align: center; }
        .empty-text { color: rgba(255,255,255,0.3); font-size: 13px; margin: 12px 0 0; }
        /* Modal */
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
        .modal-box { background: #131f35; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; width: 100%; max-width: 420px; padding: 24px; }
        .modal-title { font-size: 16px; font-weight: 700; color: #fff; margin: 0; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .modal-close { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .modal-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .form-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; }
        .form-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .form-input option { background: #131f35; color: #fff; }
        .form-footer { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; }
        .btn-cancel:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .btn-save { flex: 1; padding: 10px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; }
        .btn-save:hover { background: rgba(37,99,235,1); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .industry-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 3px 9px; border-radius: 99px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
      `}</style>

      <div className="pg-wrap">
        <div className="pg-header">
          <div>
            <h1 className="pg-title">Clientes</h1>
            <p className="pg-sub">{orgs.length} organizaciones registradas</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            Nuevo cliente
          </button>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="modal-box">
              <div className="modal-header">
                <h2 className="modal-title">Nuevo cliente</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input"
                    placeholder="Empresa S.A."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de contacto</label>
                  <input
                    value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="form-input"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email de contacto</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="form-input"
                    placeholder="cto@empresa.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Industria</label>
                  <select
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Seleccionar…</option>
                    {['Fintech', 'Salud', 'Retail', 'Gobierno', 'Educación', 'Manufactura', 'Tecnología', 'Otro'].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="form-footer">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-save">
                    {saving ? 'Guardando…' : 'Crear cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista */}
        {!orgs.length ? (
          <div className="list-panel">
            <div className="empty-box">
              <Building2 size={36} color="rgba(255,255,255,0.1)" />
              <p className="empty-text">No hay clientes registrados aún</p>
            </div>
          </div>
        ) : (
          <div className="list-panel">
            {orgs.map(org => (
              <div key={org.id} className="org-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="org-icon">
                    <Building2 size={17} color="#a78bfa" />
                  </div>
                  <div>
                    <p className="org-name">{org.name}</p>
                    <p className="org-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {org.contact_email && <span>{org.contact_email}</span>}
                      {org.contact_email && org.industry && <span>·</span>}
                      {org.industry && <span className="industry-tag"><Globe size={10} />{org.industry}</span>}
                      {!org.contact_email && !org.industry && <span>Sin datos de contacto</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
