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
    <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center px-6 py-10 text-white bg-[#0A2A6E] bg-[radial-gradient(ellipse_at_top_left,#123C96_0%,transparent_55%),linear-gradient(135deg,#0A2466_0%,#0B3A9E_55%,#1449C8_100%)]">
      <main className="w-full max-w-md rounded-2xl border border-white/20 bg-white/[0.08] backdrop-blur-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] px-8 py-9">

        {/* Logo */}
        <div className="flex items-center justify-center gap-4">
          <img
            src="/accusys-logo.png"
            alt="Accusys Technology"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
          <span className="h-9 w-px bg-white/35" aria-hidden />
          <span className="font-bold text-[22px] leading-none tracking-tight">CyberReport</span>
        </div>

        <h1 className="font-bold text-xl text-center mt-8">Bienvenido</h1>
        <p className="text-sm text-white/70 text-center mt-1.5">Ingresá con tu cuenta de la empresa</p>

        {/* Botón Microsoft */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-[#1F2937] font-medium py-3.5 shadow-lg shadow-black/10 hover:bg-white/95 disabled:opacity-70 transition"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {loading ? 'Redirigiendo…' : 'Continuar con Microsoft'}
          </button>
          <p className="text-xs text-white/60 text-center mt-4">
            Usá tus credenciales de <b className="text-white/85">Microsoft 365</b> para acceder
          </p>
        </div>

        {/* Fallback email/password si Azure no está configurado */}
        {showFallback && (
          <form onSubmit={handleLogin} className="mt-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/12" />
              <span className="text-xs text-white/30">o ingresá con email</span>
              <div className="flex-1 h-px bg-white/12" />
            </div>
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="usuario@empresa.com"
                className="w-full rounded-lg border border-white/18 bg-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/45 transition"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-white/70 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/18 bg-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/45 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white/15 border border-white/20 text-white font-medium py-3 text-sm hover:bg-white/20 disabled:opacity-50 transition"
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-100 bg-red-500/25 border border-red-300/30 rounded-lg px-3 py-2 mt-4 text-center">
            {error}
          </p>
        )}
      </main>

      <p className="text-xs text-white/50 mt-6">© {new Date().getFullYear()} Accusys. Todos los derechos reservados.</p>
    </div>
  )
}
