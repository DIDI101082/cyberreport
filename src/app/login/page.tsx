'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        .login-bg {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #1a3a8f;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          margin: 0 16px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.20);
          border-radius: 18px;
          padding: 44px 40px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.30);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .login-logo {
          text-align: center;
          margin-bottom: 24px;
        }
        .login-logo-text {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .login-logo-accusys { color: #ffffff; }
        .login-logo-sep { color: rgba(255,255,255,0.35); margin: 0 10px; font-weight: 300; }
        .login-logo-product { color: #ffffff; font-weight: 800; }
        .login-title {
          color: #fff;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          margin: 0 0 6px;
        }
        .login-subtitle {
          color: rgba(255,255,255,0.60);
          font-size: 14px;
          text-align: center;
          margin: 0 0 32px;
        }
        .login-label {
          display: block;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: #fff;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.35); }
        .login-input:focus { border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.18); }
        .login-label {
          display: block;
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 7px;
        }
        .login-field { margin-bottom: 18px; }
        .login-btn {
          width: 100%;
          background: #ffffff;
          color: #1d4ed8;
          border: none;
          border-radius: 10px;
          padding: 13px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 10px;
          transition: opacity 0.2s, transform 0.1s;
          font-family: inherit;
          letter-spacing: -0.1px;
        }
        .login-btn:hover { opacity: 0.93; transform: translateY(-1px); }
        .login-btn:active { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .login-error {
          color: #fca5a5;
          font-size: 13px;
          text-align: center;
          margin-bottom: 10px;
          background: rgba(239,68,68,0.1);
          border-radius: 8px;
          padding: 8px;
        }
        .login-footer {
          color: rgba(255,255,255,0.32);
          font-size: 12px;
          text-align: center;
          margin-top: 28px;
        }
      `}</style>

      <div className="login-bg">
        <div className="login-card">
          <div className="login-logo">
            <span className="login-logo-text">
              <span className="login-logo-accusys">//accusys</span>
              <span className="login-logo-sep">|</span>
              <span className="login-logo-product">CyberReport</span>
            </span>
          </div>

          <p className="login-title">Bienvenido</p>
          <p className="login-subtitle">Ingresá con tu cuenta de la empresa</p>

          <form onSubmit={handleLogin}>
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

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="login-footer">© 2026 Accusys. Todos los derechos reservados.</p>
      </div>
    </>
  )
}
