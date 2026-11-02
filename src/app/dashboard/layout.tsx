import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(160deg, #0f1e3d 0%, #0a1020 60%, #0d1628 100%)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
