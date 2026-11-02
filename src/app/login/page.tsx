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
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-600"
      style={{ background: 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)' }}>

      <div className="w-full max-w-sm px-4">
        <div className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.13)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(12px)',
          }}>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold mb-5">
              <span className="text-white">//accusys</span>
              <span className="text-white opacity-40 mx-2">|</span>
              <span style={{ color: '#93c5fd' }}>CyberReport</span>
            </div>
            <p className="text-white font-semibold text-lg">Bienvenido</p>
            <p className="text-white/70 text-sm mt-1">Ingresá con tu cuenta de la empresa</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="usuario@empresa.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              />
            </div>

            {error && (
              <p className="text-red-300 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 mt-2"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#1d4ed8' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 Accusys. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
