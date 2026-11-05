import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/[id]/scope — list all scope entries for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('project_scope')
      .select('*')
      .eq('project_id', params.id)
      .order('type')
      .order('value')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scope: data ?? [] })
  } catch (err) {
    console.error('GET scope error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/projects/[id]/scope — add a new scope entry
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await req.json()
    const { type, value, notes, in_scope } = body

    if (!type || !value?.trim()) {
      return NextResponse.json({ error: 'type y value son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_scope')
      .insert({
        tenant_id:  profile?.tenant_id ?? null,
        project_id: params.id,
        type:       type,
        value:      value.trim(),
        notes:      notes?.trim() || null,
        in_scope:   in_scope ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('POST scope error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('POST scope error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/scope?itemId=xxx — delete a scope entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    if (!itemId) {
      return NextResponse.json({ error: 'itemId es requerido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('project_scope')
      .delete()
      .eq('id', itemId)
      .eq('project_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE scope error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/scope — toggle in_scope flag
export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, in_scope } = body
    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_scope')
      .update({ in_scope, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH scope error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
