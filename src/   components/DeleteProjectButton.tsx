'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Error al borrar el proyecto')
      }
    } catch {
      alert('Error de red')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true) }}
        title="Borrar proyecto"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          color: 'rgba(255,255,255,0.25)',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <Trash2 size={15} />
      </button>

      {showConfirm && (
        <div
          onClick={e => { e.preventDefault(); e.stopPropagation() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#1a1f2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '28px 32px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <div style={{ marginBottom: 12 }}>
              <Trash2 size={32} color="#f87171" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              ¿Borrar proyecto?
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.5 }}>
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{projectName}</strong> y todos sus hallazgos serán eliminados de forma permanente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '9px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.2)',
                  color: '#f87171',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Borrando…' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
