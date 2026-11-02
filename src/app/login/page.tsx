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
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 40%, #1d4ed8 70%, #2563eb 100%)',
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-white font-bold text-2xl tracking-tight" style={{ fontFamily: 'helvetica, arial, sans-serif' }}>
            <span style={{ opacity: 0.9 }}>&#47;&#47;accusys</span>
          </span>
          <span className="text-white/40 text-2xl font-thin">|</span>
          <span className="text-white font-bold text-2xl" style={{ color: '#60a5fa' }}>CyberReport</span>
        </div>

        <p className="text-center text-white font-semibold text-lg mb-1">Bienvenido</p>
        <p className="text-center text-white/70 text-sm mb-6">Ingresá con tu cuenta de la empresa</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white' }}
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1d4ed8' }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-white/40 text-xs">
        © 2026 Accusys. Todos los derechos reservados.
      </p>
    </div>
  )
}
