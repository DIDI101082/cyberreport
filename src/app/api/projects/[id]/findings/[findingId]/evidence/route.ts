import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'evidence'

type Params = { id: string; findingId: string }

// GET /api/projects/[id]/findings/[findingId]/evidence — list files
export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    const folder = `${profile?.tenant_id ?? user.id}/${params.id}/${params.findingId}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      // bucket not found or empty — return empty list gracefully
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return NextResponse.json({ files: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build public (signed) URLs for each file
    const files = await Promise.all(
      (data ?? [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(async (f) => {
          const path = `${folder}/${f.name}`
          const { data: urlData } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60) // 1 hour expiry
          return {
            name:       f.name,
            size:       f.metadata?.size ?? 0,
            mimetype:   f.metadata?.mimetype ?? 'application/octet-stream',
            created_at: f.created_at,
            path,
            url:        urlData?.signedUrl ?? null,
          }
        })
    )

    return NextResponse.json({ files })
  } catch (err) {
    console.error('GET evidence error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/projects/[id]/findings/[findingId]/evidence — upload file
export async function POST(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se adjuntó ningún archivo' }, { status: 400 })
    }

    // Sanitize filename: remove special chars, keep extension
    const sanitized = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')

    const folder = `${profile?.tenant_id ?? user.id}/${params.id}/${params.findingId}`
    const path   = `${folder}/${Date.now()}_${sanitized}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType:  file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert:       false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60)

    return NextResponse.json({
      file: {
        name:    sanitized,
        size:    file.size,
        mimetype: file.type,
        path,
        url:     urlData?.signedUrl ?? null,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST evidence error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/findings/[findingId]/evidence?path=...
export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'path es requerido' }, { status: 400 })
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE evidence error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
