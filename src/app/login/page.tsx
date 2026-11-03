'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
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
      // Si no está configurado Azure, mostrar fallback email/password
      setShowFallback(true)
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .login-bg {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #1d4ed8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          margin: 0 16px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 20px;
          padding: 40px 36px 36px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.2);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .login-logo {
          text-align: center;
          margin-bottom: 28px;
        }
        .login-logo-text {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }
        .logo-k {
          font-style: italic;
          font-weight: 900;
          color: #fff;
          font-size: 26px;
          margin-right: 1px;
        }
        .logo-accusys { color: #fff; font-weight: 700; }
        .logo-sep { color: rgba(255,255,255,0.4); margin: 0 12px; font-weight: 300; font-size: 24px; }
        .logo-product { color: #60a5fa; font-weight: 800; }
        .login-title {
          color: #fff;
          font-size: 19px;
          font-weight: 700;
          text-align: center;
          margin: 0 0 6px;
        }
        .login-subtitle {
          color: rgba(255,255,255,0.55);
          font-size: 13.5px;
          text-align: center;
          margin: 0 0 28px;
        }
        .btn-microsoft {
          width: 100%;
          background: #ffffff;
          color: #1e293b;
          border: none;
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-family: inherit;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: -0.1px;
        }
        .btn-microsoft:hover { opacity: 0.93; transform: translateY(-1px); }
        .btn-microsoft:active { transform: translateY(0); }
        .btn-microsoft:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .ms-logo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .ms-sq { width: 8px; height: 8px; }
        .login-hint {
          color: rgba(255,255,255,0.45);
          font-size: 12.5px;
          text-align: center;
          margin: 14px 0 0;
        }
        .login-hint strong { color: rgba(255,255,255,0.75); font-weight: 600; }
        .login-error {
          color: #fca5a5;
          font-size: 12.5px;
          text-align: center;
          margin: 10px 0 0;
          background: rgba(239,68,68,0.1);
          border-radius: 8px;
          padding: 8px;
        }
        /* Fallback email/pass */
        .fallback-sep {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0 16px;
        }
        .fallback-sep-line { flex: 1; height: 1px; background: rgba(255,255,255,0.12); }
        .fallback-sep-text { font-size: 11px; color: rgba(255,255,255,0.3); white-space: nowrap; }
        .login-label {
          display: block;
          color: rgba(255,255,255,0.7);
          font-size: 12.5px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 9px;
          padding: 10px 14px;
          font-size: 13.5px;
          color: #fff;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus { border-color: rgba(255,255,255,0.45); }
        .login-field { margin-bottom: 14px; }
        .btn-email {
          width: 100%;
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 9px;
          padding: 11px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
          margin-top: 4px;
        }
        .btn-email:hover { background: rgba(255,255,255,0.2); }
        .btn-email:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-footer {
          color: rgba(255,255,255,0.28);
          font-size: 12px;
          text-align: center;
          margin-top: 28px;
        }
      `}</style>

      <div className="login-bg">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-text">
              <span className="logo-k">k</span>
              <span className="logo-accusys">accusys</span>
              <span className="logo-sep">|</span>
              <span className="logo-product">CyberReport</span>
            </div>
          </div>

          <p className="login-title">Bienvenido</p>
          <p className="login-subtitle">Ingresá con tu cuenta de la empresa</p>

          <button
            className="btn-microsoft"
            onClick={handleMicrosoft}
            disabled={loading}
          >
            <div className="ms-logo">
              <div className="ms-sq" style={{ background: '#f25022' }} />
              <div className="ms-sq" style={{ background: '#7fba00' }} />
              <div className="ms-sq" style={{ background: '#00a4ef' }} />
              <div className="ms-sq" style={{ background: '#ffb900' }} />
            </div>
            {loading ? 'Redirigiendo…' : 'Continuar con Microsoft'}
          </button>

          <p className="login-hint">
            Usá tus credenciales de <strong>Microsoft 365</strong> para acceder
          </p>

          {/* Fallback email/password si Azure no está configurado */}
          {showFallback && (
            <form onSubmit={handleLogin}>
              <div className="fallback-sep">
                <div className="fallback-sep-line" />
                <span className="fallback-sep-text">o ingresá con email</span>
                <div className="fallback-sep-line" />
              </div>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="login-field">
                <label className="login-label">Contraseña</label>
                <input
                  type="password"
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-email" disabled={loading}>
                {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {error && <p className="login-error">{error}</p>}
        </div>

        <p className="login-footer">© 2026 Accusys. Todos los derechos reservados.</p>
      </div>
    </>
  )
}
