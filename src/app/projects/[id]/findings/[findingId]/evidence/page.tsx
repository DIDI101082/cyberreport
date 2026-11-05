'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Trash2, Download, Image, FileText,
  File, Film, Archive, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'

interface EvidenceFile {
  name:       string
  size:       number
  mimetype:   string
  created_at: string
  path:       string
  url:        string | null
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/'))      return <Image    size={16} />
  if (mime.startsWith('video/'))      return <Film     size={16} />
  if (mime === 'application/pdf')     return <FileText size={16} />
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip'))
                                      return <Archive  size={16} />
  if (mime.startsWith('text/'))       return <FileText size={16} />
  return                                     <File     size={16} />
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'text/plain', 'text/html',
  'application/zip', 'application/x-zip-compressed',
  'video/mp4', 'video/webm',
]
const MAX_SIZE_MB = 20

export default function EvidencePage() {
  const params = useParams<{ id: string; findingId: string }>()

  const [files,     setFiles]     = useState<EvidenceFile[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const apiBase = `/api/projects/${params.id}/findings/${params.findingId}/evidence`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(apiBase)
      const json = await res.json()
      if (!res.ok) setError(json.error ?? 'Error al cargar archivos')
      else         setFiles(json.files ?? [])
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { load() }, [load])

  async function uploadFile(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Tipo no permitido: ${file.type || 'desconocido'}`)
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo excede el límite de ${MAX_SIZE_MB} MB`)
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch(apiBase, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al subir el archivo')
      } else {
        setSuccess(`"${file.name}" subido correctamente`)
        setTimeout(() => setSuccess(null), 3000)
        await load()
      }
    } catch {
      setError('Error de red al subir')
    } finally {
      setUploading(false)
    }
  }

  async function deleteFile(path: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    setDeleting(path)
    try {
      const res = await fetch(`${apiBase}?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Error al eliminar')
      } else {
        setFiles(f => f.filter(x => x.path !== path))
      }
    } catch {
      setError('Error de red al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    dropped.forEach(uploadFile)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    selected.forEach(uploadFile)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <style>{`
        .ev { padding: 24px 28px; max-width: 760px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; margin-bottom: 18px; transition: color .12s; }
        .back:hover { color: rgba(255,255,255,.8); }
        .ev-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
        .ev-sub { font-size: 12.5px; color: rgba(255,255,255,.35); margin: 0 0 24px; }

        /* Drop zone */
        .drop-zone { border: 2px dashed rgba(255,255,255,.12); border-radius: 14px; padding: 36px 24px; text-align: center; cursor: pointer; transition: all .15s; background: rgba(255,255,255,.02); margin-bottom: 24px; }
        .drop-zone.active { border-color: rgba(96,165,250,.5); background: rgba(96,165,250,.06); }
        .drop-zone:hover { border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.04); }
        .drop-icon { display: flex; justify-content: center; margin-bottom: 10px; color: rgba(255,255,255,.25); }
        .drop-text { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.55); margin: 0 0 4px; }
        .drop-hint { font-size: 12px; color: rgba(255,255,255,.25); margin: 0; }
        .drop-btn { display: inline-flex; align-items: center; gap: 7px; margin-top: 14px; padding: 9px 18px; border-radius: 9px; background: rgba(37,99,235,.8); border: 1px solid rgba(59,130,246,.35); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .12s; font-family: inherit; }
        .drop-btn:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .drop-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* Banners */
        .banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
        .banner.err  { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.25); color: #f87171; }
        .banner.ok   { background: rgba(74,222,128,.1);  border: 1px solid rgba(74,222,128,.25);  color: #4ade80; }
        .banner.info { background: rgba(96,165,250,.1);  border: 1px solid rgba(96,165,250,.25);  color: #93c5fd; }

        /* Files list */
        .files-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
        .files-hdr { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,.07); display: flex; align-items: center; justify-content: space-between; }
        .files-hdr-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.3); }
        .file-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,.05); transition: background .1s; }
        .file-row:last-child { border-bottom: none; }
        .file-row:hover { background: rgba(255,255,255,.025); }
        .file-icon-wrap { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.07); color: rgba(255,255,255,.5); flex-shrink: 0; }
        .file-info { flex: 1; min-width: 0; }
        .file-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 2px; }
        .file-meta { font-size: 11px; color: rgba(255,255,255,.3); margin: 0; }
        .file-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .file-btn { width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: all .12s; }
        .file-btn.dl { background: rgba(96,165,250,.1); color: #93c5fd; text-decoration: none; }
        .file-btn.dl:hover { background: rgba(96,165,250,.2); }
        .file-btn.rm { background: rgba(248,113,113,.1); color: #f87171; }
        .file-btn.rm:hover { background: rgba(248,113,113,.2); }
        .file-btn:disabled { opacity: .4; cursor: not-allowed; }

        .empty-state { padding: 40px; text-align: center; color: rgba(255,255,255,.25); font-size: 13px; }
        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Upload instruction card */
        .setup-card { background: rgba(251,191,36,.07); border: 1px solid rgba(251,191,36,.2); border-radius: 12px; padding: 16px 18px; margin-bottom: 20px; font-size: 13px; color: rgba(255,255,255,.65); line-height: 1.6; }
        .setup-card strong { color: #fbbf24; }
        .setup-code { background: rgba(0,0,0,.4); border-radius: 6px; padding: 2px 7px; font-family: 'SF Mono','Fira Code',monospace; font-size: 12px; color: #fbbf24; }
      `}</style>

      <div className="ev">
        <Link href={`/projects/${params.id}/findings`} className="back">
          <ArrowLeft size={14} /> Volver a hallazgos
        </Link>

        <h1 className="ev-title">Evidencias</h1>
        <p className="ev-sub">Archivos adjuntos al hallazgo — screenshots, logs, exploits</p>

        {/* Supabase setup reminder */}
        <div className="setup-card">
          <strong>⚠ Requisito:</strong> Para que el upload funcione, creá el bucket{' '}
          <span className="setup-code">evidence</span> en tu Supabase Dashboard →{' '}
          Storage → New bucket → nombre: <span className="setup-code">evidence</span> → privado (sin acceso público).
        </div>

        {/* Banners */}
        {error   && <div className="banner err"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="banner ok"><CheckCircle2 size={15} /> {success}</div>}
        {uploading && <div className="banner info"><Loader2 size={15} className="spin" /> Subiendo archivo…</div>}

        {/* Drop zone */}
        <div
          className={`drop-zone${dragging ? ' active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <div className="drop-icon">
            <Upload size={28} />
          </div>
          <p className="drop-text">Arrastrá y soltá archivos aquí</p>
          <p className="drop-hint">PNG · JPG · GIF · PDF · TXT · ZIP · MP4 — máx. {MAX_SIZE_MB} MB por archivo</p>
          <button
            type="button"
            className="drop-btn"
            disabled={uploading}
            onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          >
            {uploading
              ? <><Loader2 size={14} className="spin" /> Subiendo…</>
              : <><Upload size={14} /> Elegir archivo</>
            }
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>

        {/* Files list */}
        <div className="files-panel">
          <div className="files-hdr">
            <span className="files-hdr-label">
              {loading ? 'Cargando…' : `${files.length} archivo${files.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando archivos…</div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              No hay evidencias adjuntas. Subí el primer archivo arriba.
            </div>
          ) : (
            files.map(f => (
              <div key={f.path} className="file-row">
                <div className="file-icon-wrap">
                  {fileIcon(f.mimetype)}
                </div>
                <div className="file-info">
                  <p className="file-name">{f.name}</p>
                  <p className="file-meta">
                    {formatSize(f.size)}
                    {f.created_at && ` · ${new Date(f.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}`}
                  </p>
                </div>
                <div className="file-actions">
                  {f.url && (
                    <a
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-btn dl"
                      title="Descargar"
                    >
                      <Download size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    className="file-btn rm"
                    title="Eliminar"
                    disabled={deleting === f.path}
                    onClick={() => deleteFile(f.path, f.name)}
                  >
                    {deleting === f.path
                      ? <Loader2 size={14} className="spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
