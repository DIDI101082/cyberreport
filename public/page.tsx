'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
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
      setError('No se pudo conectar con Microsoft. Usá email y contraseña.')
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoadingEmail(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoadingEmail(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center px-6 py-10 text-white"
      style={{
        backgroundColor: '#0A2A6E',
        backgroundImage:
          'radial-gradient(ellipse at top left, #123C96 0%, transparent 55%), linear-gradient(135deg, #0A2466 0%, #0B3A9E 55%, #1449C8 100%)',
      }}
    >
      <main
        className="w-full max-w-md rounded-2xl px-8 py-9"
        style={{
          border: '1px solid rgba(255,255,255,0.20)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.45)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-4">
          <img
            src="/accusys-logo.png"
            alt="Accusys Technology"
            className="h-9 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span
            className="h-9 w-px"
            style={{ background: 'rgba(255,255,255,0.35)' }}
            aria-hidden
          />
          <span style={{ fontWeight: 700, fontSize: '22px', lineHeight: 1, letterSpacing: '-0.02em' }}>
            CyberReport
          </span>
        </div>

        <h1 className="text-xl text-center mt-8" style={{ fontWeight: 700 }}>Bienvenido</h1>
        <p className="text-sm text-center mt-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
          Ingresá con tu cuenta de la empresa
        </p>

        {/* Botón Microsoft */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={loading || loadingEmail}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 transition"
            style={{
              background: '#fff',
              color: '#1F2937',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              opacity: loading || loadingEmail ? 0.7 : 1,
              cursor: loading || loadingEmail ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {loading ? 'Redirigiendo…' : 'Continuar con Microsoft'}
          </button>
        </div>

        {/* Divisor */}
        <div className="flex items-center gap-3 mt-6 mb-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
            o ingresá con email
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Formulario email */}
        <form onSubmit={handleLogin}>
          <div className="mb-3.5">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(255,255,255,0.70)' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="usuario@empresa.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition"
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: '#fff',
              }}
            />
          </div>
          <div className="mb-5">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(255,255,255,0.70)' }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition"
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: '#fff',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loadingEmail || loading}
            className="w-full rounded-xl py-3 text-sm font-medium text-white transition"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.22)',
              opacity: loadingEmail || loading ? 0.5 : 1,
              cursor: loadingEmail || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingEmail ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="text-sm rounded-lg px-3 py-2 mt-4 text-center"
            style={{
              color: '#fecaca',
              background: 'rgba(239,68,68,0.25)',
              border: '1px solid rgba(252,165,165,0.30)',
            }}
          >
            {error}
          </p>
        )}
      </main>

      <p className="text-xs mt-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
        © {new Date().getFullYear()} Accusys. Todos los derechos reservados.
      </p>
    </div>
  )
}
