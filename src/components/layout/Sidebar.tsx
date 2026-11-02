'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, LayoutDashboard, FolderOpen, Building2,
  FileText, Settings, LogOut, Code2, CreditCard, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects',      icon: FolderOpen,      label: 'Proyectos' },
  { href: '/organizations', icon: Building2,       label: 'Clientes' },
  { href: '/reports',       icon: FileText,        label: 'Reportes' },
  { href: '/code-analysis', icon: Code2,           label: 'Análisis de Código' },
]

const BOTTOM_NAV = [
  { href: '/billing',  icon: CreditCard, label: 'Planes' },
  { href: '/settings', icon: Settings,   label: 'Configuración' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-60 bg-[#0d0d0f] min-h-screen flex flex-col border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold tracking-tight">CyberReport</p>
            <p className="text-white/30 text-[11px]">by Accusys</p>
          </div>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 pt-1 pb-4 space-y-0.5">
        <p className="text-white/20 text-[10px] font-semibold uppercase tracking-widest px-2 pb-2">Plataforma</p>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-white/20" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-3 border-t border-white/[0.06] pt-3 space-y-0.5">
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
