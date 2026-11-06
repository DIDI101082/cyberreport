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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    return profile?.tenant_id ?? null
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
