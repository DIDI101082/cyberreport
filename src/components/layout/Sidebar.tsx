'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, Building2,
  FileText, Settings, LogOut, Code2, CreditCard, ChevronRight, Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('role').maybeSingle()
      .then(({ data }) => setRole(data?.role ?? null))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <style>{`
        .sidebar {
          width: 220px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: rgba(8, 15, 32, 0.95);
          border-right: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          flex-shrink: 0;
        }
        .sidebar-logo {
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .sidebar-logo-text {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.3px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .logo-accusys { color: #ffffff; }
        .logo-sep { color: rgba(255,255,255,0.25); margin: 0 7px; font-weight: 300; }
        .logo-product { color: #60a5fa; }
        .sidebar-section {
          padding: 14px 12px 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
        }
        .sidebar-nav {
          flex: 1;
          padding: 0 10px 12px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 450;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }
        .sidebar-link:hover {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.06);
        }
        .sidebar-link.active {
          color: #ffffff;
          background: rgba(37,99,235,0.3);
          border: 1px solid rgba(59,130,246,0.25);
        }
        .sidebar-link.active .nav-icon { color: #60a5fa; }
        .nav-icon { width: 15px; height: 15px; flex-shrink: 0; }
        .sidebar-link-label { flex: 1; }
        .sidebar-link-arrow { width: 12px; height: 12px; color: rgba(255,255,255,0.2); }
        .sidebar-bottom {
          padding: 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: all 0.15s ease;
          font-family: inherit;
          margin-bottom: 2px;
          text-decoration: none;
        }
        .sidebar-btn:hover {
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.05);
        }
        .sidebar-btn.active {
          color: #ffffff;
          background: rgba(37,99,235,0.3);
          border: 1px solid rgba(59,130,246,0.25);
        }
      `}</style>

      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">
            <span className="logo-accusys">//accusys</span>
            <span className="logo-sep">|</span>
            <span className="logo-product">CyberReport</span>
          </span>
        </div>

        {/* Nav principal */}
        <div className="sidebar-section">Plataforma</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} className={`sidebar-link${active ? ' active' : ''}`}>
                <Icon className="nav-icon" />
                <span className="sidebar-link-label">{label}</span>
                {active && <ChevronRight className="sidebar-link-arrow" />}
              </Link>
            )
          })}

          {/* Admin section — solo super_admin */}
          {role === 'super_admin' && (
            <>
              <div className="sidebar-section" style={{ paddingLeft: 0, marginTop: 8 }}>Admin</div>
              <Link href="/admin" className={`sidebar-link${isActive('/admin') ? ' active' : ''}`}
                style={isActive('/admin') ? {} : { color: 'rgba(192,132,252,.7)' }}>
                <Shield className="nav-icon" style={{ color: isActive('/admin') ? '#c084fc' : undefined }} />
                <span className="sidebar-link-label">Super Admin</span>
                {isActive('/admin') && <ChevronRight className="sidebar-link-arrow" />}
              </Link>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} className={`sidebar-btn${active ? ' active' : ''}`}>
                <Icon className="nav-icon" style={{ width: 15, height: 15, flexShrink: 0 }} />
                {label}
              </Link>
            )
          })}
          <button onClick={handleLogout} className="sidebar-btn">
            <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
