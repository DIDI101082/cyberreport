import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CyberReport · Portal Cliente',
  description: 'Acceso seguro al informe de pentesting',
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: 'linear-gradient(160deg,#0f1e3d 0%,#0a1020 60%,#0d1628 100%)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
