'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    organization_id: '',
    type: 'web' as 'web' | 'infrastructure' | 'both',
    scope: '',
    start_date: '',
    end_date: '',
    target_frameworks: [] as string[],
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tenant_id').eq('id', user.id).single().then(({ data: profile }) => {
        if (!profile?.tenant_id) return
        supabase
          .from('organizations')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('name')
          .then(({ data }) => { if (data) setOrgs(data) })
      })
    })
  }, [])

  const FRAMEWORKS = ['ISO 27001', 'PCI-DSS v4.0', 'NIST CSF 2.0']

  function toggleFramework(fw: string) {
    setForm(f => ({
      ...f,
      target_frameworks: f.target_frameworks.includes(fw)
        ? f.target_frameworks.filter(x => x !== fw)
        : [...f.target_frameworks, fw],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Fetch tenant_id before insert
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      : { data: null }

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...form, status: 'in_progress', tenant_id: profile?.tenant_id ?? null })
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/projects/${data.id}`)
    } else {
      alert('Error al crear el proyecto: ' + error?.message)
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .np-wrap { padding: 24px 28px; max-width: 600px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .np-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 20px; transition: color 0.12s; }
        .np-back:hover { color: rgba(255,255,255,0.8); }
        .np-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 22px; }
        .np-field { margin-bottom: 16px; }
        .np-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
        .np-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.12s; }
        .np-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(255,255,255,0.08); }
        .np-input option { background: #131f35; }
        .np-textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; resize: none; transition: border-color 0.12s; }
        .np-textarea:focus { border-color: rgba(59,130,246,0.5); }
        .np-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .type-btns { display: flex; gap: 8px; }
        .type-btn { flex: 1; padding: 9px 8px; border-radius: 9px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .type-btn.active { background: rgba(37,99,235,0.3); border-color: rgba(59,130,246,0.5); color: #93c5fd; }
        .type-btn:not(.active):hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }
        .fw-btn { flex: 1; padding: 8px; border-radius: 9px; font-size: 11px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .fw-btn.active { background: rgba(124,58,237,0.25); border-color: rgba(167,139,250,0.4); color: #c084fc; }
        .fw-btn:not(.active):hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75); }
        .np-footer { display: flex; gap: 10px; margin-top: 20px; }
        .btn-cancel { flex: 1; padding: 11px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; font-family: inherit; cursor: pointer; transition: all 0.12s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .btn-submit { flex: 1; padding: 11px; border-radius: 9px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .btn-submit:hover { background: rgba(37,99,235,1); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="np-wrap">
        <Link href="/projects" className="np-back">
          <ArrowLeft size={14} /> Volver a proyectos
        </Link>
        <h1 className="np-title">Nuevo proyecto</h1>

        <form onSubmit={handleSubmit}>
          <div className="np-field">
            <label className="np-label">Nombre del proyecto *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Pentest Web — Empresa ABC Q1 2025"
              className="np-input"
            />
          </div>

          <div className="np-field">
            <label className="np-label">Cliente *</label>
            <select
              required
              value={form.organization_id}
              onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
              className="np-input"
            >
              <option value="">Seleccionar cliente…</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="np-field">
            <label className="np-label">Tipo de auditoría *</label>
            <div className="type-btns">
              {[
                { value: 'web', label: 'Web (OWASP)' },
                { value: 'infrastructure', label: 'Infraestructura' },
                { value: 'both', label: 'Ambas' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: opt.value as typeof f.type }))}
                  className={`type-btn${form.type === opt.value ? ' active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="np-field">
            <label className="np-label">Alcance / Descripción</label>
            <textarea
              value={form.scope}
              onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
              rows={3}
              placeholder="Dominio, IPs, aplicaciones en alcance…"
              className="np-textarea"
            />
          </div>

          <div className="np-row">
            <div className="np-field">
              <label className="np-label">Fecha inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="np-input"
              />
            </div>
            <div className="np-field">
              <label className="np-label">Fecha fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="np-input"
              />
            </div>
          </div>

          <div className="np-field">
            <label className="np-label">Marcos normativos</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => toggleFramework(fw)}
                  className={`fw-btn${form.target_frameworks.includes(fw) ? ' active' : ''}`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          <div className="np-footer">
            <Link href="/projects" className="btn-cancel">Cancelar</Link>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Creando…' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
