import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { userId: string }

// PATCH /api/settings/users/[userId] — update role or status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role, tenant_id').eq('id', user.id).single()
    if (!['super_admin', 'admin'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Verify target user is in same tenant (unless super_admin)
    const { data: target } = await supabase
      .from('profiles').select('tenant_id, role').eq('id', params.userId).single()
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (profile?.role !== 'super_admin' && target.tenant_id !== profile?.tenant_id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    if (body.role !== undefined) updates.role = body.role
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.full_name !== undefined) updates.full_name = body.full_name

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', params.userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  } catch (err) {
    console.error('PATCH user error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
