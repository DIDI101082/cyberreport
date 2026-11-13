'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleMicrosoft() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError('No se pudo conectar con Microsoft. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .cr-login-wrap {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          color: #fff;
          background-color: #0A2A6E;
          background-image:
            radial-gradient(ellipse at top left, #123C96 0%, transparent 55%),
            linear-gradient(135deg, #0A2466 0%, #0B3A9E 55%, #1449C8 100%);
        }
        .cr-card {
          width: 100%;
          max-width: 448px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 20px 60px -15px rgba(0,0,0,0.45);
          padding: 36px 32px;
        }
        .cr-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .cr-logo-img {
          height: 36px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .cr-logo-sep {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.35);
        }
        .cr-logo-name {
          font-weight: 700;
          font-size: 22px;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .cr-title {
          font-weight: 700;
          font-size: 20px;
          text-align: center;
          margin-top: 32px;
        }
        .cr-subtitle {
          font-size: 14px;
          text-align: center;
          color: rgba(255,255,255,0.70);
          margin-top: 6px;
        }
        .cr-ms-btn {
          margin-top: 28px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 12px;
          background: #fff;
          color: #1F2937;
          font-weight: 500;
          font-size: 15px;
          padding: 14px;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .cr-ms-btn:hover { opacity: 0.92; }
        .cr-ms-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .cr-error {
          font-size: 13px;
          color: #fecaca;
          background: rgba(239,68,68,0.25);
          border: 1px solid rgba(252,165,165,0.30);
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 16px;
          text-align: center;
        }
        .cr-footer {
          font-size: 12px;
          color: rgba(255,255,255,0.50);
          margin-top: 24px;
        }
      `}</style>

      <div className="cr-login-wrap">
        <main className="cr-card">
          {/* Logo */}
          <div className="cr-logo-row">
            <img src="/accusys-logo.png" alt="Accusys Technology" className="cr-logo-img" />
            <span className="cr-logo-sep" aria-hidden />
            <span className="cr-logo-name">CyberReport</span>
          </div>

          <h1 className="cr-title">Bienvenido</h1>
          <p className="cr-subtitle">Ingresá con tu cuenta de la empresa</p>

          {/* Microsoft */}
          <button type="button" onClick={handleMicrosoft} disabled={loading} className="cr-ms-btn">
            <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {loading ? 'Redirigiendo…' : 'Continuar con Microsoft'}
          </button>

          {error && <p role="alert" className="cr-error">{error}</p>}
        </main>

        <p className="cr-footer">© {new Date().getFullYear()} Accusys. Todos los derechos reservados.</p>
      </div>
    </>
  )
}
