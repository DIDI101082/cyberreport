'use client'

import { Shield, Key, Globe, CheckCircle, Lock, Server } from 'lucide-react'

export default function SettingsPage() {
  return (
    <>
      <style>{`
        .pg-wrap { padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; max-width: 700px; }
        .pg-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pg-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 28px; }
        .section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px 22px; margin-bottom: 14px; }
        .sec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .sec-icon { width: 32px; height: 32px; border-radius: 9px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sec-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }
        .sec-desc { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0 0 16px 42px; }
        .form-group { margin-bottom: 12px; }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .form-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; box-sizing: border-box; }
        .form-input:focus { border-color: rgba(59,130,246,0.5); }
        .form-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin: 5px 0 0; }
        .sec-check { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; margin-bottom: 8px; }
        .sec-check:last-child { margin-bottom: 0; }
        .sec-check-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.8); margin: 0 0 2px; }
        .sec-check-sub { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
        .badge-ok { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #4ade80; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); padding: 3px 10px; border-radius: 99px; }
      `}</style>

      <div className="pg-wrap">
        <h1 className="pg-title">Configuración</h1>
        <p className="pg-sub">Ajustes globales de la plataforma CyberReport</p>

        {/* API IA */}
        <div className="section">
          <div className="sec-header">
            <div className="sec-icon"><Key size={15} color="#60a5fa" /></div>
            <span className="sec-title">API de Inteligencia Artificial</span>
          </div>
          <p className="sec-desc">Configurá tu clave de Anthropic para usar la generación con IA.</p>
          <div className="form-group">
            <label className="form-label">Clave de API Anthropic</label>
            <input
              type="password"
              defaultValue="sk-ant-api..."
              readOnly
              className="form-input"
              style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}
            />
            <p className="form-hint">Configurada en las variables de entorno del servidor (<code style={{ color: '#93c5fd' }}>ANTHROPIC_API_KEY</code>)</p>
          </div>
          <div className="form-group">
            <label className="form-label">Modelo</label>
            <select className="form-input">
              <option value="claude-opus-4-5">claude-opus-4-5 (Recomendado)</option>
              <option value="claude-sonnet-4-5">claude-sonnet-4-5 (Más rápido)</option>
            </select>
          </div>
        </div>

        {/* Empresa */}
        <div className="section">
          <div className="sec-header">
            <div className="sec-icon"><Globe size={15} color="#60a5fa" /></div>
            <span className="sec-title">Configuración de la empresa</span>
          </div>
          <p className="sec-desc">Datos que aparecerán en los reportes y documentos generados.</p>
          <div className="form-group">
            <label className="form-label">Nombre de la empresa</label>
            <input defaultValue="Accusys Technology" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Sitio web</label>
            <input defaultValue="https://accusys.com.ar" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Email de contacto</label>
            <input defaultValue="info@accusys.com.ar" className="form-input" />
          </div>
        </div>

        {/* Seguridad */}
        <div className="section">
          <div className="sec-header">
            <div className="sec-icon"><Shield size={15} color="#60a5fa" /></div>
            <span className="sec-title">Seguridad de la plataforma</span>
          </div>
          <p className="sec-desc">Estado de las configuraciones de seguridad activas.</p>

          {[
            { icon: Lock, name: 'Autenticación de dos factores', sub: 'Requerida para todos los usuarios' },
            { icon: Server, name: 'Row Level Security (Supabase)', sub: 'Aislamiento de datos por tenant' },
            { icon: Shield, name: 'Cifrado en tránsito', sub: 'HTTPS/TLS en toda la plataforma' },
            { icon: CheckCircle, name: 'Multi-tenancy', sub: 'Cada empresa ve sólo sus datos' },
          ].map(({ icon: Icon, name, sub }) => (
            <div key={name} className="sec-check">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={14} color="rgba(255,255,255,0.3)" />
                <div>
                  <p className="sec-check-name">{name}</p>
                  <p className="sec-check-sub">{sub}</p>
                </div>
              </div>
              <span className="badge-ok"><CheckCircle size={10} />Activo</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
