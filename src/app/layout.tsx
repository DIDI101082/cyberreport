import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CyberReport — Accusys',
  description: 'Plataforma de reportes de hacking ético con IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
